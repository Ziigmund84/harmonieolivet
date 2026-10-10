# Harmonie d'Olivet — site web

Site one page de l'Orchestre d'Harmonie d'Olivet, avec espace d'administration.

- **Site public** : `index.html`
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
index.html            page publique
admin.html            administration
assets/css/site.css   styles du site
assets/css/admin.css  styles de l'administration
assets/js/site.js     rendu, animations (GSAP, Lenis), son, formulaire
assets/js/admin.js    administration
assets/js/defaults.js contenus par défaut
assets/js/glyphs.js   symboles musicaux vectoriels (Noto Music, licence SIL OFL)
assets/js/config.js   URL et clé publique Supabase
```

Polices : Bodoni Moda et Instrument Sans (Google Fonts). Bibliothèques : GSAP + ScrollTrigger, Lenis, supabase-js (CDN).
