#!/usr/bin/env python3
"""Génère les pages HTML du site à partir d'un gabarit commun (en-tête, menu, pied de page).

Usage : python3 outils/pages.py   (depuis la racine du dépôt)
Modifier ce fichier pour changer le menu ou la structure d'une page, puis relancer.
Les textes eux-mêmes se modifient dans l'espace admin, pas ici.
"""
from pathlib import Path

VERSION = "7"
ROOT = Path(__file__).resolve().parent.parent
MEDIA = "https://kdcflcvufukagdjycwww.supabase.co/storage/v1/object/public/media/"

MENU = [
    ("accueil", "index.html", "Accueil"),
    ("orchestre", "orchestre.html", "L’orchestre"),
    ("agenda", "agenda.html", "Agenda"),
    ("actualites", "actualites.html", "Actualités"),
    ("stage", "stage.html", "Stage d’été"),
    ("galerie", "galerie.html", "Galerie"),
    ("contact", "contact.html", "Contact"),
]

LOGO = """<svg class="logo" viewBox="0 0 300 66" role="img" aria-label="Harmonie d’Olivet">
        <text x="0" y="56" class="logo-h">h</text>
        <ellipse cx="47" cy="42" rx="13" ry="14.5" class="logo-o" transform="rotate(-14 47 42)"/>
        <text x="74" y="27" class="logo-orch">Orchestre</text>
        <text x="74" y="56" class="logo-harm">Harmonie<tspan class="logo-d" dx="4">d’</tspan><tspan class="logo-ol">Olivet</tspan></text>
      </svg>"""


def page_head(title_key, title, lede_key="", lede="", extra=""):
    """Bandeau de titre des pages intérieures : titre posé sur une portée."""
    lede_html = f'<p class="page-lede" data-k="{lede_key}">{lede}</p>' if (lede_key or lede) else ""
    k = f' data-k="{title_key}"' if title_key else ""
    return f"""
    <header class="page-head">
      <div class="wrap">
        <div class="title-staff">
          <div class="page-staff" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
          <svg class="page-clef" aria-hidden="true"><use href="#g-clef"/></svg>
          <h1 class="page-title"{k}>{title}</h1>
        </div>
        {lede_html}{extra}
      </div>
    </header>"""


def layout(page, title, description, body, scripts=""):
    cur = ' class="active" aria-current="page"'
    nav = "\n".join(
        f'        <a href="{href}"{cur if key == page else ""}>{label}</a>'
        for key, href, label in MENU
    )
    foot_nav = "\n".join(f'          <a href="{href}">{label}</a>' for key, href, label in MENU)
    full_title = "Harmonie d’Olivet — Orchestre d’harmonie" if page == "accueil" else f"{title} — Harmonie d’Olivet"
    return f"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{full_title}</title>
  <meta name="description" content="{description}">
  <meta property="og:title" content="{full_title}">
  <meta property="og:description" content="{description}">
  <meta property="og:image" content="{MEDIA}thumbs/md/legacy/site/bandeau-2024.jpg">
  <meta name="theme-color" content="#000000">
  <link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://kdcflcvufukagdjycwww.supabase.co" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/site.css?v={VERSION}">
</head>
<body data-page="{page}">
  <a class="skip" href="#main">Aller au contenu</a>
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><symbol id="g-clef" viewBox="30 -1354 651 1772"><path id="g-clef-path"/></symbol></defs></svg>

  <header class="topbar{" on-hero" if page == "accueil" else ""}" id="topbar">
    <a class="brand" href="index.html" aria-label="Harmonie d’Olivet, accueil">
      {LOGO}
    </a>
    <nav class="menu" id="menu" aria-label="Navigation principale">
{nav}
    </nav>
    <div class="topbar-actions">
      <button class="sound-toggle" id="soundToggle" type="button" aria-pressed="false" title="Activer le son des notes">
        <span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="sr">Son des notes</span>
      </button>
      <button class="burger" id="burger" type="button" aria-expanded="false" aria-controls="menu"><span></span><span></span><span class="sr">Menu</span></button>
    </div>
  </header>

  <main id="main">
{body}
  </main>

  <footer class="footer">
    <div class="wrap footer-grid">
      <a class="brand" href="index.html" aria-label="Accueil">{LOGO}</a>
      <nav class="foot-nav" aria-label="Pages du site">
{foot_nav}
      </nav>
      <div class="foot-side">
        <p class="pre muted small" data-k="contact.adresse"></p>
        <div class="socials" data-socials></div>
      </div>
    </div>
    <div class="wrap foot-bottom">
      <div class="partners" id="partners"></div>
      <p class="copy">© 2003–<span id="year">2026</span> Harmonie d’Olivet · <a href="admin.html">Espace admin</a></p>
    </div>
  </footer>

  <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Visionneuse" hidden>
    <button class="lb-close" type="button" aria-label="Fermer">×</button>
    <button class="lb-prev" type="button" aria-label="Image précédente">‹</button>
    <figure><img id="lbImg" alt=""><figcaption id="lbCap"></figcaption></figure>
    <button class="lb-next" type="button" aria-label="Image suivante">›</button>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js" defer></script>
  <script src="assets/js/config.js?v={VERSION}" defer></script>
  <script src="assets/js/glyphs.js?v={VERSION}" defer></script>
  <script src="assets/js/defaults.js?v={VERSION}" defer></script>
  <script src="assets/js/site.js?v={VERSION}" defer></script>
</body>
</html>
"""


PAGES = {}

# ---------------------------------------------------------------- Accueil
PAGES["index.html"] = ("accueil", "Accueil",
    "L’Harmonie d’Olivet, orchestre d’harmonie créé en 2003 à Olivet (Loiret) : concerts, stage d’orchestre d’été, photos et contact.", f"""
    <section class="hero" id="ouverture">
      <div class="hero-bg" aria-hidden="true">
        <img id="heroImage" src="{MEDIA}thumbs/md/legacy/site/bandeau-2024.jpg" alt="" fetchpriority="high">
        <div class="spot"></div>
      </div>
      <canvas class="strings" id="strings" aria-hidden="true"></canvas>
      <svg class="hero-clef" id="heroClef" viewBox="30 -1354 651 1772" aria-hidden="true"><path id="heroClefPath"/></svg>
      <div class="hero-inner">
        <p class="hero-kicker" data-k="hero.surtitre">Orchestre d’harmonie · Olivet, Loiret</p>
        <h1 class="hero-title" data-k="hero.titre">Harmonie d’Olivet</h1>
        <p class="hero-lede" data-k="hero.accroche"></p>
        <div class="hero-cta">
          <a class="btn btn-bronze" href="agenda.html" data-k="hero.bouton">Voir l’agenda</a>
          <a class="btn btn-ghost" href="contact.html" data-k="hero.bouton2">Rejoindre l’orchestre</a>
        </div>
      </div>
    </section>

    <div class="ribbon" aria-hidden="true"><div class="ribbon-track" id="ribbon"></div></div>

    <section class="sec dark home-next">
      <div class="wrap next-grid">
        <div>
          <h2 class="sub-title">Prochain rendez-vous</h2>
          <div id="nextEvent" class="next-event"></div>
        </div>
        <div class="next-side">
          <h2 class="sub-title">Répétitions</h2>
          <p class="big-serif" data-k="orchestre.repetitions"></p>
          <p class="muted" data-k="orchestre.lieu_repetitions"></p>
          <a class="btn btn-ghost btn-sm" href="contact.html?sujet=rejoindre">Venir essayer</a>
        </div>
      </div>
    </section>

    <section class="sec paper">
      <div class="wrap">
        <div class="row-head">
          <h2 class="sub-title">Actualités</h2>
          <a class="link-more" href="actualites.html">Toutes les actualités</a>
        </div>
        <div class="posts posts-home" id="posts" data-limit="3"></div>
      </div>
    </section>

    <section class="sec dark">
      <div class="wrap">
        <h2 class="sub-title">Découvrir l’Harmonie</h2>
        <div class="cards">
          <a class="card" href="orchestre.html" data-reveal>
            <span class="card-img"><img id="cardOrch" alt="" loading="lazy" decoding="async"></span>
            <span class="card-body"><strong>L’orchestre</strong><span>Son histoire, ses chiffres et son chef.</span></span>
          </a>
          <a class="card" href="stage.html" data-reveal>
            <span class="card-img"><img id="cardStage" alt="" loading="lazy" decoding="async"></span>
            <span class="card-body"><strong>Le stage d’été</strong><span>Une semaine d’orchestre pour une centaine de musiciens.</span></span>
          </a>
          <a class="card" href="galerie.html" data-reveal>
            <span class="card-img"><img id="cardGal" alt="" loading="lazy" decoding="async"></span>
            <span class="card-body"><strong>La galerie</strong><span>Photos, affiches et articles de presse depuis 2004.</span></span>
          </a>
          <a class="card" href="contact.html" data-reveal>
            <span class="card-img"><img id="cardContact" alt="" loading="lazy" decoding="async"></span>
            <span class="card-body"><strong>Nous rejoindre</strong><span>Répétitions le mercredi soir au Conservatoire.</span></span>
          </a>
        </div>
      </div>
    </section>""")

# ---------------------------------------------------------------- Orchestre
PAGES["orchestre.html"] = ("orchestre", "L’orchestre",
    "L’Harmonie d’Olivet : histoire de l’orchestre créé en 2003, chiffres clés, répétitions et direction musicale.",
    page_head("orchestre.titre", "L’Orchestre", "orchestre.intro") + """
    <section class="sec paper">
      <div class="wrap">
        <div class="orch-grid">
          <div class="rich" data-k="orchestre.texte" data-rich data-reveal></div>
          <div class="rehearsal" data-reveal>
            <div class="rehearsal-metro" aria-hidden="true">
              <svg viewBox="0 0 120 160"><path d="M30 150 L50 20 L70 20 L90 150 Z" class="metro-body"/><g class="metro-swing"><line x1="60" y1="140" x2="60" y2="40" class="metro-arm"/><circle cx="60" cy="70" r="6" class="metro-weight"/></g></svg>
            </div>
            <div>
              <h2 class="rh-title">Répétitions</h2>
              <p class="big-serif" data-k="orchestre.repetitions"></p>
              <p data-k="orchestre.lieu_repetitions"></p>
              <p class="muted" data-k="orchestre.adhesion"></p>
              <a class="btn btn-bronze btn-sm" href="contact.html?sujet=rejoindre">Venir essayer</a>
            </div>
          </div>
        </div>
        <div class="measures" id="measures" aria-label="L’orchestre en chiffres" data-reveal></div>
      </div>
      <div class="reel" aria-label="Photos de l’orchestre">
        <div class="reel-track" id="orchReelTrack"></div>
      </div>
    </section>

    <section class="sec dark" id="direction">
      <div class="wrap dir-grid">
        <figure class="dir-portrait" data-reveal>
          <div class="dir-frame"><img id="dirPortrait" alt="Portrait du directeur musical" loading="lazy" decoding="async"></div>
          <svg class="beat" viewBox="0 0 400 400" aria-hidden="true">
            <path class="beat-glow" d="M200 70 C 205 150, 200 230, 196 300 C 195 320, 210 318, 214 300 C 190 280, 120 240, 80 220 C 66 214, 70 200, 84 208 C 160 230, 260 236, 320 220 C 336 216, 336 232, 322 236 C 280 220, 240 160, 205 90"/>
            <path class="beat-line" d="M200 70 C 205 150, 200 230, 196 300 C 195 320, 210 318, 214 300 C 190 280, 120 240, 80 220 C 66 214, 70 200, 84 208 C 160 230, 260 236, 320 220 C 336 216, 336 232, 322 236 C 280 220, 240 160, 205 90"/>
          </svg>
          <figcaption>La battue à quatre temps</figcaption>
        </figure>
        <div class="dir-text">
          <h2 class="sub-title" data-k="direction.titre">Direction musicale</h2>
          <p class="dir-name"><span data-k="direction.nom"></span><small data-k="direction.role"></small></p>
          <div class="rich" data-k="direction.texte" data-rich></div>
          <ol class="jalons" id="jalons" aria-label="Parcours" data-reveal></ol>
        </div>
      </div>
    </section>""")

# ---------------------------------------------------------------- Agenda
PAGES["agenda.html"] = ("agenda", "Agenda",
    "Les prochains concerts de l’Harmonie d’Olivet et les concerts passés.",
    page_head("", "L’Agenda", "", "Concerts, défilés et rendez-vous de la saison.") + """
    <section class="sec bronze">
      <div class="wrap">
        <ol class="events" id="events"></ol>
        <div class="events-empty" id="eventsEmpty" hidden>
          <svg viewBox="40 -1010 678 372" aria-hidden="true"><path id="fermataPath"/></svg>
          <div>
            <p><strong>Point d’orgue.</strong> Les prochaines dates de la saison seront bientôt annoncées.</p>
            <a class="btn btn-dark" href="https://www.facebook.com/harmonie.olivet" target="_blank" rel="noopener" id="agendaFb">Suivre l’orchestre sur Facebook</a>
          </div>
        </div>
        <div class="past" id="pastWrap" hidden>
          <h2 class="sub-title">Concerts passés</h2>
          <ol class="events past-events" id="pastEvents"></ol>
        </div>
      </div>
    </section>""")

# ---------------------------------------------------------------- Actualités
PAGES["actualites.html"] = ("actualites", "Actualités",
    "Toute l’actualité de l’Harmonie d’Olivet.",
    page_head("", "Actualités", "", "Toute l’actualité de l’association.") + """
    <section class="sec paper">
      <div class="wrap">
        <div class="posts" id="posts" data-limit="50"></div>
      </div>
    </section>""")

# ---------------------------------------------------------------- Stage
PAGES["stage.html"] = ("stage", "Stage d’été",
    "Le stage d’orchestre d’été de l’Harmonie d’Olivet : une semaine d’orchestre pour une centaine de musiciens amateurs, encadrés par des professionnels.",
    page_head("stage.titre", "Stage d’orchestre d’été", "stage.edition") + """
    <section class="sec dark stage">
      <div class="wrap">
        <div class="stage-top">
          <p class="stage-intro" data-k="stage.intro"></p>
          <div class="stage-dates">
            <span class="sd-label">Dates</span>
            <strong data-k="stage.dates"></strong>
            <span data-k="stage.direction"></span>
            <div class="stage-cta">
              <a class="btn btn-bronze" id="stageInscription" href="#" target="_blank" rel="noopener">S’inscrire au stage</a>
              <button class="btn btn-ghost" type="button" id="stageAffiche">Voir l’affiche</button>
            </div>
          </div>
        </div>

        <div class="seating" data-reveal>
          <svg id="seating" viewBox="0 0 900 520" role="img" aria-labelledby="seatingTitle">
            <title id="seatingTitle">Plan de l’orchestre du stage : nombre de places par pupitre</title>
          </svg>
          <div class="seating-legend">
            <p class="seating-total"><strong id="seatTotal">0</strong> musiciens</p>
            <p class="muted">Effectif limité. Survolez un pupitre pour voir le nombre de places.</p>
            <p class="seat-hover" id="seatHover" aria-live="polite"></p>
          </div>
        </div>

        <div class="stage-info" data-reveal>
          <div class="si"><h2>Le stage</h2><p data-k="stage.lieu_stage"></p></div>
          <div class="si"><h2>Le concert</h2><p data-k="stage.lieu_concert"></p></div>
          <div class="si"><h2>Une journée type</h2><p data-k="stage.horaires"></p></div>
          <div class="si price">
            <h2>Tarif</h2>
            <p class="price-big" data-k="stage.tarif"></p>
            <p data-k="stage.tarif_reduit"></p>
            <p class="muted small" data-k="stage.conditions"></p>
          </div>
        </div>
      </div>
      <div class="stage-mosaic" id="stagePhotos"></div>
    </section>""")

# ---------------------------------------------------------------- Galerie
PAGES["galerie.html"] = ("galerie", "Galerie",
    "Photos, affiches et articles de presse de l’Harmonie d’Olivet depuis 2004.",
    page_head("", "Galerie", "", "Vingt ans de concerts, de défilés et de stages en images.") + """
    <section class="sec paper">
      <div class="wrap">
        <div class="tabs" role="tablist" aria-label="Type de médias">
          <button role="tab" aria-selected="true" data-tab="photo">Photos</button>
          <button role="tab" aria-selected="false" data-tab="visuel">Affiches</button>
          <button role="tab" aria-selected="false" data-tab="presse">Presse</button>
        </div>
        <div class="gallery" id="gallery" role="tabpanel"></div>
        <button class="btn btn-dark more" id="galleryMore" type="button" hidden>Afficher plus</button>
      </div>
    </section>""")

# ---------------------------------------------------------------- Contact
PAGES["contact.html"] = ("contact", "Contact",
    "Contacter l’Harmonie d’Olivet : rejoindre l’orchestre, s’inscrire au stage, inviter l’orchestre pour un concert.",
    page_head("contact.titre", "Contact", "contact.intro") + """
    <section class="sec dark contact">
      <div class="wrap contact-grid">
        <form class="contact-form" id="contactForm" novalidate>
          <div class="field"><label for="cName">Nom</label><input id="cName" name="name" required maxlength="120" autocomplete="name"></div>
          <div class="field"><label for="cEmail">E-mail</label><input id="cEmail" name="email" type="email" required maxlength="200" autocomplete="email"></div>
          <div class="field"><label for="cSubject">Objet</label>
            <select id="cSubject" name="subject">
              <option value="Rejoindre l’orchestre">Rejoindre l’orchestre</option>
              <option value="Stage d’été">Stage d’été</option>
              <option value="Inviter l’Harmonie pour un concert">Inviter l’Harmonie pour un concert</option>
              <option value="Autre demande">Autre demande</option>
            </select>
          </div>
          <div class="field"><label for="cBody">Message</label><textarea id="cBody" name="body" rows="6" required maxlength="5000"></textarea></div>
          <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
          <button class="btn btn-bronze" type="submit">Envoyer le message</button>
          <p class="form-status" id="formStatus" role="status"></p>
        </form>
        <aside class="contact-side">
          <div><h2>Adresse</h2><p class="pre" data-k="contact.adresse"></p></div>
          <div><h2>Écrire</h2><p><a id="contactEmail" href="#"></a></p><p id="contactPhoneWrap" hidden><a id="contactPhone" href="#"></a></p></div>
          <div><h2>Répétitions</h2><p data-k="orchestre.repetitions"></p><p class="muted" data-k="orchestre.lieu_repetitions"></p></div>
          <div class="socials" data-socials></div>
          <div class="map" id="map"></div>
        </aside>
      </div>
    </section>""")


def main():
    for name, (page, title, desc, body) in PAGES.items():
        (ROOT / name).write_text(layout(page, title, desc, body), encoding="utf-8")
        print("écrit", name)


if __name__ == "__main__":
    main()
