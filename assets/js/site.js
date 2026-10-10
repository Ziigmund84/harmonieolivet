/* ==========================================================
   Harmonie d'Olivet — script du site
   ========================================================== */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const G = window.GLYPHS || {};
  const D = window.HO_DEFAULTS;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!window.gsap;
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paras = s => String(s || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const glyphSvg = (name, cls = '') => {
    const g = G[name]; if (!g) return '';
    const [x, y, w, h] = g.bb;
    return `<svg class="${cls}" viewBox="${x - 10} ${y - 10} ${w + 20} ${h + 20}" aria-hidden="true"><path d="${g.d}"/></svg>`;
  };
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  /* ---------------- Données ---------------- */
  let sb = null;
  try {
    if (window.supabase && window.HO_CONFIG) sb = window.supabase.createClient(HO_CONFIG.supabaseUrl, HO_CONFIG.supabaseKey, { auth: { persistSession: false } });
  } catch (e) { console.warn('Supabase indisponible', e); }

  async function loadData() {
    const data = { settings: structuredClone(D), events: [], posts: [], media: [] };
    if (!sb) return data;
    try {
      const [s, e, p, m] = await Promise.all([
        sb.from('settings').select('key,value'),
        sb.from('events').select('*').eq('published', true).order('starts_at'),
        sb.from('posts').select('*').eq('published', true).order('published_at', { ascending: false }),
        sb.from('media').select('id,kind,title,year,image_url,sort,album,album_title,album_date,width,height').eq('published', true).order('sort').limit(5000)
      ]);
      (s.data || []).forEach(r => { data.settings[r.key] = Object.assign({}, D[r.key] || {}, r.value || {}); });
      data.events = e.data || [];
      data.posts = p.data || [];
      data.media = m.data || [];
    } catch (err) { console.warn('Chargement partiel', err); }
    return data;
  }

  /* ---------------- Rendu ---------------- */
  function bindTexts(S) {
    $$('[data-k]').forEach(el => {
      const v = get(S, el.dataset.k);
      if (v == null || v === '') { if (el.dataset.rich !== undefined || el.tagName === 'P') el.hidden = !el.textContent.trim(); return; }
      if (el.dataset.rich !== undefined) el.innerHTML = paras(v);
      else el.textContent = v;
      el.hidden = false;
    });
  }

  function renderHero(S) {
    if (S.hero.image) $('#heroImage').src = S.hero.image;
    const p = G.gclef;
    if (p) {
      const path = $('#heroClefPath');
      path.setAttribute('d', p.d);
      const [x, y, w, h] = p.bb;
      $('#heroClef').setAttribute('viewBox', `${x - 20} ${y - 20} ${w + 40} ${h + 40}`);
    }
    if (G.quarter) {
      const g = G.eighth;
      $('.scroll-cue svg').setAttribute('viewBox', `${g.bb[0]} ${g.bb[1]} ${g.bb[2]} ${g.bb[3]}`);
      $('.cue-path').setAttribute('d', g.d);
    }
  }

  function renderRibbon() {
    const items = ['Concert de printemps', 'Sainte-Cécile', 'Fête nationale', 'Stage d’orchestre d’été', 'Olivet Solidarité', 'Fête de la musique', 'Commémorations', 'Concerts du Conservatoire'];
    const sym = ['eighth', 'quarter', 'sharp', 'beamed', 'flat', 'sixteenth', 'natural', 'half'];
    const one = items.map((t, i) => `<span>${esc(t)}${glyphSvg(sym[i % sym.length])}</span>`).join('');
    $('#ribbon').innerHTML = one + one;
  }

  function renderOrchestre(S) {
    const notes = ['quarter', 'eighth', 'half', 'sixteenth'];
    $('#measures').innerHTML = (S.orchestre.chiffres || []).map((c, i) => `
      <div class="measure">
        ${glyphSvg(notes[i % 4], 'mnote')}
        <span class="mv" data-count="${esc(c.valeur)}">${esc(c.valeur)}</span>
        <span class="ml">${esc(c.label)}</span>
      </div>`).join('');
    $('#orchReelTrack').innerHTML = (S.orchestre.photos || []).map((u, i) =>
      `<figure><img src="${esc(u)}" alt="L’Harmonie d’Olivet en concert, photo ${i + 1}" loading="lazy" data-lb="orch" data-i="${i}"></figure>`).join('');
  }

  function renderDirection(S) {
    const d = S.direction;
    $('#dirPortrait').src = d.portrait || '';
    $('#jalons').innerHTML = (d.jalons || []).map((j, i) =>
      `<li><i class="jn" style="top:${[52, 40, 28, 16][i % 4]}px"></i><strong>${esc(j.annee)}</strong><span>${esc(j.texte)}</span></li>`).join('');
  }

  const fmtDay = d => d.toLocaleDateString('fr-FR', { day: 'numeric' });
  const fmtMonth = d => MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  const fmtTime = d => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ');
  function eventHtml(ev) {
    const d = new Date(ev.starts_at);
    const wd = d.toLocaleDateString('fr-FR', { weekday: 'long' });
    return `<li class="event">
      <div class="ev-date"><span class="d">${fmtDay(d)}</span><span class="m">${fmtMonth(d)}</span></div>
      <div>
        <h3 class="ev-title">${ev.link ? `<a href="${esc(ev.link)}" target="_blank" rel="noopener">${esc(ev.title)}</a>` : esc(ev.title)}</h3>
        <p class="ev-meta">${esc(wd.charAt(0).toUpperCase() + wd.slice(1))}, ${fmtTime(d)}${ev.place ? ' — ' + esc(ev.place) : ''}</p>
        ${ev.description ? `<p class="ev-desc">${esc(ev.description)}</p>` : ''}
      </div>
      ${ev.image_url ? `<img class="ev-img" src="${esc(ev.image_url)}" alt="" loading="lazy">` : '<span></span>'}
    </li>`;
  }
  function renderAgenda(events, S) {
    const now = Date.now() - 6 * 3600e3;
    const up = events.filter(e => new Date(e.starts_at).getTime() >= now);
    const past = events.filter(e => new Date(e.starts_at).getTime() < now).reverse().slice(0, 12);
    $('#events').innerHTML = up.map(eventHtml).join('');
    $('#eventsEmpty').hidden = up.length > 0;
    if (G.fermata) {
      const g = G.fermata;
      $('#eventsEmpty svg').setAttribute('viewBox', `${g.bb[0] - 10} ${g.bb[1] - 10} ${g.bb[2] + 20} ${g.bb[3] + 20}`);
      $('#fermataPath').setAttribute('d', g.d);
    }
    if (S.contact.facebook) $('#agendaFb').href = S.contact.facebook;
    $('#pastWrap').hidden = !past.length;
    $('#pastEvents').innerHTML = past.map(eventHtml).join('');
    const next = up[0];
    if (next) {
      const d = new Date(next.starts_at);
      $('#heroNextTitle').textContent = next.title;
      $('#heroNextDate').textContent = `${fmtDay(d)} ${fmtMonth(d)} · ${fmtTime(d)}`;
    } else $('#heroNext').hidden = true;
  }

  function renderPosts(posts) {
    const el = $('#posts');
    if (!posts.length) { el.innerHTML = '<p>Aucune actualité pour le moment.</p>'; return; }
    el.innerHTML = posts.slice(0, 7).map(p => {
      const d = new Date(p.published_at + 'T12:00:00');
      const txt = String(p.content || '');
      const short = txt.length > 240 ? txt.slice(0, 240).replace(/\s+\S*$/, '') + '…' : txt;
      return `<article class="post">
        ${p.image_url ? `<div class="post-img"><img src="${esc(p.image_url)}" alt="" loading="lazy" data-lb="posts"></div>` : ''}
        <div class="post-body">
          <time datetime="${esc(p.published_at)}">${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}</time>
          <h3>${esc(p.title)}</h3>
          <div class="excerpt"><p>${esc(short)}</p></div>
          <div class="full rich">${paras(txt)}</div>
          ${txt.length > 240 ? '<button class="more-link" type="button">Lire la suite</button>' : ''}
        </div>
      </article>`;
    }).join('');
    $$('.more-link', el).forEach(b => b.addEventListener('click', () => {
      const a = b.closest('.post'); a.classList.toggle('open');
      b.textContent = a.classList.contains('open') ? 'Réduire' : 'Lire la suite';
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }));
  }

  /* Plan de l'orchestre (stage) */
  function renderSeating(S) {
    const svg = $('#seating');
    const list = (S.stage.effectif || []).filter(x => +x.places > 0);
    const total = list.reduce((s, x) => s + (+x.places || 0), 0);
    $('#seatTotal').dataset.count = total;
    $('#seatTotal').textContent = total;
    const cx = 450, cy = 480;
    const rings = [[110, 190], [200, 290], [300, 400]];
    // répartit les pupitres en 3 rangs : bois devant, saxes/cors au milieu, cuivres/percus derrière
    const perRing = [[], [], []];
    list.forEach((x, i) => { const r = i < Math.ceil(list.length / 3) ? 0 : i < Math.ceil(2 * list.length / 3) ? 1 : 2; perRing[r].push(x); });
    const arc = (r1, r2, a1, a2) => {
      const p = (r, a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
      const [x1, y1] = p(r2, a1), [x2, y2] = p(r2, a2), [x3, y3] = p(r1, a2), [x4, y4] = p(r1, a1);
      const large = a1 - a2 > Math.PI ? 1 : 0;
      return `M${x1} ${y1} A${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 ${large} 0 ${x4} ${y4}Z`;
    };
    let html = svg.querySelector('title').outerHTML;
    perRing.forEach((ring, ri) => {
      const [r1, r2] = rings[ri];
      const sum = ring.reduce((s, x) => s + (+x.places), 0) || 1;
      let a = Math.PI - 0.06;
      const span = Math.PI - 0.12;
      ring.forEach(x => {
        const w = span * (+x.places) / sum;
        const a1 = a, a2 = a - w + 0.025;
        const mid = (a1 + a2) / 2, rm = (r1 + r2) / 2;
        const lx = cx + rm * Math.cos(mid), ly = cy - rm * Math.sin(mid);
        let dots = '';
        const n = +x.places;
        for (let k = 0; k < n; k++) {
          const t = (k + .5) / n; const aa = a1 - (a1 - a2) * t; const rr = r1 + (r2 - r1) * (0.22 + 0.56 * ((k % 2) ? .25 : .75));
          dots += `<circle class="seat-dot" r="3.2" cx="${(cx + rr * Math.cos(aa)).toFixed(1)}" cy="${(cy - rr * Math.sin(aa)).toFixed(1)}"/>`;
        }
        html += `<g class="seat" data-name="${esc(x.pupitre)}" data-n="${n}" tabindex="0">
          <path class="seat-arc" d="${arc(r1, r2, a1, a2)}"/>
          <g class="seat-dots">${dots}</g>
          <text class="seat-label" x="${lx.toFixed(1)}" y="${(ly - 2).toFixed(1)}" text-anchor="middle">${esc(x.pupitre)}</text>
          <text class="seat-count" x="${lx.toFixed(1)}" y="${(ly + 16).toFixed(1)}" text-anchor="middle">${n}</text>
        </g>`;
        a -= w;
      });
    });
    html += `<rect class="podium" x="${cx - 34}" y="${cy - 8}" width="68" height="8" rx="2"/><text class="seat-label" x="${cx}" y="${cy + 26}" text-anchor="middle">Chef</text>`;
    svg.innerHTML = html;
    const hover = $('#seatHover');
    $$('.seat', svg).forEach(g => {
      const on = () => { $$('.seat-arc', svg).forEach(p => p.classList.remove('on')); g.querySelector('.seat-arc').classList.add('on'); hover.textContent = `${g.dataset.name} : ${g.dataset.n} places`; Sound.playIndex(+g.dataset.n % 8); };
      g.addEventListener('mouseenter', on); g.addEventListener('focus', on);
    });
    // lisibilité : on masque les étiquettes des pupitres trop étroits sur petit écran
  }

  function renderStage(S) {
    renderSeating(S);
    const a = $('#stageInscription');
    if (S.stage.inscription_url) a.href = S.stage.inscription_url;
    else { a.href = '#contact'; a.removeAttribute('target'); a.textContent = 'Demander une inscription'; a.addEventListener('click', () => { const s = $('#cSubject'); if (s) s.value = 'Stage d’été'; }); }
    $('#stageAffiche').hidden = !S.stage.affiche;
    $('#stageAffiche').onclick = () => Lightbox.open([{ src: S.stage.affiche, cap: S.stage.titre + ' — ' + (S.stage.edition || '') }], 0);
    $('#stagePhotos').innerHTML = (S.stage.photos || []).slice(0, 8).map((u, i) => `<figure><img src="${esc(u)}" alt="Stage d’orchestre, photo ${i + 1}" loading="lazy" data-lb="stage" data-i="${i}"></figure>`).join('');
  }

  /* Galerie */
  const Gallery = {
    tab: 'photo', shown: 0, PAGE: 12, albums: [], visuels: [], presse: [],
    init(media) {
      const byAlbum = new Map();
      media.filter(m => m.kind === 'photo').forEach(m => {
        const k = m.album || 'divers';
        if (!byAlbum.has(k)) byAlbum.set(k, { key: k, title: m.album_title || 'Photos', date: m.album_date || '', items: [] });
        byAlbum.get(k).items.push(m);
      });
      const score = d => { const m = String(d).toLowerCase().match(/([a-zéû]+)\s+(\d{4})/); if (!m) return 0; return +m[2] * 12 + Math.max(0, MONTHS.indexOf(m[1])); };
      this.albums = [...byAlbum.values()].sort((a, b) => score(b.date) - score(a.date));
      this.visuels = media.filter(m => m.kind === 'visuel');
      this.presse = media.filter(m => m.kind === 'presse');
      $$('.tabs [role=tab]').forEach(b => b.addEventListener('click', () => this.show(b.dataset.tab)));
      $('#galleryMore').addEventListener('click', () => this.more());
      this.show('photo');
    },
    list() { return this.tab === 'photo' ? this.albums : this.tab === 'visuel' ? this.visuels : this.presse; },
    show(tab) {
      this.tab = tab; this.shown = 0;
      $$('.tabs [role=tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
      $('#gallery').innerHTML = '';
      this.more();
    },
    more() {
      const L = this.list(); const from = this.shown; const to = Math.min(L.length, from + (this.tab === 'photo' ? this.PAGE : this.PAGE * 2));
      const html = L.slice(from, to).map((x, i) => {
        if (this.tab === 'photo') {
          const imgs = x.items.slice(0, 3).map(m => `<img src="${esc(m.image_url)}" alt="" loading="lazy">`).join('');
          return `<button class="album" type="button" data-i="${from + i}"><div class="stack">${imgs}</div><h3>${esc(x.title)}</h3><span>${esc(x.date)} · ${x.items.length} photo${x.items.length > 1 ? 's' : ''}</span></button>`;
        }
        return `<button class="tile ${this.tab === 'presse' ? 'press' : ''}" type="button" data-i="${from + i}"><img src="${esc(x.image_url)}" alt="${esc(x.title || '')}" loading="lazy"><span>${esc(x.title || '')}</span></button>`;
      }).join('');
      const frag = document.createRange().createContextualFragment(html);
      const nodes = [...frag.children];
      $('#gallery').append(frag);
      nodes.forEach(n => n.addEventListener('click', () => {
        const i = +n.dataset.i;
        if (this.tab === 'photo') { const a = this.albums[i]; Lightbox.open(a.items.map(m => ({ src: m.image_url, cap: `${a.title} — ${a.date}` })), 0); }
        else { const L2 = this.list(); Lightbox.open(L2.map(m => ({ src: m.image_url, cap: m.title || '' })), i); }
      }));
      if (hasGsap && !reduce) gsap.from(nodes, { y: 40, opacity: 0, rotate: () => gsap.utils.random(-3, 3), duration: .7, stagger: .04, ease: 'power3.out' });
      this.shown = to;
      $('#galleryMore').hidden = this.shown >= L.length;
      if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 50);
    }
  };

  function renderContact(S) {
    const c = S.contact;
    const e = $('#contactEmail'); e.textContent = c.email || ''; e.href = 'mailto:' + (c.email || '');
    if (c.telephone) { $('#contactPhoneWrap').hidden = false; const p = $('#contactPhone'); p.textContent = c.telephone; p.href = 'tel:' + c.telephone.replace(/\s/g, ''); }
    const icons = {
      facebook: '<path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.4H7.5V14h2.7v8h3.3z"/>',
      twitter: '<path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/>',
      instagram: '<path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.2.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 4 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 4.8a5 5 0 100 10 5 5 0 000-10zm0 8.2a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zm5.2-9.6a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z"/>'
    };
    $('#socials').innerHTML = Object.keys(icons).filter(k => c[k]).map(k => `<a href="${esc(c[k])}" target="_blank" rel="noopener" aria-label="${k}"><svg viewBox="0 0 24 24">${icons[k]}</svg></a>`).join('');
    if (c.carte_lat && c.carte_lng) {
      const lat = +c.carte_lat, lng = +c.carte_lng, d = .012;
      $('#map').innerHTML = `<iframe title="Carte : Olivet" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d * .6}%2C${lng + d}%2C${lat + d * .6}&amp;layer=mapnik&amp;marker=${lat}%2C${lng}"></iframe>`;
    }
    const pts = (S.partenaires && S.partenaires.liste) || [];
    $('#partners').innerHTML = pts.map(p => p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.nom)}</a>` : `<span>${esc(p.nom)}</span>`).join('');
    $('#year').textContent = new Date().getFullYear();
  }

  function bindForm() {
    const f = $('#contactForm'), st = $('#formStatus');
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      st.className = 'form-status';
      if (f.website.value) return; // pot de miel anti-robots
      const name = f.name.value.trim(), email = f.email.value.trim(), body = f.body.value.trim();
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !body) { st.textContent = 'Indiquez votre nom, une adresse e-mail valide et votre message.'; st.classList.add('err'); return; }
      const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Envoi…';
      try {
        if (!sb) throw new Error('offline');
        const { error } = await sb.from('messages').insert({ name, email, subject: f.subject.value, body });
        if (error) throw error;
        f.reset(); st.textContent = 'Message envoyé. Nous vous répondrons rapidement.'; st.classList.add('ok');
        Sound.chord();
      } catch (e) {
        st.innerHTML = `L’envoi n’a pas abouti. Écrivez-nous directement à <a href="mailto:${esc($('#contactEmail').textContent)}">${esc($('#contactEmail').textContent)}</a>.`; st.classList.add('err');
      }
      btn.disabled = false; btn.textContent = 'Envoyer le message';
    });
  }

  /* ---------------- Visionneuse ---------------- */
  const Lightbox = {
    items: [], i: 0, el: null,
    init() {
      this.el = $('#lightbox');
      this.el.querySelector('.lb-close').onclick = () => this.close();
      this.el.querySelector('.lb-prev').onclick = () => this.go(-1);
      this.el.querySelector('.lb-next').onclick = () => this.go(1);
      this.el.addEventListener('click', e => { if (e.target === this.el || e.target.tagName === 'FIGURE') this.close(); });
      document.addEventListener('keydown', e => {
        if (this.el.hidden) return;
        if (e.key === 'Escape') this.close(); if (e.key === 'ArrowLeft') this.go(-1); if (e.key === 'ArrowRight') this.go(1);
      });
      document.addEventListener('click', e => {
        const img = e.target.closest('img[data-lb]'); if (!img) return;
        const group = $$(`img[data-lb="${img.dataset.lb}"]`);
        this.open(group.map(g => ({ src: g.src, cap: g.alt })), group.indexOf(img));
      });
    },
    open(items, i) { this.items = items; this.i = i; this.el.hidden = false; this.render(); window.__lenis && __lenis.stop(); this.el.querySelector('.lb-close').focus(); },
    close() { this.el.hidden = true; window.__lenis && __lenis.start(); },
    go(d) { this.i = (this.i + d + this.items.length) % this.items.length; this.render(); Sound.playIndex(this.i % 8); },
    render() {
      const it = this.items[this.i]; $('#lbImg').src = it.src; $('#lbCap').textContent = it.cap || '';
      const many = this.items.length > 1; this.el.querySelector('.lb-prev').hidden = !many; this.el.querySelector('.lb-next').hidden = !many;
      if (hasGsap && !reduce) gsap.fromTo('#lbImg', { opacity: 0, scale: .97 }, { opacity: 1, scale: 1, duration: .45, ease: 'power2.out' });
    }
  };

  /* ---------------- Son (Web Audio, désactivé par défaut) ---------------- */
  const Sound = {
    on: false, ctx: null,
    scale: [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25],
    init() {
      const b = $('#soundToggle');
      try { this.on = localStorage.getItem('ho-sound') === '1'; } catch (e) { }
      b.setAttribute('aria-pressed', String(this.on));
      b.addEventListener('click', () => {
        this.on = !this.on; b.setAttribute('aria-pressed', String(this.on));
        try { localStorage.setItem('ho-sound', this.on ? '1' : '0'); } catch (e) { }
        if (this.on) this.chord();
      });
    },
    ensure() { if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; this.ctx = new C(); } if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; },
    play(freq, when = 0, dur = .9, vol = .12) {
      if (!this.on) return; const ctx = this.ensure(); if (!ctx) return;
      const t = ctx.currentTime + when;
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o1.type = 'sawtooth'; o2.type = 'triangle'; o1.frequency.value = freq; o2.frequency.value = freq * 1.003;
      f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 2, t); f.frequency.linearRampToValueAtTime(freq * 6, t + .08); f.frequency.exponentialRampToValueAtTime(freq * 2.2, t + dur); f.Q.value = 1.2;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .05); g.gain.exponentialRampToValueAtTime(vol * .5, t + .3); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(ctx.destination);
      o1.start(t); o2.start(t); o1.stop(t + dur + .05); o2.stop(t + dur + .05);
    },
    playIndex(i) { this.play(this.scale[Math.max(0, Math.min(this.scale.length - 1, i))], 0, .7, .09); },
    chord() { [0, 2, 4, 7].forEach((i, k) => this.play(this.scale[i], k * .07, 1.6, .07)); }
  };

  /* ---------------- Portée animée du héro (canvas) ---------------- */
  function initStrings() {
    const cv = $('#strings'); const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, lines = [], notes = [], mouse = { x: -1e4, y: -1e4, vx: 0, vy: 0 }, visible = true, t = 0;
    const N = 5, SEG = 90;
    const paths = {};
    ['quarter', 'eighth', 'sixteenth', 'half', 'sharp', 'flat'].forEach(k => { if (G[k]) paths[k] = new Path2D(G[k].d); });
    const kinds = Object.keys(paths);
    // La portée est calée sur la clé de sol : mêmes proportions que dans la police (interligne = 250 unités)
    let GAP = 24, TOP = 300;
    const gap = () => GAP;
    const top = () => TOP;
    function layout() {
      const svg = $('#heroClef'); const c = cv.getBoundingClientRect(); const r = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      if (r.height > 0 && vb && vb.height) {
        const unit = r.height / vb.height;
        GAP = 250 * unit;
        TOP = r.top - c.top + (-1000 - vb.y) * unit;
      } else { GAP = Math.max(16, H * .05); TOP = H * .45; }
    }
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
      layout();
      lines = Array.from({ length: N }, () => Array.from({ length: SEG + 1 }, () => ({ y: 0, v: 0 })));
    }
    function spawn(x, step, kind) {
      notes.push({ x: x ?? -40, step: step ?? Math.floor(Math.random() * 11) - 1, kind: kind || kinds[Math.floor(Math.random() * kinds.length)], life: 0, speed: 0.25 + Math.random() * .35, wob: Math.random() * 6.28, alpha: 0 });
    }
    function frame() {
      requestAnimationFrame(frame);
      if (!visible) return;
      t += 1 / 60;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const g = gap(), y0 = top();
      // cordes : ressort + amortissement + propagation, perturbées par la souris
      for (let li = 0; li < N; li++) {
        const L = lines[li]; const baseY = y0 + li * g;
        for (let i = 0; i <= SEG; i++) {
          const p = L[i]; const x = i / SEG * W;
          const dx = x - mouse.x, dy = baseY + p.y - mouse.y; const dist = Math.hypot(dx, dy);
          if (dist < 90) p.v += (mouse.vy * .06) * (1 - dist / 90);
          const left = i > 0 ? L[i - 1].y : 0, right = i < SEG ? L[i + 1].y : 0;
          p.v += (left + right - 2 * p.y) * .18 - p.y * .012; p.v *= .955;
        }
        for (let i = 0; i <= SEG; i++) L[i].y += L[i].v;
        ctx.beginPath();
        for (let i = 0; i <= SEG; i++) {
          const x = i / SEG * W; const wave = Math.sin(i * .09 + t * 1.1 + li * .7) * 2.2 * Math.sin(i / SEG * Math.PI);
          const y = baseY + L[i].y + wave; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, 'rgba(172,146,119,0)'); grad.addColorStop(.1, 'rgba(172,146,119,.42)'); grad.addColorStop(.85, 'rgba(217,196,163,.32)'); grad.addColorStop(1, 'rgba(217,196,163,0)');
        ctx.strokeStyle = grad; ctx.lineWidth = 1; ctx.stroke();
      }
      // notes qui défilent sur la portée
      if (!reduce && notes.length < 4 && Math.random() < .006) spawn();
      for (let k = notes.length - 1; k >= 0; k--) {
        const n = notes[k]; n.x += n.speed; n.life++;
        n.alpha = Math.min(1, n.alpha + .02) * (n.x > W - 80 ? Math.max(0, (W - n.x) / 80) : 1);
        if (n.x > W + 40) { notes.splice(k, 1); continue; }
        const li = N - 1 - Math.max(0, Math.min(N - 1, Math.round(n.step / 2)));
        const seg = Math.max(0, Math.min(SEG, Math.round(n.x / W * SEG)));
        const yy = y0 + (8 - n.step) * g / 2 + lines[li][seg].y + Math.sin(t * 2 + n.wob) * 1.2;
        const s = g / 250;
        const gb = G[n.kind].bb;
        ctx.save(); ctx.globalAlpha = n.alpha * (n.user ? .9 : .38); ctx.translate(n.x, yy); ctx.scale(s, s);
        ctx.translate(-gb[0], -(gb[1] + gb[3]) + 130);
        ctx.fillStyle = n.kind === 'sharp' || n.kind === 'flat' ? '#7d6750' : '#d9c4a3';
        ctx.fill(paths[n.kind]); ctx.restore();
        // l'archet de la note agite la corde
        if (n.life % 6 === 0 && lines[li][seg]) lines[li][seg].v += .25;
      }
    }
    resize(); window.addEventListener('resize', resize);
    const hero = $('#ouverture');
    hero.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
      mouse.vx = x - mouse.x; mouse.vy = Math.max(-40, Math.min(40, y - mouse.y)); mouse.x = x; mouse.y = y;
    });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
    hero.addEventListener('click', e => {
      if (e.target.closest('a,button')) return;
      const r = cv.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
      const g = gap(), y0 = top();
      const step = Math.round(8 - (y - y0) / (g / 2));
      const st = Math.max(-2, Math.min(10, step));
      spawn(x, st, ['quarter', 'eighth', 'sixteenth'][Math.floor(Math.random() * 3)]); notes[notes.length - 1].user = true;
      const li = N - 1 - Math.max(0, Math.min(N - 1, Math.round(st / 2))); const seg = Math.round(x / W * SEG);
      for (let i = -6; i <= 6; i++) { const q = lines[li][seg + i]; if (q) q.v += 7 * (1 - Math.abs(i) / 7); }
      Sound.playIndex(Math.max(0, Math.min(9, st + 1)));
    });
    for (let i = 0; i < 2; i++) spawn(cv.clientWidth * (.45 + i * .3));
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(hero);
    frame();
  }

  /* ---------------- Navigation ---------------- */
  function initNav() {
    const secs = $$('main > section[id]');
    const ul = $('#staffNotes');
    ul.innerHTML = secs.map((s, i) => `<li style="top:${(i / (secs.length - 1) * 100).toFixed(2)}%"><a href="#${s.id}" style="left:${(+s.dataset.pitch * 12.5).toFixed(1)}%" aria-label="${esc(s.dataset.title)}"><span class="head"></span><span class="lbl">${esc(s.dataset.title)}</span></a></li>`).join('');
    const links = [...$$('a', ul), ...$$('#menu a')];
    links.forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href'); const target = $(id); if (!target) return;
      e.preventDefault();
      $('#menu').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false');
      if (window.__lenis) __lenis.start();
      if (window.__lenis) __lenis.scrollTo(target, { offset: 0, duration: 1.6 }); else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      const sec = secs.find(s => '#' + s.id === id); if (sec) Sound.playIndex(+sec.dataset.pitch);
    }));
    $$('a[href^="#"]').filter(a => !links.includes(a)).forEach(a => a.addEventListener('click', e => {
      const t = $(a.getAttribute('href')); if (!t || !window.__lenis) return; e.preventDefault(); __lenis.scrollTo(t, { duration: 1.4 });
    }));
    $('#burger').addEventListener('click', () => {
      const m = $('#menu'); const open = !m.classList.contains('open'); m.classList.toggle('open', open);
      $('#burger').setAttribute('aria-expanded', String(open));
      if (window.__lenis) open ? __lenis.stop() : __lenis.start();
    });
    // section active
    let current = null;
    const setActive = id => {
      if (id === current) return; current = id;
      $$('a', ul).forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
      $$('#menu a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
    };
    const io = new IntersectionObserver(ents => ents.forEach(en => { if (en.isIntersecting) setActive(en.target.id); }), { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(s => io.observe(s));
    // barre du haut + tête de lecture
    let lastY = 0;
    const onScroll = y => {
      const max = document.documentElement.scrollHeight - innerHeight; const p = max > 0 ? y / max : 0;
      $('#progressBar').style.transform = `scaleX(${p})`;
      $('#playhead').style.top = (p * 100) + '%';
      const tb = $('#topbar'); tb.classList.toggle('scrolled', y > 40);
      tb.classList.toggle('hidden', y > lastY && y > innerHeight * .8 && !$('#menu').classList.contains('open'));
      lastY = y;
    };
    if (window.__lenis) __lenis.on('scroll', ({ scroll }) => onScroll(scroll)); else addEventListener('scroll', () => onScroll(scrollY), { passive: true });
    onScroll(scrollY);
  }

  /* ---------------- Animations au défilement (GSAP) ---------------- */
  const splitChars = el => {
    const txt = el.textContent; el.setAttribute('aria-label', txt);
    el.innerHTML = txt.split(/(\s+)/).map(w => /^\s+$/.test(w) ? w : `<span style="display:inline-block;white-space:nowrap" aria-hidden="true">${[...w].map(c => `<span class="ch">${esc(c)}</span>`).join('')}</span>`).join('');
    return $$('.ch', el);
  };
  const splitWords = el => { const txt = el.textContent; el.setAttribute('aria-label', txt); el.innerHTML = txt.split(/\s+/).map(w => `<span class="w" aria-hidden="true">${esc(w)}</span>`).join(' '); return $$('.w', el); };

  function initMotion() {
    if (!hasGsap || reduce) {
      $('#heroClefPath') && ($('#heroClefPath').style.fill = 'rgba(172,146,119,.35)');
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    // Défilement doux
    if (window.Lenis) {
      const lenis = new Lenis({ lerp: .1, smoothWheel: true });
      window.__lenis = lenis;
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    /* Ouverture : la clé de sol se grave, le titre tombe sur la portée */
    const clef = $('#heroClefPath');
    if (clef) {
      const len = clef.getTotalLength();
      gsap.set(clef, { strokeDasharray: len, strokeDashoffset: len });
      gsap.timeline({ delay: .2 })
        .to(clef, { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut' })
        .to(clef, { fill: 'rgba(172,146,119,.22)', duration: 1.2 }, '-=.6');
    }
    const chars = splitChars($('.ht-line'));
    gsap.from(chars, { yPercent: 120, rotate: () => gsap.utils.random(-25, 25), opacity: 0, duration: 1.3, ease: 'expo.out', stagger: .045, delay: .5 });
    gsap.from(['.hero-kicker', '.hero-lede', '.hero-cta', '.hero-next'], { y: 30, opacity: 0, duration: 1, ease: 'power3.out', stagger: .12, delay: 1.1 });
    gsap.from('.hero-bg img', { scale: 1.15, opacity: 0, duration: 2.4, ease: 'power2.out' });
    gsap.to('.scroll-cue', { y: 10, repeat: -1, yoyo: true, duration: .9, ease: 'sine.inOut' });
    // sortie du héro
    gsap.timeline({ scrollTrigger: { trigger: '#ouverture', start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero-inner', { yPercent: -18, opacity: 0, ease: 'none' }, 0)
      .to('#heroClef', { yPercent: -70, rotate: -12, scale: 1.25, opacity: 0, ease: 'none' }, 0)
      .to('.hero-bg img', { yPercent: 18, scale: 1.08, ease: 'none' }, 0)
      .to('#strings', { opacity: 0, ease: 'none' }, .2);

    /* Ruban défilant, accéléré par la vitesse de défilement */
    const track = $('#ribbon');
    const loop = gsap.to(track, { xPercent: -50, repeat: -1, duration: 38, ease: 'none' });
    ScrollTrigger.create({ onUpdate: s => { const v = gsap.utils.clamp(-6, 6, s.getVelocity() / 300); gsap.to(loop, { timeScale: v >= 0 ? 1 + v : -1 + v, duration: .3, overwrite: true }); gsap.to(loop, { timeScale: 1, duration: 1.2, delay: .3 }); } });

    /* Titres de section : les lettres tombent comme des notes */
    $$('.sec-title').forEach(t => {
      const c = splitChars(t);
      gsap.from(c, {
        scrollTrigger: { trigger: t, start: 'top 85%', onEnter: () => { const s = t.closest('section'); if (s) Sound.playIndex(+s.dataset.pitch); } },
        y: () => gsap.utils.random(-140, -60), rotate: () => gsap.utils.random(-40, 40), opacity: 0, duration: 1.1, ease: 'bounce.out', stagger: { each: .035, from: 'random' }
      });
    });
    $$('.movement').forEach(m => gsap.from(m, { scrollTrigger: { trigger: m, start: 'top 88%' }, scaleX: 0, transformOrigin: '0 50%', opacity: 0, duration: .9, ease: 'power3.out' }));

    /* Textes : les mots s'éclairent au fil de la lecture */
    $$('.reveal-words').forEach(el => {
      const w = splitWords(el);
      gsap.fromTo(w, { opacity: .14 }, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } });
    });
    $$('.rich').forEach(el => gsap.from(el.children, { scrollTrigger: { trigger: el, start: 'top 85%' }, y: 24, opacity: 0, duration: .9, stagger: .12, ease: 'power3.out' }));

    /* Mesures : les notes tombent, les nombres se comptent */
    $$('.measure').forEach((m, i) => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: '#measures', start: 'top 80%' } });
      tl.from(m.querySelector('.mnote'), { y: -120, opacity: 0, rotate: -30, duration: .9, ease: 'bounce.out', delay: i * .15 }, 0);
      const v = m.querySelector('.mv'); const raw = v.dataset.count; const num = parseFloat(raw);
      if (!isNaN(num) && /^\d+/.test(raw)) {
        const suffix = raw.replace(/^[\d.,]+/, ''); const o = { n: num > 1900 ? num - 40 : 0 };
        tl.to(o, { n: num, duration: 1.6, ease: 'power3.out', delay: i * .15, onUpdate: () => { v.textContent = Math.round(o.n) + suffix; } }, 0);
      }
    });
    $$('.measure .mnote').forEach((n, i) => gsap.set(n, { top: [6, 30, 18, 0][i % 4] + 'px', left: '26px' }));

    /* Métronome */
    gsap.set(['#metroArm', '#metroWeight'], { rotate: -28 });
    const metro = gsap.to(['#metroArm', '#metroWeight'], { rotate: 28, duration: .6, ease: 'sine.inOut', repeat: -1, yoyo: true, paused: true });
    ScrollTrigger.create({ trigger: '.rehearsal', start: 'top bottom', end: 'bottom top', onToggle: s => s.isActive ? metro.play() : metro.pause() });
    gsap.from('.rehearsal', { scrollTrigger: { trigger: '.rehearsal', start: 'top 85%' }, y: 60, opacity: 0, duration: 1, ease: 'power3.out' });

    /* Pellicule horizontale */
    const reel = $('#orchReelTrack');
    const reelImgs = $$('img', reel);
    Promise.all(reelImgs.map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => {
      const dist = () => Math.max(0, reel.scrollWidth - innerWidth + 40);
      gsap.to(reel, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '#orchReel', start: innerWidth > 900 ? 'center center' : 'top 80%', end: () => '+=' + dist(), scrub: 1, pin: innerWidth > 900, invalidateOnRefresh: true, anticipatePin: 1 } });
      ScrollTrigger.refresh();
    });

    /* Direction : la battue du chef se dessine */
    const beat = $('#beatPath'), dot = $('#beatDot');
    if (beat) {
      const L = beat.getTotalLength();
      gsap.set(beat, { strokeDasharray: L, strokeDashoffset: L });
      const st = { p: 0 };
      gsap.to(st, {
        p: 1, ease: 'none',
        scrollTrigger: { trigger: '.dir-portrait', start: 'top 70%', end: 'bottom 30%', scrub: .6 },
        onUpdate: () => { beat.style.strokeDashoffset = L * (1 - st.p); const pt = beat.getPointAtLength(L * st.p); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); }
      });
    }
    gsap.from('.dir-frame', { scrollTrigger: { trigger: '.dir-portrait', start: 'top 85%' }, clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'expo.out' });
    gsap.from('.jalons li', { scrollTrigger: { trigger: '#jalons', start: 'top 85%' }, x: 40, opacity: 0, duration: .8, stagger: .15, ease: 'power3.out' });
    gsap.from('.jalons .jn', { scrollTrigger: { trigger: '#jalons', start: 'top 85%' }, y: -60, opacity: 0, duration: .9, stagger: .15, ease: 'bounce.out', delay: .1 });

    /* Agenda */
    gsap.from('#events .event', { scrollTrigger: { trigger: '#events', start: 'top 85%' }, x: 80, opacity: 0, duration: .9, stagger: .12, ease: 'power3.out' });
    const ferm = $('#fermataPath');
    if (ferm && !$('#eventsEmpty').hidden) {
      const L = ferm.getTotalLength();
      gsap.set(ferm, { strokeDasharray: L, strokeDashoffset: L, fill: 'transparent', stroke: '#000', strokeWidth: 8 });
      gsap.timeline({ scrollTrigger: { trigger: '#eventsEmpty', start: 'top 80%' } }).to(ferm, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' }).to(ferm, { fill: '#000', duration: .6 }, '-=.4');
    }
    gsap.from('.agenda-staff i', { scrollTrigger: { trigger: '#agenda', start: 'top 70%' }, scaleX: 0, transformOrigin: '0 50%', duration: 1.4, stagger: .08, ease: 'expo.out' });

    /* Actualités */
    gsap.from('.post', { scrollTrigger: { trigger: '#posts', start: 'top 85%' }, y: 70, opacity: 0, duration: 1, stagger: .12, ease: 'power3.out' });

    /* Stage : l'orchestre s'installe */
    const seats = $$('#seating .seat');
    const seatTl = gsap.timeline({ scrollTrigger: { trigger: '#seating', start: 'top 75%' } });
    seatTl.from('#seating .podium', { scaleX: 0, transformOrigin: '50% 50%', duration: .5 })
      .from(seats.map(s => s.querySelector('.seat-arc')), { scale: .4, opacity: 0, transformOrigin: '450px 480px', duration: .9, stagger: .07, ease: 'back.out(1.6)' }, '<.1')
      .from(seats.map(s => $$('.seat-dot', s)).flat(), { scale: 0, transformOrigin: 'center', duration: .3, stagger: .006, ease: 'back.out(3)' }, '-=.6')
      .from($$('#seating text'), { opacity: 0, duration: .5, stagger: .03 }, '-=.6');
    const tot = $('#seatTotal'); const totN = +tot.dataset.count || 0; const to = { n: 0 };
    seatTl.to(to, { n: totN, duration: 1.6, ease: 'power3.out', onUpdate: () => { tot.textContent = Math.round(to.n); } }, .3);
    gsap.from('.stage-info .si', { scrollTrigger: { trigger: '.stage-info', start: 'top 85%' }, y: 40, opacity: 0, duration: .8, stagger: .1, ease: 'power3.out' });
    $$('#stagePhotos figure').forEach((f, i) => {
      gsap.from(f, { scrollTrigger: { trigger: '#stagePhotos', start: 'top 85%' }, clipPath: 'inset(0 0 100% 0)', duration: 1.1, delay: i * .07, ease: 'expo.out' });
      gsap.fromTo(f.querySelector('img'), { yPercent: -8, scale: 1.15 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* Contact */
    gsap.from('.contact-form .field, .contact-form .btn', { scrollTrigger: { trigger: '#contactForm', start: 'top 80%' }, y: 30, opacity: 0, duration: .7, stagger: .08, ease: 'power3.out' });
    gsap.from('.contact-side > *', { scrollTrigger: { trigger: '.contact-side', start: 'top 85%' }, x: 40, opacity: 0, duration: .8, stagger: .1, ease: 'power3.out' });

    /* Portées décoratives : légère dérive */
    $$('.paper-staves').forEach(p => gsap.fromTo(p, { backgroundPositionY: '0px' }, { backgroundPositionY: '-180px', ease: 'none', scrollTrigger: { trigger: p.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

    addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* Petite note qui s'envole au clic sur les boutons */
  function initFlyNotes() {
    if (reduce || !hasGsap || !G.eighth) return;
    document.addEventListener('click', e => {
      const b = e.target.closest('.btn'); if (!b) return;
      for (let i = 0; i < 3; i++) {
        const k = ['eighth', 'quarter', 'sixteenth'][i];
        const wrap = document.createElement('div'); wrap.innerHTML = glyphSvg(k, 'fly-note'); const s = wrap.firstChild;
        s.style.left = e.clientX - 12 + 'px'; s.style.top = e.clientY - 30 + 'px'; document.body.appendChild(s);
        gsap.to(s, { x: gsap.utils.random(-70, 70), y: gsap.utils.random(-140, -80), rotate: gsap.utils.random(-40, 40), opacity: 0, duration: 1.2, ease: 'power2.out', onComplete: () => s.remove() });
      }
    });
  }

  /* ---------------- Démarrage ---------------- */
  async function start() {
    Sound.init();
    Lightbox.init();
    renderRibbon();
    const data = await loadData();
    const S = data.settings;
    bindTexts(S);
    renderHero(S);
    renderOrchestre(S);
    renderDirection(S);
    renderAgenda(data.events, S);
    renderPosts(data.posts);
    renderStage(S);
    Gallery.init(data.media);
    renderContact(S);
    bindForm();
    initMotion();
    initNav();
    initStrings();
    initFlyNotes();
  }
  start();
})();
