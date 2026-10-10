# Harmonie d'Olivet — site web

Site de l'Orchestre d'Harmonie d'Olivet, avec espace d'administration.

- **Pages publiques** : `index.html` (accueil), `orchestre.html`, `agenda.html`, `actualites.html`, `stage.html`, `galerie.html`, `contact.html`
- **Administration** : `admin.html` (connexion par e-mail et mot de passe)

## Fonctionnement

Le site est entièrement statique (HTML, CSS, JavaScript) et hébergé par GitHub Pages.
Les contenus modifiables (textes, agenda, actualités, galerie, messages du formulaire de contact)
sont stockés dans **Supabase** (projet `harmonie-olivet`, région Paris) :

| Table | Contenu |
|---|---|
| `settings` | Textes de chaque section (ouverture, orchestre, direction, stage, contact, partenaires) |
| `events` | Concerts de l'agenda |
| `posts` | Actualités |
| `media` | Photos (albums), affiches et articles de presse |
| `messages` | Messages envoyés via le formulaire de contact |
| `admins` | Adresses e-mail autorisées à modifier le site |

Les images sont dans le stockage Supabase, bucket public `media`.
La sécurité repose sur les règles RLS : tout le monde peut lire le contenu publié et envoyer un message,
seuls les comptes listés dans `admins` peuvent modifier.

Si Supabase est injoignable, le site affiche les textes par défaut de `assets/js/defaults.js`.

## Ajouter un administrateur

1. Supabase → Authentication → Users → *Invite user* (ou *Add user*) avec l'adresse e-mail.
2. SQL Editor : `insert into public.admins(email) values ('adresse@exemple.fr');`

## Structure

```
*.html                pages publiques (générées par outils/pages.py)
admin.html            administration
outils/pages.py       gabarit commun : menu, en-tête, pied de page et structure de chaque page
assets/css/site.css   styles du site
assets/css/admin.css  styles de l'administration
assets/js/site.js     chargement des contenus, animations légères, son, formulaire
assets/js/admin.js    administration
assets/js/defaults.js contenus par défaut
assets/js/glyphs.js   symboles musicaux vectoriels (Noto Music, licence SIL OFL)
assets/js/config.js   URL et clé publique Supabase
```

Pour modifier le menu ou la structure d'une page : éditer `outils/pages.py` puis lancer
`python3 outils/pages.py` depuis la racine. Les textes, eux, se modifient dans l'admin.

Polices : Bodoni Moda et Instrument Sans (Google Fonts). Seule bibliothèque : supabase-js (CDN).
Les animations sont en CSS ; aucune bibliothèque d'animation n'est chargée.
