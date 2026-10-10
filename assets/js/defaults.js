/* Contenu par défaut : utilisé si la base est injoignable, et comme modèle pour l'admin. */
(function () {
  const M = 'https://kdcflcvufukagdjycwww.supabase.co/storage/v1/object/public/media/legacy/';
  window.HO_MEDIA_BASE = M;
  window.HO_DEFAULTS = {
    hero: {
      surtitre: 'Orchestre d’harmonie · Olivet, Loiret',
      titre: 'Harmonie d’Olivet',
      accroche: 'Créé en 2003, l’orchestre réunit une soixantaine de musiciens et propose des concerts de qualité tout au long de l’année.',
      image: M + 'site/bandeau-2024.jpg',
      bouton: 'Voir l’agenda',
      bouton2: 'Rejoindre l’orchestre'
    },
    orchestre: {
      titre: 'L’Orchestre',
      intro: 'L’Harmonie d’Olivet est née en septembre 2003 de la volonté conjointe de la Ville d’Olivet et du Conservatoire d’Olivet.',
      texte: 'La Ville apporte son soutien logistique et financier, notamment lors des manifestations officielles : commémorations, fête nationale, inaugurations.\n\nL’orchestre participe à certaines manifestations du Conservatoire (concert de Noël, concert de fin d’année) et se produit régulièrement au Centre culturel d’Yvremont. Il donne une douzaine de concerts par saison à Olivet et dans les communes voisines : concert de printemps, concert de la Sainte-Cécile, concert au profit d’Olivet Solidarité, échanges avec d’autres harmonies ou chorales.\n\nL’Harmonie est aussi le premier « grand ensemble » des jeunes musiciens issus de la classe d’harmonie du Conservatoire. Cinq années de pratique instrumentale sont demandées.',
      chiffres: [
        { valeur: '2003', label: 'année de création' },
        { valeur: '60', label: 'musiciens environ' },
        { valeur: '12', label: 'concerts par saison' },
        { valeur: '5 ans', label: 'de pratique demandés' }
      ],
      repetitions: 'Le mercredi, de 18 h 45 à 20 h 45',
      lieu_repetitions: 'Conservatoire d’Olivet, rue Michel Roques, 45160 Olivet',
      adhesion: 'Les musiciens extérieurs au Conservatoire sont les bienvenus, moyennant une cotisation annuelle de 40 €.',
      photos: [1, 2, 3, 4, 5, 6].map(i => M + 'orchestre/' + i + '.jpg')
    },
    direction: {
      titre: 'Direction musicale',
      nom: 'Nicolas Burgevin',
      role: 'Directeur musical',
      portrait: M + 'directeur/portrait.jpg',
      texte: 'Nicolas Burgevin a effectué l’essentiel de sa formation au Conservatoire d’Orléans, en saxophone et en musique de chambre : diplôme de musique de chambre en 1997, prix de saxophone en 2000, diplôme d’État de professeur de saxophone en 2007.\n\nIl enseigne le saxophone au Conservatoire d’Olivet et à l’école municipale de musique de Meung-sur-Loire. Musicien d’orchestre et de nombreux ensembles de la région Centre, il est membre de l’Harmonie de la Région Centre et co-encadre les sessions de l’orchestre d’harmonie Odéon. Depuis 2011, il préside l’ensemble de saxophones « Val de Sax ».\n\nPassionné de jazz et ouvert aux esthétiques contemporaines, il joue régulièrement avec le Mazij Quintet et participe à des projets de big band.',
      jalons: [
        { annee: '1997', texte: 'Diplôme de musique de chambre' },
        { annee: '2000', texte: 'Prix de saxophone' },
        { annee: '2007', texte: 'Diplôme d’État de professeur' },
        { annee: '2011', texte: 'Président de Val de Sax' }
      ],
      photos: [1, 2, 3].map(i => M + 'directeur/' + i + '.jpg')
    },
    stage: {
      titre: 'Stage d’orchestre d’été',
      edition: 'Édition 2024',
      intro: 'Chaque année, près de 100 musiciens amateurs de la métropole orléanaise et d’ailleurs se retrouvent pour une semaine d’orchestre. Encadrés par 10 musiciens professionnels, ils préparent en 7 jours un programme varié, des pièces énergiques aux moments plus intimistes, présenté en concert avec mise en scène, lumière et son.',
      dates: 'Du 6 au 12 juillet 2024',
      direction: 'Direction : Nicolas Burgevin',
      lieu_stage: 'Collège la Providence, rue Pierre Beaulieu, 45160 Olivet',
      lieu_concert: 'L’Alliage, rue Michel Roques, 45160 Olivet',
      horaires: 'De 9 h 30 à 18 h, accueil dès 9 h avec viennoiseries et boissons. Travail par pupitres le matin, tutti ensuite. Déjeuner sur place par un traiteur et goûter chaque jour. Le stage se termine par deux concerts.',
      tarif: '210 €',
      tarif_reduit: '185 € pour le second membre d’une même famille',
      conditions: 'Paiement en 4 fois sans frais (chèque, virement ou prélèvement), 50 € d’arrhes à l’inscription. Chèques vacances ANCV acceptés. Le tarif comprend l’encadrement, les frais administratifs, la salle de concert et ses techniciens, les déjeuners et les goûters. En cas de sureffectif, les inscriptions tardives peuvent être refusées.',
      inscription_url: 'https://www.harmonie-olivet.com/stage-2024-inscriptions/',
      affiche: M + 'stage/affiche-2024.jpg',
      visuel: M + 'stage/visuel-2024.jpg',
      effectif: [
        { pupitre: 'Flûtes', places: 11 },
        { pupitre: 'Hautbois', places: 3 },
        { pupitre: 'Clarinettes', places: 20 },
        { pupitre: 'Saxophones', places: 18 },
        { pupitre: 'Cors', places: 6 },
        { pupitre: 'Trompettes', places: 10 },
        { pupitre: 'Trombones', places: 8 },
        { pupitre: 'Tubas', places: 8 },
        { pupitre: 'Percussions', places: 6 }
      ],
      photos: [1, 2, 3, 4, 5, 6, 7, 8].map(i => M + 'stage/photo-' + i + '.jpg')
    },
    contact: {
      titre: 'Contact',
      intro: 'Vous souhaitez rejoindre l’orchestre, nous inviter pour un concert ou poser une question ? Écrivez-nous, nous vous répondrons rapidement.',
      adresse: 'Harmonie d’Olivet\nMairie d’Olivet\n283 rue du Général de Gaulle\n45160 Olivet',
      email: 'contact@harmonie-olivet.com',
      telephone: '',
      facebook: 'https://www.facebook.com/harmonie.olivet',
      twitter: 'https://twitter.com/HarmoniedOlivet',
      instagram: '',
      carte_lat: 47.8631,
      carte_lng: 1.9006
    },
    partenaires: {
      liste: [
        { nom: 'Ville d’Olivet', url: 'https://www.olivet.fr' },
        { nom: 'Conservatoire d’Olivet', url: '' },
        { nom: 'L’Alliage', url: '' }
      ]
    }
  };
})();
