/* ==========================================================
   Harmonie d'Olivet — script du site (multi-pages)
   Aucune bibliothèque d'animation : CSS + IntersectionObserver.
   Chaque page ne charge que les données dont elle a besoin.
   ========================================================== */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const G = window.GLYPHS || {};
  const D = window.HO_DEFAULTS;
  const PAGE = document.body.dataset.page;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paras = s => String(s || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const glyphSvg = (name, cls = '') => {
    const g = G[name]; if (!g) return '';
    const [x, y, w, h] = g.bb;
    return `<svg class="${cls}" viewBox="${x - 10} ${y - 10} ${w + 20} ${h + 20}" aria-hidden="true"><path d="${g.d}"/></svg>`;
  };

  /* ---------------- Données ---------------- */
  let sb = null;
  try {
    if (window.supabase && window.HO_CONFIG) sb = window.supabase.createClient(HO_CONFIG.supabaseUrl, HO_CONFIG.supabaseKey, { auth: { persistSession: false } });
  } catch (e) { console.warn('Supabase indisponible', e); }

  const NEEDS = {
    accueil: ['events', 'posts'], orchestre: [], agenda: ['events'], actualites: ['posts'],
    stage: [], galerie: ['media'], contact: []
  };
  async function loadData() {
    const data = { settings: structuredClone(D), events: [], posts: [], media: [] };
    if (!sb) return data;
    const need = NEEDS[PAGE] || [];
    const q = { settings: sb.from('settings').select('key,value') };
    if (need.includes('events')) q.events = sb.from('events').select('*').eq('published', true).order('starts_at');
    if (need.includes('posts')) q.posts = sb.from('posts').select('*').eq('published', true).order('published_at', { ascending: false }).limit(PAGE === 'accueil' ? 3 : 50);
    if (need.includes('media')) q.media = sb.from('media').select('id,kind,title,image_url,thumb_url,sort,album,album_title,album_date').eq('published', true).order('sort').limit(5000);
    try {
      const keys = Object.keys(q);
      const res = await Promise.all(keys.map(k => q[k]));
      keys.forEach((k, i) => {
        const rows = res[i].data || [];
        if (k === 'settings') rows.forEach(r => { data.settings[r.key] = Object.assign({}, D[r.key] || {}, r.value || {}); });
        else data[k] = rows;
      });
    } catch (err) { console.warn('Chargement partiel', err); }
    return data;
  }

  function bindTexts(S) {
    $$('[data-k]').forEach(el => {
      const v = get(S, el.dataset.k);
      if (v == null || v === '') { if (el.dataset.rich !== undefined || el.tagName === 'P') el.hidden = !el.textContent.trim(); return; }
      if (el.dataset.rich !== undefined) el.innerHTML = paras(v);
      else el.textContent = v;
      el.hidden = false;
    });
  }

  /* Titres : les lettres tombent comme des notes (animation CSS) */
  function dropLetters(el) {
    if (!el || reduce) return;
    const txt = el.textContent.trim(); el.setAttribute('aria-label', txt);
    let i = 0;
    el.innerHTML = txt.split(/(\s+)/).map(w => /^\s+$/.test(w) ? ' ' :
      `<span style="display:inline-block;white-space:nowrap" aria-hidden="true">${[...w].map(c => `<span class="ch" style="--i:${i++};--r:${(Math.random() * 40 - 20).toFixed(0)}deg">${esc(c)}</span>`).join('')}</span>`).join('');
  }

  /* Apparition au défilement */
  function initReveal() {
    const els = $$('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(e => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver(ents => ents.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); en.target.dispatchEvent(new Event('reveal')); }
    }), { rootMargin: '0px 0px -12% 0px' });
    els.forEach(e => io.observe(e));
  }

  /* ---------------- Son (Web Audio, désactivé par défaut) ---------------- */
  const Sound = {
    on: false, ctx: null,
    /* Hauteurs exactes (la 440 Hz). Position sur la portée de sol : 0 = mi4 (1re ligne), 1 = fa4… -2 = do4. */
    midiFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); },
    stepMidi(step) { const DIA = [0, 2, 4, 5, 7, 9, 11]; const d = step + 2; return 60 + Math.floor(d / 7) * 12 + DIA[((d % 7) + 7) % 7]; },
    playStep(step, dur = .75, vol = .09) { this.play(this.midiFreq(this.stepMidi(step)), 0, dur, vol); },
    playMidi(m, dur = .75, vol = .09) { this.play(this.midiFreq(m), 0, dur, vol); },
    /* « Hymne à la joie » (Beethoven, domaine public) joué note à note dans la visionneuse */
    ODE: [0, 0, 1, 2, 2, 1, 0, -1, -2, -2, -1, 0, 0, -1, -1, 0, 0, 1, 2, 2, 1, 0, -1, -2, -2, -1, 0, -1, -2, -2],
    odeI: -1,
    ode(dir) { const L = this.ODE.length; this.odeI = dir < 0 ? (this.odeI - 1 + L) % L : (this.odeI + 1) % L; this.playStep(this.ODE[this.odeI], .6, .09); },
    /* Chaque pupitre joue dans son registre (accord de do majeur) */
    instrument(name) {
      const n = String(name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (/percu|batterie|timbale/.test(n)) return this.perc();
      const reg = [[/piccolo/, 96], [/flute/, 84], [/hautbois/, 79], [/clarinette basse/, 52], [/clarinette/, 76], [/basson/, 55], [/sax/, 72], [/trompette|cornet/, 67], [/trombone/, 55], [/euphonium|baryton/, 52], [/tuba/, 48], [/cor/, 64], [/harpe/, 88], [/contrebasse/, 40]];
      const hit = reg.find(([re]) => re.test(n));
      this.playMidi(hit ? hit[1] : 72, .8, .09);
    },
    perc() {
      if (!this.on) return; const ctx = this.ensure(); if (!ctx) return;
      const t = ctx.currentTime, len = Math.floor(ctx.sampleRate * .25), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = buf; f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = .8; g.gain.value = .35;
      src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(t);
      const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + .2);
      og.gain.setValueAtTime(.3, t); og.gain.exponentialRampToValueAtTime(.0001, t + .25); o.connect(og); og.connect(ctx.destination); o.start(t); o.stop(t + .3);
    },
    init() {
      const b = $('#soundToggle'); if (!b) return;
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
    /* accord de do majeur arpégé : do4 mi4 sol4 do5 */
    chord() { [60, 64, 67, 72].forEach((m, k) => this.play(this.midiFreq(m), k * .07, 1.6, .07)); }
  };

  /* ---------------- Visionneuse ---------------- */
  const Lightbox = {
    items: [], i: 0, el: null,
    init() {
      this.el = $('#lightbox'); if (!this.el) return;
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
        this.open(group.map(g => ({ src: g.dataset.full || g.src, cap: g.alt })), group.indexOf(img));
      });
    },
    open(items, i) { this.items = items; this.i = i; Sound.odeI = -1; this.el.hidden = false; document.documentElement.style.overflow = 'hidden'; this.render(); this.el.querySelector('.lb-close').focus(); },
    close() { this.el.hidden = true; document.documentElement.style.overflow = ''; },
    go(d) { this.i = (this.i + d + this.items.length) % this.items.length; this.render(); Sound.ode(d); },
    render() {
      const it = this.items[this.i]; const img = $('#lbImg'); img.src = it.src; $('#lbCap').textContent = it.cap || '';
      const many = this.items.length > 1; this.el.querySelector('.lb-prev').hidden = !many; this.el.querySelector('.lb-next').hidden = !many;
      const nx = this.items[(this.i + 1) % this.items.length]; if (nx && nx !== it) { const pre = new Image(); pre.decoding = 'async'; pre.src = nx.src; }
    }
  };

  /* ---------------- En-tête, menu, pied de page ---------------- */
  function initHeader() {
    // anciens liens du site en une page (index.html#agenda…) → nouvelles pages
    const OLD = { '#orchestre': 'orchestre.html', '#direction': 'orchestre.html#direction', '#agenda': 'agenda.html', '#actualites': 'actualites.html', '#stage': 'stage.html', '#galerie': 'galerie.html', '#contact': 'contact.html' };
    if (PAGE === 'accueil' && OLD[location.hash]) { location.replace(OLD[location.hash]); return; }
    const tb = $('#topbar'), menu = $('#menu'), burger = $('#burger');
    burger.addEventListener('click', () => {
      const open = !menu.classList.contains('open'); menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open)); document.documentElement.style.overflow = open ? 'hidden' : '';
    });
    if (tb.classList.contains('on-hero')) {
      let on = null;
      const upd = () => { const s = scrollY > 40; if (s !== on) { on = s; tb.classList.toggle('scrolled', s); } };
      addEventListener('scroll', upd, { passive: true }); upd();
    }
    // la clé de sol des bandeaux de titre
    if (G.gclef) { const p = $('#g-clef-path'); if (p) p.setAttribute('d', G.gclef.d); }
  }

  const ICONS = {
    facebook: '<path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.4H7.5V14h2.7v8h3.3z"/>',
    twitter: '<path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/>',
    instagram: '<path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.2.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 4 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 4.8a5 5 0 100 10 5 5 0 000-10zm0 8.2a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zm5.2-9.6a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z"/>'
  };
  function renderFooter(S) {
    const c = S.contact;
    $$('[data-socials]').forEach(el => {
      el.innerHTML = Object.keys(ICONS).filter(k => c[k]).map(k => `<a href="${esc(c[k])}" target="_blank" rel="noopener" aria-label="${k}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg></a>`).join('');
    });
    const pts = (S.partenaires && S.partenaires.liste) || [];
    $('#partners').innerHTML = pts.map(p => p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.nom)}</a>` : `<span>${esc(p.nom)}</span>`).join('');
    $('#year').textContent = new Date().getFullYear();
  }

  /* ---------------- Agenda (utilisé par l'accueil et la page agenda) ---------------- */
  const fmtDay = d => d.toLocaleDateString('fr-FR', { day: 'numeric' });
  const fmtMonth = d => MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  const fmtTime = d => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ');
  const weekday = d => { const w = d.toLocaleDateString('fr-FR', { weekday: 'long' }); return w.charAt(0).toUpperCase() + w.slice(1); };
  const splitEvents = events => {
    const now = Date.now() - 6 * 3600e3;
    return {
      up: events.filter(e => new Date(e.starts_at).getTime() >= now),
      past: events.filter(e => new Date(e.starts_at).getTime() < now).reverse()
    };
  };
  function eventHtml(ev) {
    const d = new Date(ev.starts_at);
    return `<li class="event" data-reveal>
      <div class="ev-date"><span class="d">${fmtDay(d)}</span><span class="m">${fmtMonth(d)}</span></div>
      <div>
        <h3 class="ev-title">${ev.link ? `<a href="${esc(ev.link)}" target="_blank" rel="noopener">${esc(ev.title)}</a>` : esc(ev.title)}</h3>
        <p class="ev-meta">${weekday(d)}, ${fmtTime(d)}${ev.place ? ' — ' + esc(ev.place) : ''}</p>
        ${ev.description ? `<p class="ev-desc">${esc(ev.description)}</p>` : ''}
      </div>
      ${ev.image_url ? `<img class="ev-img" src="${esc(ev.image_url)}" alt="${esc(ev.title)}" loading="lazy" decoding="async" data-lb="agenda">` : '<span></span>'}
    </li>`;
  }

  /* ---------------- Actualités ---------------- */
  function renderPosts(posts) {
    const el = $('#posts'); if (!el) return;
    if (!posts.length) { el.innerHTML = '<p>Aucune actualité pour le moment.</p>'; return; }
    el.innerHTML = posts.map(p => {
      const d = new Date(p.published_at + 'T12:00:00');
      const txt = String(p.content || '');
      const short = txt.length > 220 ? txt.slice(0, 220).replace(/\s+\S*$/, '') + '…' : txt;
      return `<article class="post" data-reveal>
        ${p.image_url ? `<div class="post-img"><img src="${esc(p.image_url)}" alt="${esc(p.title)}" loading="lazy" decoding="async" data-lb="posts"></div>` : ''}
        <div class="post-body">
          <time datetime="${esc(p.published_at)}">${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}</time>
          <h3>${esc(p.title)}</h3>
          <div class="excerpt"><p>${esc(short)}</p></div>
          <div class="full rich">${paras(txt)}</div>
          ${txt.length > 220 ? '<button class="more-link" type="button">Lire la suite</button>' : ''}
        </div>
      </article>`;
    }).join('');
    $$('.more-link', el).forEach(b => b.addEventListener('click', () => {
      const a = b.closest('.post'); a.classList.toggle('open');
      b.textContent = a.classList.contains('open') ? 'Réduire' : 'Lire la suite';
    }));
  }

  /* ================================================================ Pages */
  const Pages = {};

  /* ---------- Accueil ---------- */
  Pages.accueil = (S, data) => {
    if (S.hero.image) $('#heroImage').src = S.hero.image;
    const g = G.gclef;
    if (g) { const p = $('#heroClefPath'); p.setAttribute('d', g.d); try { p.style.setProperty('--len', Math.ceil(p.getTotalLength())); } catch (e) { } }
    dropLetters($('.hero-title'));
    // ruban
    const items = ['Concert de printemps', 'Sainte-Cécile', 'Fête nationale', 'Stage d’orchestre d’été', 'Olivet Solidarité', 'Fête de la musique', 'Commémorations', 'Concerts du Conservatoire'];
    const sym = ['eighth', 'quarter', 'sharp', 'beamed', 'flat', 'sixteenth', 'natural', 'half'];
    const one = items.map((t, i) => `<span>${esc(t)}${glyphSvg(sym[i % sym.length])}</span>`).join('');
    $('#ribbon').innerHTML = one + one;
    // prochain rendez-vous
    const { up } = splitEvents(data.events);
    const nx = up[0];
    if (nx) {
      const d = new Date(nx.starts_at);
      $('#nextEvent').innerHTML = `<div class="ev-date"><span class="d">${fmtDay(d)}</span><span class="m">${fmtMonth(d)}</span></div>
        <div><h3>${esc(nx.title)}</h3><p>${weekday(d)}, ${fmtTime(d)}${nx.place ? ' — ' + esc(nx.place) : ''}</p>${nx.description ? `<p class="muted">${esc(nx.description)}</p>` : ''}
        <a class="btn btn-bronze btn-sm" href="agenda.html">Tout l’agenda${up.length > 1 ? ` (${up.length} dates)` : ''}</a></div>`;
    } else {
      $('#nextEvent').innerHTML = `<div><p class="next-empty">Les prochaines dates de la saison seront bientôt annoncées.</p><a class="btn btn-ghost btn-sm" href="agenda.html">Voir l’agenda et les concerts passés</a></div>`;
    }
    renderPosts(data.posts);
    // cartes
    const pic = (id, url) => { const i = $(id); if (i && url) i.src = url; };
    pic('#cardOrch', (S.orchestre.photos || [])[2]);
    pic('#cardStage', (S.stage.photos || [])[0]);
    pic('#cardGal', (S.orchestre.photos || [])[1]);
    pic('#cardContact', (S.orchestre.photos || [])[0]);
    initStrings();
  };

  /* ---------- Orchestre ---------- */
  Pages.orchestre = S => {
    const notes = ['quarter', 'eighth', 'half', 'sixteenth'];
    $('#measures').innerHTML = (S.orchestre.chiffres || []).map((c, i) => `
      <div class="measure">
        ${glyphSvg(notes[i % 4], 'mnote')}
        <span class="mv" data-count="${esc(c.valeur)}">${esc(c.valeur)}</span>
        <span class="ml">${esc(c.label)}</span>
      </div>`).join('');
    $$('#measures .mnote').forEach((n, i) => { n.style.top = [6, 30, 18, 0][i % 4] + 'px'; n.style.left = '26px'; });
    // les nombres se comptent quand les mesures apparaissent
    $('#measures').addEventListener('reveal', () => {
      if (reduce) return;
      $$('#measures .mv').forEach((v, i) => {
        const raw = v.dataset.count, num = parseFloat(raw); if (isNaN(num) || !/^\d/.test(raw)) return;
        const suf = raw.replace(/^[\d.,]+/, ''), from = num > 1900 ? num - 40 : 0, t0 = performance.now() + i * 120, dur = 1300;
        const step = t => { const k = Math.min(1, Math.max(0, (t - t0) / dur)); const e = 1 - Math.pow(1 - k, 3); v.textContent = Math.round(from + (num - from) * e) + suf; if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    }, { once: true });
    $('#orchReelTrack').innerHTML = (S.orchestre.photos || []).map((u, i) =>
      `<figure><img src="${esc(u)}" alt="L’Harmonie d’Olivet, photo ${i + 1}" loading="lazy" decoding="async" data-lb="orch"></figure>`).join('');
    const d = S.direction;
    $('#dirPortrait').src = d.portrait || '';
    $('#jalons').innerHTML = (d.jalons || []).map((j, i) =>
      `<li><i class="jn" style="top:${[52, 40, 28, 16][i % 4]}px"></i><strong>${esc(j.annee)}</strong><span>${esc(j.texte)}</span></li>`).join('');
    $$('.beat path').forEach(p => { try { p.style.setProperty('--len', Math.ceil(p.getTotalLength())); } catch (e) { } });
  };

  /* ---------- Agenda ---------- */
  Pages.agenda = (S, data) => {
    const { up, past } = splitEvents(data.events);
    $('#events').innerHTML = up.map(eventHtml).join('');
    $('#eventsEmpty').hidden = up.length > 0;
    if (G.fermata) $('#fermataPath').setAttribute('d', G.fermata.d);
    if (S.contact.facebook) $('#agendaFb').href = S.contact.facebook;
    $('#pastWrap').hidden = !past.length;
    $('#pastEvents').innerHTML = past.slice(0, 20).map(eventHtml).join('');
  };

  /* ---------- Actualités ---------- */
  Pages.actualites = (S, data) => renderPosts(data.posts);

  /* ---------- Stage ---------- */
  Pages.stage = S => {
    renderSeating(S);
    const a = $('#stageInscription');
    if (S.stage.inscription_url) a.href = S.stage.inscription_url;
    else { a.href = 'contact.html?sujet=stage'; a.removeAttribute('target'); a.textContent = 'Demander une inscription'; }
    $('#stageAffiche').hidden = !S.stage.affiche;
    $('#stageAffiche').onclick = () => Lightbox.open([{ src: S.stage.affiche, cap: S.stage.titre + ' — ' + (S.stage.edition || '') }], 0);
    $('#stagePhotos').innerHTML = (S.stage.photos || []).slice(0, 8).map((u, i) => `<figure><img src="${esc(u)}" alt="Stage d’orchestre, photo ${i + 1}" loading="lazy" decoding="async" data-lb="stage"></figure>`).join('');
  };

  function renderSeating(S) {
    const svg = $('#seating');
    const list = (S.stage.effectif || []).filter(x => +x.places > 0);
    const total = list.reduce((s, x) => s + (+x.places || 0), 0);
    $('#seatTotal').textContent = total;
    const cx = 450, cy = 480;
    const rings = [[110, 190], [200, 290], [300, 400]];
    const perRing = [[], [], []];
    list.forEach((x, i) => { const r = i < Math.ceil(list.length / 3) ? 0 : i < Math.ceil(2 * list.length / 3) ? 1 : 2; perRing[r].push(x); });
    const arc = (r1, r2, a1, a2) => {
      const p = (r, a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
      const [x1, y1] = p(r2, a1), [x2, y2] = p(r2, a2), [x3, y3] = p(r1, a2), [x4, y4] = p(r1, a1);
      return `M${x1} ${y1} A${r2} ${r2} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`;
    };
    let html = svg.querySelector('title').outerHTML, k = 0;
    perRing.forEach((ring, ri) => {
      const [r1, r2] = rings[ri];
      const sum = ring.reduce((s, x) => s + (+x.places), 0) || 1;
      let a = Math.PI - 0.06; const span = Math.PI - 0.12;
      ring.forEach(x => {
        const w = span * (+x.places) / sum, a1 = a, a2 = a - w + 0.025;
        const mid = (a1 + a2) / 2, rm = (r1 + r2) / 2;
        const lx = cx + rm * Math.cos(mid), ly = cy - rm * Math.sin(mid);
        const n = +x.places; let dots = '';
        for (let j = 0; j < n; j++) {
          const t = (j + .5) / n, aa = a1 - (a1 - a2) * t, rr = r1 + (r2 - r1) * (0.22 + 0.56 * ((j % 2) ? .25 : .75));
          dots += `<circle class="seat-dot" r="3.2" cx="${(cx + rr * Math.cos(aa)).toFixed(1)}" cy="${(cy - rr * Math.sin(aa)).toFixed(1)}"/>`;
        }
        html += `<g class="seat" data-name="${esc(x.pupitre)}" data-n="${n}" tabindex="0" style="--d:${k++}">
          <path class="seat-arc" d="${arc(r1, r2, a1, a2)}"/><g class="seat-dots">${dots}</g>
          <text class="seat-label" x="${lx.toFixed(1)}" y="${(ly - 2).toFixed(1)}" text-anchor="middle">${esc(x.pupitre)}</text>
          <text class="seat-count" x="${lx.toFixed(1)}" y="${(ly + 16).toFixed(1)}" text-anchor="middle">${n}</text></g>`;
        a -= w;
      });
    });
    html += `<rect class="podium" x="${cx - 34}" y="${cy - 8}" width="68" height="8" rx="2"/><text class="seat-label" style="opacity:1" x="${cx}" y="${cy + 26}" text-anchor="middle">Chef</text>`;
    svg.innerHTML = html;
    const hover = $('#seatHover');
    $$('.seat', svg).forEach(g => {
      const on = () => { $$('.seat-arc', svg).forEach(p => p.classList.remove('on')); g.querySelector('.seat-arc').classList.add('on'); hover.textContent = `${g.dataset.name} : ${g.dataset.n} places`; Sound.instrument(g.dataset.name); };
      g.addEventListener('mouseenter', on); g.addEventListener('focus', on);
    });
  }

  /* ---------- Galerie ---------- */
  Pages.galerie = (S, data) => {
    const media = data.media;
    const score = d => { const m = String(d).toLowerCase().match(/([a-zéû]+)\s+(\d{4})/); return m ? +m[2] * 12 + Math.max(0, MONTHS.indexOf(m[1])) : 0; };
    const byAlbum = new Map();
    media.filter(m => m.kind === 'photo').forEach(m => {
      const k = m.album || 'divers';
      if (!byAlbum.has(k)) byAlbum.set(k, { title: m.album_title || 'Photos', date: m.album_date || '', items: [] });
      byAlbum.get(k).items.push(m);
    });
    const lists = {
      photo: [...byAlbum.values()].sort((a, b) => score(b.date) - score(a.date)),
      visuel: media.filter(m => m.kind === 'visuel'),
      presse: media.filter(m => m.kind === 'presse')
    };
    let tab = 'photo', shown = 0;
    const PAGE_N = { photo: 12, visuel: 24, presse: 24 };
    const grid = $('#gallery'), more = $('#galleryMore');
    const show = t => {
      tab = t; shown = 0; grid.innerHTML = '';
      $$('.tabs [role=tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
      const u = new URL(location); u.searchParams.set('type', t === 'photo' ? 'photos' : t === 'visuel' ? 'affiches' : 'presse'); history.replaceState(null, '', u);
      add();
    };
    const add = () => {
      const L = lists[tab], from = shown, to = Math.min(L.length, from + PAGE_N[tab]);
      grid.insertAdjacentHTML('beforeend', L.slice(from, to).map((x, i) => tab === 'photo'
        ? `<button class="album" type="button" data-i="${from + i}"><div class="stack">${x.items.slice(0, 3).map(m => `<img src="${esc(m.thumb_url || m.image_url)}" alt="" loading="lazy" decoding="async">`).join('')}</div><h3>${esc(x.title)}</h3><span>${esc(x.date)} · ${x.items.length} photo${x.items.length > 1 ? 's' : ''}</span></button>`
        : `<button class="tile ${tab === 'presse' ? 'press' : ''}" type="button" data-i="${from + i}"><img src="${esc(x.thumb_url || x.image_url)}" alt="${esc(x.title || '')}" loading="lazy" decoding="async"><span>${esc(x.title || '')}</span></button>`).join(''));
      shown = to; more.hidden = shown >= L.length;
    };
    grid.addEventListener('click', e => {
      const b = e.target.closest('[data-i]'); if (!b) return; const i = +b.dataset.i;
      if (tab === 'photo') { const a = lists.photo[i]; Lightbox.open(a.items.map(m => ({ src: m.image_url, cap: `${a.title} — ${a.date}` })), 0); }
      else Lightbox.open(lists[tab].map(m => ({ src: m.image_url, cap: m.title || '' })), i);
    });
    $$('.tabs [role=tab]').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
    more.addEventListener('click', add);
    const want = new URLSearchParams(location.search).get('type');
    show(want === 'affiches' ? 'visuel' : want === 'presse' ? 'presse' : 'photo');
  };

  /* ---------- Contact ---------- */
  Pages.contact = S => {
    const c = S.contact;
    const e = $('#contactEmail'); e.textContent = c.email || ''; e.href = 'mailto:' + (c.email || '');
    if (c.telephone) { $('#contactPhoneWrap').hidden = false; const p = $('#contactPhone'); p.textContent = c.telephone; p.href = 'tel:' + c.telephone.replace(/\s/g, ''); }
    if (c.carte_lat && c.carte_lng) {
      const lat = +c.carte_lat, lng = +c.carte_lng, d = .012;
      $('#map').innerHTML = `<iframe title="Carte : Olivet" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d * .6}%2C${lng + d}%2C${lat + d * .6}&amp;layer=mapnik&amp;marker=${lat}%2C${lng}"></iframe>`;
    }
    const sujet = new URLSearchParams(location.search).get('sujet');
    const map = { rejoindre: 'Rejoindre l’orchestre', stage: 'Stage d’été', concert: 'Inviter l’Harmonie pour un concert' };
    if (map[sujet]) $('#cSubject').value = map[sujet];
    const f = $('#contactForm'), st = $('#formStatus');
    f.addEventListener('submit', async ev => {
      ev.preventDefault(); st.className = 'form-status';
      if (f.website.value) return; // pot de miel anti-robots
      const name = f.name.value.trim(), email = f.email.value.trim(), body = f.body.value.trim();
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !body) { st.textContent = 'Indiquez votre nom, une adresse e-mail valide et votre message.'; st.classList.add('err'); return; }
      const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Envoi…';
      try {
        if (!sb) throw new Error('offline');
        const { error } = await sb.from('messages').insert({ name, email, subject: f.subject.value, body });
        if (error) throw error;
        f.reset(); st.textContent = 'Message envoyé. Nous vous répondrons rapidement.'; st.classList.add('ok'); Sound.chord();
      } catch (err) {
        st.innerHTML = `L’envoi n’a pas abouti. Écrivez-nous directement à <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>.`; st.classList.add('err');
      }
      btn.disabled = false; btn.textContent = 'Envoyer le message';
    });
  };

  /* ---------------- Portée animée de l'accueil (canvas) ---------------- */
  function initStrings() {
    const cv = $('#strings'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const slow = (navigator.hardwareConcurrency || 8) <= 4;
    let W = 0, H = 0, dpr = 1, lines = [], notes = [], mouse = { x: -1e4, y: -1e4, vy: 0 }, visible = true, t = 0, grad = null;
    const N = 5, SEG = slow ? 40 : 56;
    const paths = {};
    ['quarter', 'eighth', 'sixteenth', 'half', 'sharp', 'flat'].forEach(k => { if (G[k]) paths[k] = new Path2D(G[k].d); });
    const kinds = Object.keys(paths);
    // portée calée sur la clé de sol (interligne = 250 unités de la police)
    let GAP = 24, TOP = 300;
    function layout() {
      const svg = $('#heroClef'); const c = cv.getBoundingClientRect(); const r = svg.getBoundingClientRect(); const vb = svg.viewBox.baseVal;
      if (r.height > 0 && vb && vb.height) { const unit = r.height / vb.height; GAP = 250 * unit; TOP = r.top - c.top + (-1000 - vb.y) * unit; }
      else { GAP = Math.max(16, H * .05); TOP = H * .45; }
    }
    function resize() {
      dpr = Math.min(slow ? 1 : 1.5, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
      layout();
      grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, 'rgba(172,146,119,0)'); grad.addColorStop(.1, 'rgba(172,146,119,.42)'); grad.addColorStop(.85, 'rgba(217,196,163,.32)'); grad.addColorStop(1, 'rgba(217,196,163,0)');
      lines = Array.from({ length: N }, () => Array.from({ length: SEG + 1 }, () => ({ y: 0, v: 0 })));
    }
    const spawn = (x, step, kind) => notes.push({ x: x ?? -200, step: step ?? Math.floor(Math.random() * 11) - 1, kind: kind || kinds[Math.floor(Math.random() * kinds.length)], life: 0, speed: .25 + Math.random() * .35, wob: Math.random() * 6.28, alpha: 0 });
    let running = false;
    function frame() {
      if (!visible || document.hidden) { running = false; return; }
      requestAnimationFrame(frame);
      t += 1 / 60;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const g = GAP, y0 = TOP;
      ctx.strokeStyle = grad; ctx.lineWidth = 1;
      for (let li = 0; li < N; li++) {
        const L = lines[li]; const baseY = y0 + li * g;
        for (let i = 0; i <= SEG; i++) {
          const p = L[i]; const x = i / SEG * W; const dy = baseY + p.y - mouse.y;
          if (dy < 90 && dy > -90) { const dx = x - mouse.x; if (dx < 90 && dx > -90) { const dist = Math.sqrt(dx * dx + dy * dy); if (dist < 90) p.v += mouse.vy * .06 * (1 - dist / 90); } }
          const left = i > 0 ? L[i - 1].y : 0, right = i < SEG ? L[i + 1].y : 0;
          p.v += (left + right - 2 * p.y) * .18 - p.y * .012; p.v *= .955;
        }
        ctx.beginPath();
        for (let i = 0; i <= SEG; i++) {
          L[i].y += L[i].v;
          const x = i / SEG * W, y = baseY + L[i].y + Math.sin(i * .12 + t * 1.1 + li * .7) * 2.2 * Math.sin(i / SEG * Math.PI);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      if (!reduce && notes.length < 3 && Math.random() < .006) spawn();
      for (let k = notes.length - 1; k >= 0; k--) {
        const n = notes[k]; n.x += n.speed; n.life++;
        n.alpha = Math.min(1, n.alpha + .02) * (n.x > W - 80 ? Math.max(0, (W - n.x) / 80) : 1);
        if (n.x > W + 40) { notes.splice(k, 1); continue; }
        const li = N - 1 - Math.max(0, Math.min(N - 1, Math.round(n.step / 2)));
        const seg = Math.max(0, Math.min(SEG, Math.round(n.x / W * SEG)));
        const yy = y0 + (8 - n.step) * g / 2 + lines[li][seg].y + Math.sin(t * 2 + n.wob) * 1.2;
        const s = g / 250, gb = G[n.kind].bb;
        ctx.save(); ctx.globalAlpha = n.alpha * (n.user ? .9 : .38); ctx.translate(n.x, yy); ctx.scale(s, s);
        ctx.translate(-gb[0], -(gb[1] + gb[3]) + 130);
        ctx.fillStyle = n.kind === 'sharp' || n.kind === 'flat' ? '#7d6750' : '#d9c4a3';
        ctx.fill(paths[n.kind]); ctx.restore();
        if (n.life % 6 === 0) lines[li][seg].v += .25;
      }
    }
    const wake = () => { if (visible && !running && !document.hidden) { running = true; requestAnimationFrame(frame); } };
    resize(); addEventListener('resize', resize);
    const hero = $('#ouverture');
    hero.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
      mouse.vy = Math.max(-40, Math.min(40, y - mouse.y)); mouse.x = x; mouse.y = y;
    });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
    hero.addEventListener('click', e => {
      if (e.target.closest('a,button')) return;
      const r = cv.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
      const st = Math.max(-2, Math.min(10, Math.round(8 - (y - TOP) / (GAP / 2))));
      spawn(x, st, ['quarter', 'eighth', 'sixteenth'][Math.floor(Math.random() * 3)]); notes[notes.length - 1].user = true;
      const li = N - 1 - Math.max(0, Math.min(N - 1, Math.round(st / 2))); const seg = Math.round(x / W * SEG);
      for (let i = -5; i <= 5; i++) { const q = lines[li][seg + i]; if (q) q.v += 7 * (1 - Math.abs(i) / 6); }
      Sound.playStep(st);
    });
    for (let i = 0; i < 2; i++) spawn(cv.clientWidth * (.45 + i * .3));
    new IntersectionObserver(([en]) => { visible = en.intersectionRatio > .15; wake(); }, { threshold: [0, .15, .3] }).observe(hero);
    document.addEventListener('visibilitychange', wake);
    wake();
  }

  /* ---------------- Démarrage ---------------- */
  async function start() {
    initHeader();
    Sound.init();
    Lightbox.init();
    const pt = $('.page-title');
    if (pt && !pt.dataset.k) dropLetters(pt); // titre fixe : animé tout de suite
    const data = await loadData();
    const S = data.settings;
    bindTexts(S);
    if (pt && pt.dataset.k) dropLetters(pt); // titre modifiable : animé une fois le texte chargé
    $$('.page-title[data-k], .hero-title[data-k]').forEach(t => t.classList.add('ready'));
    renderFooter(S);
    try { (Pages[PAGE] || (() => { }))(S, data); } catch (e) { console.error(e); }
    initReveal();
  }
  start();
})();
