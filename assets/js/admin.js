/* ==========================================================
   Harmonie d'Olivet — administration du contenu
   ========================================================== */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const C = window.HO_CONFIG, D = window.HO_DEFAULTS;
  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'implicit' } });
  const pageUrl = location.origin + location.pathname;

  /* ---------- utilitaires ---------- */
  let toastT;
  function toast(msg, err = false) {
    const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200);
  }
  const fail = (e, what = 'L’opération') => { console.error(e); toast(`${what} n’a pas abouti : ${e.message || e}`, true); };
  const h = html => document.createRange().createContextualFragment(html);

  async function resizeImage(file, max = 2000, q = .85) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { blob: file, ext: (file.name.split('.').pop() || 'bin').toLowerCase(), type: file.type };
    const bm = await createImageBitmap(file);
    const sc = Math.min(1, max / Math.max(bm.width, bm.height));
    const w = Math.round(bm.width * sc), hgt = Math.round(bm.height * sc);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = hgt;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, hgt); ctx.drawImage(bm, 0, 0, w, hgt);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', q));
    return { blob, ext: 'jpg', type: 'image/jpeg', w, h: hgt };
  }
  const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'fichier';
  async function upload(file, folder = 'uploads') {
    const r = await resizeImage(file);
    const d = new Date();
    const path = `${folder}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${Date.now().toString(36)}-${slug(file.name.replace(/\.\w+$/, ''))}.${r.ext}`;
    const { error } = await sb.storage.from(C.storageBucket).upload(path, r.blob, { contentType: r.type, cacheControl: '31536000', upsert: false });
    if (error) throw error;
    return { url: sb.storage.from(C.storageBucket).getPublicUrl(path).data.publicUrl, w: r.w, h: r.h };
  }
  function pickFiles(multiple = false) {
    return new Promise(res => {
      const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = multiple;
      i.onchange = () => res([...i.files]); i.click();
    });
  }

  /* ---------- authentification ---------- */
  const authMsg = (t, ok = false) => { const m = $('#authMsg'); m.textContent = t; m.className = 'msg ' + (t ? (ok ? 'ok' : 'err') : ''); };
  function showAuth(form) {
    $('#app').hidden = true; $('#auth').hidden = false;
    ['loginForm', 'forgotForm', 'newPassForm'].forEach(id => { $('#' + id).hidden = id !== form; });
  }
  $('#showForgot').onclick = () => { showAuth('forgotForm'); authMsg(''); $('#forgotForm').email.value = $('#loginForm').email.value; };
  $('#showLogin').onclick = () => { showAuth('loginForm'); authMsg(''); };

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target; const b = f.querySelector('button[type=submit]'); b.disabled = true; authMsg('');
    const { error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
    b.disabled = false;
    if (error) authMsg(error.message === 'Invalid login credentials' ? 'E-mail ou mot de passe incorrect.' : error.message);
  });
  $('#forgotForm').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target; const b = f.querySelector('button[type=submit]'); b.disabled = true;
    const { error } = await sb.auth.resetPasswordForEmail(f.email.value.trim(), { redirectTo: pageUrl });
    b.disabled = false;
    if (error) authMsg(error.message); else authMsg('Si cette adresse correspond à un compte, un e-mail vient d’être envoyé. Pensez à vérifier les indésirables.', true);
  });
  $('#newPassForm').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    if (f.p1.value !== f.p2.value) return authMsg('Les deux mots de passe ne correspondent pas.');
    if (f.p1.value.length < 8) return authMsg('Le mot de passe doit contenir au moins 8 caractères.');
    const b = f.querySelector('button[type=submit]'); b.disabled = true;
    const { error } = await sb.auth.updateUser({ password: f.p1.value });
    b.disabled = false;
    if (error) return authMsg(error.message);
    recovering = false; history.replaceState(null, '', pageUrl);
    toast('Mot de passe enregistré.'); enter();
  });
  $('#logout').onclick = async () => { await sb.auth.signOut(); location.replace(pageUrl); };

  let recovering = /type=recovery/.test(location.hash) || /type=(recovery|invite)/.test(location.search);
  let entered = false;
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === 'PASSWORD_RECOVERY') { recovering = true; showAuth('newPassForm'); authMsg(''); return; }
    if (ev === 'SIGNED_OUT') { entered = false; showAuth('loginForm'); return; }
    if (session && !recovering && (ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION')) enter();
    if (!session && ev === 'INITIAL_SESSION') showAuth(recovering ? 'loginForm' : 'loginForm');
    if (session && recovering) showAuth('newPassForm');
  });
  const hashErr = new URLSearchParams(location.hash.slice(1)).get('error_description');
  if (hashErr) { showAuth('forgotForm'); authMsg('Le lien n’est plus valide (' + hashErr + '). Demandez-en un nouveau ci-dessous.'); }

  async function enter() {
    if (entered) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return showAuth('loginForm');
    const { data: isAdmin, error } = await sb.rpc('is_admin');
    if (error || !isAdmin) { showAuth('loginForm'); authMsg('Ce compte n’a pas les droits d’administration.'); await sb.auth.signOut(); return; }
    entered = true;
    $('#who').textContent = user.email;
    $('#auth').hidden = true; $('#app').hidden = false;
    route(location.hash.replace('#', '') || 'textes');
    refreshBadge();
  }

  /* ---------- navigation ---------- */
  $$('#sideNav button').forEach(b => b.addEventListener('click', () => route(b.dataset.view)));
  function route(v) {
    if (!Views[v]) v = 'textes';
    $$('#sideNav button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    if (!recovering) history.replaceState(null, '', '#' + v);
    $('#view').innerHTML = '<p class="muted">Chargement…</p>';
    Views[v]().catch(e => fail(e, 'Le chargement'));
    window.scrollTo(0, 0);
  }
  async function refreshBadge() {
    const { count } = await sb.from('messages').select('id', { count: 'exact', head: true }).eq('read', false);
    const b = $('#msgBadge'); b.hidden = !count; b.textContent = count || '';
  }

  /* ---------- champs génériques ---------- */
  const SCHEMA = {
    hero: { titre: 'Ouverture (haut de page)', fields: [['surtitre', 'Surtitre'], ['titre', 'Titre principal'], ['accroche', 'Accroche', 'textarea'], ['image', 'Photo de fond', 'image'], ['bouton', 'Texte du bouton 1'], ['bouton2', 'Texte du bouton 2']] },
    orchestre: { titre: 'L’orchestre', fields: [['titre', 'Titre'], ['intro', 'Phrase d’introduction', 'textarea'], ['texte', 'Texte (une ligne vide entre deux paragraphes)', 'long'], ['chiffres', 'Chiffres clés', 'pairs', ['valeur', 'Valeur'], ['label', 'Libellé']], ['repetitions', 'Répétitions (jour et horaire)'], ['lieu_repetitions', 'Lieu des répétitions'], ['adhesion', 'Adhésion', 'textarea'], ['photos', 'Photos défilantes', 'images']] },
    direction: { titre: 'Direction musicale', fields: [['titre', 'Titre'], ['nom', 'Nom'], ['role', 'Fonction'], ['portrait', 'Portrait', 'image'], ['texte', 'Biographie', 'long'], ['jalons', 'Parcours (dates clés)', 'pairs', ['annee', 'Année'], ['texte', 'Texte']]] },
    stage: { titre: 'Stage d’été', fields: [['titre', 'Titre'], ['edition', 'Édition (ex. Édition 2027)'], ['intro', 'Présentation', 'long'], ['dates', 'Dates'], ['direction', 'Direction'], ['lieu_stage', 'Lieu du stage'], ['lieu_concert', 'Lieu du concert'], ['horaires', 'Une journée type', 'textarea'], ['tarif', 'Tarif'], ['tarif_reduit', 'Tarif réduit'], ['conditions', 'Conditions', 'textarea'], ['inscription_url', 'Lien d’inscription (laisser vide pour masquer le bouton)'], ['affiche', 'Affiche', 'image'], ['effectif', 'Effectif par pupitre', 'pairs', ['pupitre', 'Pupitre'], ['places', 'Places', 'number']], ['photos', 'Photos du stage', 'images']] },
    contact: { titre: 'Contact', fields: [['titre', 'Titre'], ['intro', 'Introduction', 'textarea'], ['adresse', 'Adresse postale', 'textarea'], ['email', 'E-mail affiché'], ['telephone', 'Téléphone (facultatif)'], ['facebook', 'Page Facebook'], ['twitter', 'Compte X / Twitter'], ['instagram', 'Compte Instagram'], ['carte_lat', 'Carte : latitude', 'number'], ['carte_lng', 'Carte : longitude', 'number']] },
    partenaires: { titre: 'Partenaires (pied de page)', fields: [['liste', 'Partenaires', 'pairs', ['nom', 'Nom'], ['url', 'Lien']]] }
  };

  function imageField(name, label, val) {
    return `<div class="full"><label>${esc(label)}</label><div class="imgfield" data-img="${name}">
      <img class="pv" src="${esc(val || '')}" alt="">
      <div class="stack"><input name="${name}" value="${esc(val || '')}" placeholder="Adresse de l’image">
      <div class="row"><button class="btn small" type="button" data-up>Téléverser une image</button></div></div></div></div>`;
  }
  function wireImageFields(root) {
    $$('[data-img]', root).forEach(w => {
      const inp = $('input', w), pv = $('.pv', w);
      inp.addEventListener('input', () => { pv.src = inp.value; });
      $('[data-up]', w).onclick = async e => {
        const [f] = await pickFiles(); if (!f) return;
        const b = e.target; b.disabled = true; b.textContent = 'Envoi…';
        try { const { url } = await upload(f); inp.value = url; pv.src = url; toast('Image téléversée. Pensez à enregistrer.'); } catch (er) { fail(er, 'Le téléversement'); }
        b.disabled = false; b.textContent = 'Téléverser une image';
      };
    });
  }

  /* ---------- Vue : textes ---------- */
  const Views = {};
  Views.textes = async () => {
    const { data, error } = await sb.from('settings').select('key,value,updated_at');
    if (error) throw error;
    const S = {}; (data || []).forEach(r => { S[r.key] = r; });
    const v = $('#view');
    v.innerHTML = `<div class="view-head"><div><h1>Textes du site</h1><p>Chaque bloc correspond à une section de la page. Enregistrez bloc par bloc.</p></div></div>`;
    Object.entries(SCHEMA).forEach(([key, sch], idx) => {
      const val = Object.assign({}, D[key] || {}, (S[key] && S[key].value) || {});
      const card = h(`<details class="card" ${idx === 0 ? 'open' : ''}><summary><h2>${esc(sch.titre)}</h2></summary><form class="grid" data-key="${key}"></form></details>`);
      const form = $('form', card);
      sch.fields.forEach(([name, label, type, a, b]) => {
        const x = val[name];
        if (type === 'image') form.append(h(imageField(name, label, x)));
        else if (type === 'images') {
          form.append(h(`<div class="full"><label>${esc(label)}</label><div class="imglist" data-images="${name}"></div><div class="actions"><button class="btn small" type="button" data-addimgs="${name}">Ajouter des photos</button></div></div>`));
        } else if (type === 'pairs') {
          form.append(h(`<div class="full"><label>${esc(label)}</label><div class="rowlist" data-pairs="${name}" data-a="${a[0]}" data-b="${b[0]}" data-bt="${b[2] || 'text'}" data-al="${esc(a[1])}" data-bl="${esc(b[1])}"></div><div class="actions"><button class="btn small" type="button" data-addrow="${name}">Ajouter une ligne</button></div></div>`));
        } else if (type === 'textarea' || type === 'long') {
          form.append(h(`<label class="full">${esc(label)}<textarea name="${name}" class="${type === 'long' ? 'long' : ''}">${esc(x)}</textarea></label>`));
        } else {
          form.append(h(`<label class="${['titre', 'nom', 'role', 'dates', 'tarif', 'email', 'telephone', 'carte_lat', 'carte_lng', 'bouton', 'bouton2', 'edition', 'tarif_reduit', 'direction'].includes(name) ? '' : 'full'}">${esc(label)}<input name="${name}" ${type === 'number' ? 'type="number" step="any"' : ''} value="${esc(x)}"></label>`));
        }
      });
      form.append(h(`<div class="full actions"><button class="btn primary" type="submit">Enregistrer « ${esc(sch.titre)} »</button><span class="muted" data-upd>${S[key] ? 'Modifié le ' + new Date(S[key].updated_at).toLocaleString('fr-FR') : ''}</span></div>`));
      v.append(card);

      // listes d'images
      $$('[data-images]', form).forEach(box => {
        let list = [...(val[box.dataset.images] || [])];
        const draw = () => {
          box.innerHTML = list.map((u, i) => `<div class="it"><img src="${esc(u)}" alt=""><button class="x" type="button" data-i="${i}" title="Retirer">×</button><div class="mv"><button type="button" data-l="${i}" title="Avant">‹</button><button type="button" data-r="${i}" title="Après">›</button></div></div>`).join('') || '<p class="muted">Aucune photo.</p>';
          $$('.x', box).forEach(b => b.onclick = () => { list.splice(+b.dataset.i, 1); draw(); });
          $$('[data-l]', box).forEach(b => b.onclick = () => { const i = +b.dataset.l; if (i > 0) { [list[i - 1], list[i]] = [list[i], list[i - 1]]; draw(); } });
          $$('[data-r]', box).forEach(b => b.onclick = () => { const i = +b.dataset.r; if (i < list.length - 1) { [list[i + 1], list[i]] = [list[i], list[i + 1]]; draw(); } });
        };
        box._get = () => list; draw();
        $(`[data-addimgs="${box.dataset.images}"]`, form).onclick = async e => {
          const files = await pickFiles(true); if (!files.length) return;
          e.target.disabled = true;
          for (const f of files) { try { list.push((await upload(f)).url); draw(); } catch (er) { fail(er, 'Le téléversement'); } }
          e.target.disabled = false; toast('Photos ajoutées. Pensez à enregistrer.');
        };
      });
      // listes de paires
      $$('[data-pairs]', form).forEach(box => {
        const A = box.dataset.a, B = box.dataset.b, numeric = box.dataset.bt === 'number';
        const addRow = (o = {}) => {
          const r = h(`<div class="r"><input placeholder="${box.dataset.al}" data-a value="${esc(o[A])}"><input placeholder="${box.dataset.bl}" data-b ${numeric ? 'type="number" min="0"' : ''} value="${esc(o[B])}"><button type="button" title="Supprimer la ligne">×</button></div>`);
          const el = r.firstElementChild; $('button', el).onclick = () => el.remove(); box.append(r);
        };
        (val[box.dataset.pairs] || []).forEach(addRow);
        box._get = () => $$('.r', box).map(r => ({ [A]: $('[data-a]', r).value.trim(), [B]: numeric ? +$('[data-b]', r).value || 0 : $('[data-b]', r).value.trim() })).filter(o => o[A]);
        $(`[data-addrow="${box.dataset.pairs}"]`, form).onclick = () => addRow();
      });
      wireImageFields(form);

      form.addEventListener('submit', async e => {
        e.preventDefault();
        const out = Object.assign({}, (S[key] && S[key].value) || {});
        sch.fields.forEach(([name, , type]) => {
          if (type === 'images') out[name] = $(`[data-images="${name}"]`, form)._get();
          else if (type === 'pairs') out[name] = $(`[data-pairs="${name}"]`, form)._get();
          else { const el = form.elements[name]; out[name] = type === 'number' ? (el.value === '' ? null : +el.value) : el.value.trim(); }
        });
        const b = $('button[type=submit]', form); b.disabled = true;
        const { error: er } = await sb.from('settings').upsert({ key, value: out, updated_at: new Date().toISOString() });
        b.disabled = false;
        if (er) return fail(er, 'L’enregistrement');
        S[key] = { value: out, updated_at: new Date().toISOString() };
        $('[data-upd]', form).textContent = 'Enregistré à l’instant';
        toast('« ' + sch.titre + ' » enregistré.');
      });
    });
  };

  /* ---------- Vue : agenda & actualités (CRUD) ---------- */
  function crudView(cfg) {
    return async () => {
      const { data, error } = await sb.from(cfg.table).select('*').order(cfg.order, { ascending: cfg.asc });
      if (error) throw error;
      const v = $('#view');
      v.innerHTML = `<div class="view-head"><div><h1>${cfg.title}</h1><p>${cfg.sub}</p></div><button class="btn primary" type="button" id="addItem">${cfg.addLabel}</button></div>
        <div class="card">${data.length ? `<table class="table"><thead><tr><th></th>${cfg.cols.map(c => `<th>${c[1]}</th>`).join('')}<th></th></tr></thead><tbody></tbody></table>` : `<p class="empty">${cfg.empty}</p>`}</div>`;
      const tb = $('tbody', v);
      data.forEach(row => {
        const tmp = document.createElement('tbody');
        tmp.innerHTML = `<tr class="${row.published ? '' : 'off'}"><td>${row.image_url ? `<img src="${esc(row.image_url)}" alt="">` : ''}</td>${cfg.cols.map(c => `<td>${c[2](row)}</td>`).join('')}
          <td><div class="row-actions"><button class="btn small" data-edit>Modifier</button><button class="btn small danger" data-del>Supprimer</button></div></td></tr>`;
        const tr = tmp.firstElementChild;
        $('[data-edit]', tr).onclick = () => editor(row);
        $('[data-del]', tr).onclick = async () => {
          if (!confirm(`Supprimer « ${row.title} » ? Cette action est définitive.`)) return;
          const { error: er } = await sb.from(cfg.table).delete().eq('id', row.id);
          if (er) return fail(er, 'La suppression'); toast('Supprimé.'); Views[cfg.view]();
        };
        tb.append(tr);
      });
      $('#addItem').onclick = () => editor(null);

      function editor(row) {
        const r = row || cfg.blank();
        const m = h(`<div class="modal"><div class="card"><h2>${row ? 'Modifier' : cfg.addLabel}</h2><form class="grid">${cfg.form(r)}
          <label class="full" style="display:flex;gap:8px;align-items:center;font-weight:500"><input type="checkbox" name="published" style="width:auto" ${r.published ? 'checked' : ''}> Visible sur le site</label>
          <div class="full actions"><button class="btn primary" type="submit">Enregistrer</button><button class="btn" type="button" data-cancel>Annuler</button></div></form></div></div>`).firstElementChild;
        document.body.append(m);
        const f = $('form', m); wireImageFields(f);
        $('[data-cancel]', m).onclick = () => m.remove();
        m.addEventListener('click', e => { if (e.target === m) m.remove(); });
        f.addEventListener('submit', async e => {
          e.preventDefault();
          let payload;
          try { payload = cfg.read(f); } catch (er) { return toast(er.message, true); }
          payload.published = f.elements.published.checked;
          const b = $('button[type=submit]', f); b.disabled = true;
          const q = row ? sb.from(cfg.table).update(payload).eq('id', row.id) : sb.from(cfg.table).insert(payload);
          const { error: er } = await q; b.disabled = false;
          if (er) return fail(er, 'L’enregistrement');
          m.remove(); toast('Enregistré.'); Views[cfg.view]();
        });
        $('input,textarea', f).focus();
      }
    };
  }
  const pad = n => String(n).padStart(2, '0');
  const isoLocal = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  Views.agenda = crudView({
    view: 'agenda', table: 'events', order: 'starts_at', asc: false, title: 'Agenda', sub: 'Les concerts à venir apparaissent sur le site ; les concerts passés sont regroupés sous « Concerts passés ».',
    addLabel: 'Ajouter un concert', empty: 'Aucun concert pour l’instant. Ajoutez le premier.',
    cols: [['date', 'Date', r => { const d = new Date(r.starts_at); return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} ${d < new Date() ? '<span class="pill past">passé</span>' : ''}`; }],
      ['t', 'Concert', r => `<strong>${esc(r.title)}</strong><br><span class="muted">${esc(r.place || '')}</span>`],
      ['p', 'État', r => r.published ? '<span class="pill on">Visible</span>' : '<span class="pill">Masqué</span>']],
    blank: () => ({ title: '', starts_at: new Date(Date.now() + 7 * 864e5).setHours(20, 0, 0, 0), place: '', description: '', image_url: '', link: '', published: true }),
    form: r => { const d = new Date(r.starts_at); return `
      <label class="full">Titre<input name="title" required value="${esc(r.title)}"></label>
      <label>Date<input name="date" type="date" required value="${isoLocal(d)}"></label>
      <label>Heure<input name="time" type="time" required value="${pad(d.getHours())}:${pad(d.getMinutes())}"></label>
      <label class="full">Lieu<input name="place" value="${esc(r.place)}" placeholder="ex. L’Alliage, Olivet"></label>
      <label class="full">Description<textarea name="description">${esc(r.description)}</textarea></label>
      <label class="full">Lien (billetterie, page Facebook…) <span class="hint">facultatif</span><input name="link" type="url" value="${esc(r.link)}"></label>
      ${imageField('image_url', 'Affiche ou photo', r.image_url)}`; },
    read: f => {
      const t = f.title.value.trim(); if (!t) throw new Error('Indiquez un titre.');
      return { title: t, starts_at: new Date(`${f.date.value}T${f.time.value}`).toISOString(), place: f.place.value.trim() || null, description: f.description.value.trim() || null, link: f.link.value.trim() || null, image_url: f.image_url.value.trim() || null };
    }
  });
  Views.posts = crudView({
    view: 'posts', table: 'posts', order: 'published_at', asc: false, title: 'Actualités', sub: 'Les 7 actualités les plus récentes sont affichées sur le site, la plus récente en grand.',
    addLabel: 'Écrire une actualité', empty: 'Aucune actualité pour l’instant.',
    cols: [['d', 'Date', r => new Date(r.published_at + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })],
      ['t', 'Titre', r => `<strong>${esc(r.title)}</strong><br><span class="muted">${esc(r.author || '')}</span>`],
      ['p', 'État', r => r.published ? '<span class="pill on">Visible</span>' : '<span class="pill">Masquée</span>']],
    blank: () => ({ title: '', published_at: isoLocal(new Date()), author: '', content: '', image_url: '', published: true }),
    form: r => `
      <label class="full">Titre<input name="title" required value="${esc(r.title)}"></label>
      <label>Date<input name="published_at" type="date" required value="${esc(r.published_at)}"></label>
      <label>Auteur<input name="author" value="${esc(r.author)}"></label>
      <label class="full">Texte <span class="hint">une ligne vide entre deux paragraphes</span><textarea name="content" class="long">${esc(r.content)}</textarea></label>
      ${imageField('image_url', 'Image', r.image_url)}`,
    read: f => {
      const t = f.title.value.trim(); if (!t) throw new Error('Indiquez un titre.');
      return { title: t, published_at: f.published_at.value, author: f.author.value.trim() || null, content: f.content.value.trim() || null, image_url: f.image_url.value.trim() || null };
    }
  });

  /* ---------- Vue : galerie ---------- */
  let galTab = 'photo', galAlbum = null;
  Views.galerie = async () => {
    const { data, error } = await sb.from('media').select('*').order('sort').limit(5000);
    if (error) throw error;
    const v = $('#view');
    const seg = `<div class="seg">${[['photo', 'Albums photos'], ['visuel', 'Affiches'], ['presse', 'Presse']].map(([k, l]) => `<button type="button" data-k="${k}" class="${galTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    v.innerHTML = `<div class="view-head"><div><h1>Galerie</h1><p>${data.filter(m => m.kind === 'photo').length} photos, ${data.filter(m => m.kind === 'visuel').length} affiches, ${data.filter(m => m.kind === 'presse').length} articles de presse.</p></div>${seg}</div><div id="galBody"></div>`;
    $$('.seg button', v).forEach(b => b.onclick = () => { galTab = b.dataset.k; galAlbum = null; Views.galerie(); });
    const body = $('#galBody');

    const dropZone = (label, onFiles) => {
      const z = h(`<div class="card"><div class="drop">${label}<br><br><button class="btn" type="button">Choisir des images</button><div class="progress" hidden><i></i></div></div></div>`).firstElementChild;
      const d = $('.drop', z), pr = $('.progress', z), bar = $('i', pr);
      const go = async files => {
        files = files.filter(f => f.type.startsWith('image/')); if (!files.length) return;
        pr.hidden = false; let n = 0;
        for (const f of files) { try { await onFiles(f, n); } catch (er) { fail(er, 'Le téléversement de ' + f.name); } n++; bar.style.width = (n / files.length * 100) + '%'; }
        toast(`${n} image${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}.`); Views.galerie();
      };
      $('button', z).onclick = async () => go(await pickFiles(true));
      d.addEventListener('dragover', e => { e.preventDefault(); d.classList.add('over'); });
      d.addEventListener('dragleave', () => d.classList.remove('over'));
      d.addEventListener('drop', e => { e.preventDefault(); d.classList.remove('over'); go([...e.dataTransfer.files]); });
      return z;
    };
    const thumbs = (items) => {
      const w = h(`<div class="thumbs"></div>`).firstElementChild;
      items.forEach(m => {
        const t = h(`<div class="th ${m.published ? '' : 'off'}"><img src="${esc(m.image_url)}" alt="" loading="lazy"><div class="b">
          ${m.kind === 'photo' ? '' : `<input value="${esc(m.title || '')}" placeholder="Titre" data-title>`}
          <div class="row-actions"><button class="btn small" data-vis>${m.published ? 'Masquer' : 'Afficher'}</button><button class="btn small danger" data-del title="Supprimer">Suppr.</button></div></div></div>`).firstElementChild;
        const ti = $('[data-title]', t);
        if (ti) ti.addEventListener('change', async () => { const { error: er } = await sb.from('media').update({ title: ti.value.trim() }).eq('id', m.id); er ? fail(er) : toast('Titre enregistré.'); });
        $('[data-vis]', t).onclick = async () => { const { error: er } = await sb.from('media').update({ published: !m.published }).eq('id', m.id); if (er) return fail(er); m.published = !m.published; t.classList.toggle('off', !m.published); $('[data-vis]', t).textContent = m.published ? 'Masquer' : 'Afficher'; };
        $('[data-del]', t).onclick = async () => { if (!confirm('Supprimer cette image de la galerie ?')) return; const { error: er } = await sb.from('media').delete().eq('id', m.id); if (er) return fail(er); t.remove(); toast('Image supprimée.'); };
        w.append(t);
      });
      return w;
    };

    if (galTab !== 'photo') {
      const items = data.filter(m => m.kind === galTab);
      body.append(dropZone(`Glissez ici ${galTab === 'visuel' ? 'des affiches' : 'des articles de presse'} (JPG, PNG).`, async (f, i) => {
        const { url, w, h: hh } = await upload(f, galTab === 'visuel' ? 'visuels' : 'presse');
        const { error: er } = await sb.from('media').insert({ kind: galTab, image_url: url, title: f.name.replace(/\.\w+$/, '').replace(/[-_]/g, ' '), sort: -Date.now() / 1000 + i, year: new Date().getFullYear(), width: w, height: hh });
        if (er) throw er;
      }));
      body.append(items.length ? thumbs(items) : h('<p class="empty">Rien pour l’instant.</p>'));
      return;
    }

    // albums
    const albums = new Map();
    data.filter(m => m.kind === 'photo').forEach(m => { const k = m.album || 'divers'; if (!albums.has(k)) albums.set(k, { key: k, title: m.album_title || 'Divers', date: m.album_date || '', items: [] }); albums.get(k).items.push(m); });
    if (galAlbum && albums.has(galAlbum)) {
      const a = albums.get(galAlbum);
      body.append(h(`<div class="card"><form class="grid" id="albForm"><label>Nom de l’album<input name="t" value="${esc(a.title)}"></label><label>Date (ex. juillet 2026)<input name="d" value="${esc(a.date)}"></label>
        <div class="full actions"><button class="btn primary">Enregistrer</button><button class="btn" type="button" id="albBack">← Tous les albums</button></div></form></div>`));
      $('#albBack').onclick = () => { galAlbum = null; Views.galerie(); };
      $('#albForm').onsubmit = async e => {
        e.preventDefault();
        const { error: er } = await sb.from('media').update({ album_title: e.target.t.value.trim(), album_date: e.target.d.value.trim(), title: e.target.t.value.trim() }).eq('album', a.key);
        er ? fail(er) : toast('Album enregistré.');
      };
      body.append(dropZone('Glissez ici des photos à ajouter à cet album.', async (f, i) => {
        const { url, w, h: hh } = await upload(f, 'albums/' + a.key);
        const { error: er } = await sb.from('media').insert({ kind: 'photo', image_url: url, album: a.key, album_title: a.title, album_date: a.date, title: a.title, sort: a.items.length + i, width: w, height: hh });
        if (er) throw er;
      }));
      body.append(thumbs(a.items));
      return;
    }
    body.append(h(`<div class="card"><h2>Nouvel album</h2><form class="grid" id="newAlb"><label>Nom<input name="t" required placeholder="ex. Concert de printemps 2027"></label><label>Date<input name="d" placeholder="ex. avril 2027"></label>
      <div class="full actions"><button class="btn primary">Créer et ajouter des photos</button></div></form></div>`));
    $('#newAlb').onsubmit = async e => {
      e.preventDefault(); const t = e.target.t.value.trim(); if (!t) return;
      const files = await pickFiles(true); if (!files.length) return toast('Choisissez au moins une photo pour créer l’album.', true);
      const key = slug(t) + '-' + Date.now().toString(36).slice(-4);
      toast('Envoi des photos…');
      let n = 0;
      for (const f of files) {
        try { const { url, w, h: hh } = await upload(f, 'albums/' + key); const { error: er } = await sb.from('media').insert({ kind: 'photo', image_url: url, album: key, album_title: t, album_date: e.target.d.value.trim(), title: t, sort: n, width: w, height: hh }); if (er) throw er; n++; } catch (er) { fail(er, 'Le téléversement'); }
      }
      toast(`Album créé avec ${n} photo${n > 1 ? 's' : ''}.`); galAlbum = key; Views.galerie();
    };
    const grid = h('<div class="albums"></div>').firstElementChild;
    [...albums.values()].reverse().forEach(a => {
      const b = h(`<button class="alb" type="button"><img src="${esc(a.items[0].image_url)}" alt="" loading="lazy"><div><strong>${esc(a.title)}</strong><span>${esc(a.date)} · ${a.items.length} photo${a.items.length > 1 ? 's' : ''}</span></div></button>`).firstElementChild;
      b.onclick = () => { galAlbum = a.key; Views.galerie(); };
      grid.append(b);
    });
    body.append(grid);
  };

  /* ---------- Vue : messages ---------- */
  Views.messages = async () => {
    const { data, error } = await sb.from('messages').select('*').order('created_at', { ascending: false }).limit(300);
    if (error) throw error;
    const v = $('#view');
    v.innerHTML = `<div class="view-head"><div><h1>Messages</h1><p>Messages envoyés depuis le formulaire de contact du site.</p></div></div><div class="msgs"></div>`;
    const box = $('.msgs', v);
    if (!data.length) box.innerHTML = '<p class="empty card">Aucun message reçu pour l’instant.</p>';
    data.forEach(m => {
      const el = h(`<article class="m ${m.read ? 'read' : ''}"><header><strong>${esc(m.name)} &lt;${esc(m.email)}&gt;</strong><time>${new Date(m.created_at).toLocaleString('fr-FR')}</time></header>
        <div class="subj">${esc(m.subject || 'Sans objet')}</div><p>${esc(m.body)}</p>
        <div class="actions"><a class="btn small primary" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Harmonie d’Olivet'))}">Répondre</a>
        <button class="btn small" data-read>${m.read ? 'Marquer non lu' : 'Marquer comme lu'}</button><button class="btn small danger" data-del>Supprimer</button></div></article>`).firstElementChild;
      $('[data-read]', el).onclick = async () => { const { error: er } = await sb.from('messages').update({ read: !m.read }).eq('id', m.id); if (er) return fail(er); m.read = !m.read; el.classList.toggle('read', m.read); $('[data-read]', el).textContent = m.read ? 'Marquer non lu' : 'Marquer comme lu'; refreshBadge(); };
      $('[data-del]', el).onclick = async () => { if (!confirm('Supprimer ce message ?')) return; const { error: er } = await sb.from('messages').delete().eq('id', m.id); if (er) return fail(er); el.remove(); refreshBadge(); };
      box.append(el);
    });
  };

  /* ---------- Vue : compte ---------- */
  Views.compte = async () => {
    const { data: { user } } = await sb.auth.getUser();
    const v = $('#view');
    v.innerHTML = `<div class="view-head"><div><h1>Mon compte</h1><p>${esc(user.email)}</p></div></div>
      <div class="card"><h2>Changer mon mot de passe</h2><form class="grid" id="pwForm"><label>Nouveau mot de passe<input type="password" name="p1" minlength="8" required autocomplete="new-password"></label><label>Confirmer<input type="password" name="p2" minlength="8" required autocomplete="new-password"></label><div class="full actions"><button class="btn primary">Enregistrer le mot de passe</button></div></form></div>
      <div class="card"><h2>Administrateurs</h2><p class="muted">Les adresses ci-dessous peuvent modifier le site. Pour ajouter une personne, contactez le gestionnaire technique : il faut créer son compte et ajouter son adresse à la liste des administrateurs.</p><ul id="admList"></ul></div>`;
    const { data: adm } = await sb.from('admins').select('email');
    $('#admList').innerHTML = (adm || []).map(a => `<li>${esc(a.email)}</li>`).join('');
    $('#pwForm').onsubmit = async e => {
      e.preventDefault(); const f = e.target;
      if (f.p1.value !== f.p2.value) return toast('Les deux mots de passe ne correspondent pas.', true);
      const { error: er } = await sb.auth.updateUser({ password: f.p1.value });
      if (er) return fail(er, 'Le changement de mot de passe'); f.reset(); toast('Mot de passe modifié.');
    };
  };
})();
