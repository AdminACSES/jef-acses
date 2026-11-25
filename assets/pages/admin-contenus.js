/* ==========================================================================
   Textes du cockpit : menu, aide de chaque page, mode d'emploi, quoi de neuf.
   Modifiable sans toucher à la logique (admin.js).
   ========================================================================== */
window.JEF_COCKPIT = {
  version: '2.3.0',

  menu: [
    { titre: 'Pilotage', couleur: '#2F6BFF', pages: [['tableau', 'Tableau de bord']] },
    { titre: 'Formation', couleur: '#6D28D9', pages: [['stagiaires', 'Stagiaires'], ['presences', 'Présences et attestations'], ['qualiopi', 'Qualiopi']] },
    { titre: 'Entreprises et badges', couleur: '#EB7E0C', pages: [['entreprises', 'Entreprises partenaires'], ['badges', 'Visiteurs et invités']] },
    { titre: 'Logistique', couleur: '#1E7B45', pages: [['restauration', 'Restauration'], ['jourj', 'Accueil jour J']] },
    { titre: 'Administration', couleur: '#94A3B8', pages: [['reglages', 'Réglages'], ['acces', 'Accès'], ['journal', 'Journal'], ['aide', 'Mode d\'emploi'], ['nouveautes', 'Quoi de neuf']] }
  ],

  legendes: {
    dossier: [['t-violet', 'En attente du service formation'], ['t-orange', 'À faire par le bureau'], ['t-bleu', 'Validé, paiement attendu'], ['t-vert', 'Terminé'], ['t-rouge', 'Annulé']],
    badge: [['t-orange', 'Badge à envoyer'], ['t-vert', 'Badge envoyé'], ['t-rouge', 'Annulé']],
    pass: [['t-vert', 'Pass inclus'], ['t-orange', 'Pass supplémentaire à facturer']],
    presence: [['pres-on', 'Présent'], ['pres', 'Pas encore enregistré, cliquer pour valider']]
  },

  aides: {
    tableau: {
      texte: 'Vue d\'ensemble de l\'édition. Les cartes orange signalent ce qui attend une action du bureau : un clic ouvre directement la bonne liste.',
      points: ['« Personnaliser le tableau de bord », en haut, permet de masquer des widgets et de changer leur ordre. Le réglage suit votre compte.','Les chiffres se mettent à jour à chaque actualisation, et seuls toutes les deux minutes.', 'Le tableau des repas donne les couverts par jour, à transmettre au traiteur.']
    },
    stagiaires: {
      texte: 'Tous les dossiers de formation. Cliquez sur un nom pour ouvrir la fiche complète.',
      points: ['Les pastilles en haut filtrent la liste. Sous chaque titre de colonne, une case permet de filtrer, et un clic sur le titre trie.',
        'Le bouton de la dernière colonne propose l\'action utile à l\'étape du dossier. « Vérifier et valider » affiche la convention signée, avec le bouton Valider à côté.',
        'Le bouton de présence marque le stagiaire présent en un clic. Un second clic retire la présence.'],
      legende: 'dossier'
    },
    qualiopi: {
      texte: 'Préparation des audits Qualiopi : les 33 indicateurs du référentiel, l\'état de chaque justificatif et les fichiers du Drive qui le prouvent.',
      points: ['Cliquez sur un indicateur pour changer son état, rattacher des fichiers du Drive Qualiopi ou un lien, et noter ce qu\'il faut dire à l\'auditeur.',
        'Les indicateurs propres à l\'alternance, à l\'apprentissage ou aux formations certifiantes sont marqués non applicables. Vous pouvez changer ce choix.',
        'Les lignes « Plateforme » sont calculées automatiquement à partir des inscriptions : positionnements, convocations, présences, attestations.',
        'Les exemples de justificatifs sont des propositions, à valider par le bureau avec le guide de lecture officiel.']
    },
    acces: {
      texte: 'Les comptes du bureau qui peuvent se connecter au cockpit et au scanner. Réservé aux administrateurs.',
      points: ['Tous les comptes sont utilisateurs. Cochez Administrateur pour donner aussi l\'accès aux Réglages et à cet onglet.',
        'La croix au bout de la ligne retire l\'accès. La personne est déconnectée aussitôt.',
        'Vous ne pouvez pas retirer votre propre accès administrateur : demandez à un autre administrateur.']
    },
    presences: {
      texte: 'Présent ou absent, attestations et feuille de présence unique.',
      points: ['Le scanner enregistre la présence à l\'arrivée. Ici, un clic sur « Marquer présent » rattrape un oubli, un second clic retire la présence.',
        'Les attestations partent seules à la date prévue dans les réglages, avec les heures réellement suivies.'],
      legende: 'presence'
    },
    entreprises: {
      texte: 'Les entreprises partenaires exposantes et les badges de leurs représentants. Tout est géré par le bureau, il n\'y a pas d\'inscription en ligne.',
      points: ['Premier temps, créez les entreprises, une par une ou par import. On ne sait pas encore qui viendra.',
        'Second temps, ajoutez les représentants dans la fiche de l\'entreprise, ou en masse avec la feuille à compléter que le cockpit prépare.',
        'Au-delà des pass inclus, chaque représentant devient un pass supplémentaire, signalé à facturer.'],
      legende: 'pass'
    },
    badges: {
      texte: 'Les badges hors stagiaires et hors exposants : visiteurs de l\'espace exposants, invités de l\'ACSES et intervenants.',
      points: ['Les visiteurs s\'inscrivent seuls avec le lien d\'invitation. Les invités et intervenants sont créés ici par le bureau.',
        'Un badge sans email s\'imprime avec le bouton PDF.'],
      legende: 'badge'
    },
    restauration: {
      texte: 'Couverts par repas et par profil, avec les régimes particuliers. L\'export pour le traiteur ne contient aucun nom.',
      points: ['Les repas se modifient personne par personne dans sa fiche.', 'Les prix se règlent dans Réglages, rubrique Tarifs.']
    },
    jourj: {
      texte: 'Tout ce qu\'il faut pour l\'accueil des 2 jours.',
      points: ['Le scanner fonctionne au téléphone (caméra) ou sur PC (douchette). Il garde les scans en cas de coupure et les envoie au retour du réseau.',
        'La veille, téléchargez la liste des participants (Exporter) pour avoir une copie hors connexion.']
    },
    reglages: {
      texte: 'Tous les paramètres de l\'édition, au même endroit. Les changements s\'appliquent dès l\'enregistrement et sont inscrits au journal.',
      points: ['Le bouton Enregistrer passe en orange tant que des modifications ne sont pas enregistrées.',
        'Les rubriques Avancé touchent aux dossiers Drive et à la connexion : chaque valeur est vérifiée, et une confirmation est demandée.']
    },
    journal: { texte: 'Qui a fait quoi et quand. Chaque action du bureau y est inscrite automatiquement.', points: [] },
    aide: { texte: 'Le fonctionnement complet de la plateforme, étape par étape.', points: [] },
    nouveautes: { texte: 'Les changements de chaque version.', points: [] }
  },

  modeEmploi: [
    { titre: 'Se repérer', blocs: [
      ['p', 'Le menu à gauche regroupe les pages par thème. En haut, la barre reste visible : titre de la page, recherche rapide, boutons Imprimer, Exporter et Actualiser, état de la synchronisation, personnes connectées et votre compte.'],
      ['p', 'Chaque page commence par une aide repliable avec la légende des couleurs. Elle reste ouverte ou fermée comme vous l\'avez laissée.'],
      ['p', 'Partout, un nom est cliquable et ouvre sa fiche. La recherche rapide trouve une personne, une entreprise ou un numéro de dossier.']
    ] },
    { titre: 'Les trois façons de s\'inscrire', blocs: [
      ['p', 'Le formulaire commence par « Qui remplit ce formulaire ? ». La suite dépend de la réponse.'],
      ['ul', ['Le stagiaire, avec un service formation. Le stagiaire réserve sa place. Son service formation reçoit un lien personnel, complète la partie administrative et dépose la convention signée.',
        'Le service formation ou un secrétariat. Il remplit tout en une fois, reçoit la convention et la dépose signée, tout de suite ou plus tard. Le stagiaire reçoit un lien pour remplir lui-même son positionnement.',
        'Le stagiaire qui paie lui-même. Il reçoit un contrat de formation à signer et déposer. Il a 14 jours pour se rétracter et paie après la formation. Sa facture part automatiquement avec l\'attestation.']]
    ] },
    { titre: 'Un dossier stagiaire de bout en bout', blocs: [
      ['ol', ['Inscription sur le site. Statut « Pré-inscrit » ou « Dossier complété », étiquette violette.',
        'Le document signé (convention ou contrat) est déposé en ligne. Statut « Convention reçue », étiquette orange : à vous de jouer. Vous recevez un email avec le bouton « Vérifier et valider ».',
        'Ce bouton ouvre la fiche et le document signé. Vérifiez-le, puis cliquez sur Valider. Le badge part au stagiaire et la facture au service formation. Statut « Validé », étiquette bleue.',
        'À réception du règlement, vous cliquez sur Encaisser. La facture acquittée part. Statut « Payé », étiquette verte.']],
      ['p', 'Un dossier sans document signé depuis 10 jours apparaît sur le tableau de bord. Le bouton Relancer renvoie le lien.']
    ] },
    { titre: 'Entreprises partenaires exposantes', blocs: [
      ['p', 'Les badges exposants sont gérés uniquement par le bureau, en deux temps.'],
      ['ol', ['Créez les entreprises : bouton « Nouvelle entreprise », ou « Importer » avec le modèle à télécharger (une ligne par entreprise).',
        'Quand les entreprises vous donnent leurs noms, ajoutez les représentants dans la fiche de l\'entreprise. Pour aller vite, téléchargez la feuille à compléter : elle contient une ligne par pass inclus de chaque entreprise. Remplissez-la dans Excel puis importez-la.',
        'Envoyez les badges, un par un ou avec « Envoyer les badges » dans la fiche de l\'entreprise.']],
      ['p', 'L\'import montre toujours un aperçu ligne par ligne avant d\'écrire quoi que ce soit. Une entreprise déjà connue est mise à jour, un représentant déjà inscrit n\'est pas recréé.']
    ] },
    { titre: 'Visiteurs et invités', blocs: [
      ['p', 'Les visiteurs de l\'espace exposants s\'inscrivent seuls sur jef.acses-asso.com/visiteur.html, pour une demi-journée, sans repas. Leur badge part automatiquement.'],
      ['p', 'Les invités de l\'ACSES et les intervenants se créent avec « Nouveau badge », avec ou sans repas.']
    ] },
    { titre: 'Jour J et Qualiopi', blocs: [
      ['p', 'Ouvrez scanner.html sur un téléphone ou un PC. En mode Accueil, chaque personne est scannée une seule fois, à son arrivée : elle est présente pour toute la formation (un visiteur, pour sa demi-journée). Le scan affiche aussi ses repas.'],
      ['p', 'En mode Vérifier, le scan ouvre la fiche de la personne : présence, repas, badge envoyé, attestation, avec des boutons pour corriger ou renvoyer.'],
      ['p', 'Si un financeur exige un émargement par demi-journée, passez le réglage « Un seul scan à l\'arrivée » sur Non.'],
      ['p', 'Sans réseau, le scanner continue : les scans sont gardés sur l\'appareil puis envoyés au retour de la connexion.'],
      ['p', 'Le vendredi à 14 h (réglable), la feuille de présence unique et les attestations partent seules. Une personne non scannée peut être marquée présente depuis le cockpit avant cet envoi.']
    ] },
    { titre: 'Inscription sur place', blocs: [
      ['p', 'Le bouton orange « + Inscription sur place », en haut à droite, sert le jour J pour une personne arrivée sans inscription. Choisissez le profil : il détermine le modèle du badge.'],
      ['ul', ['Aucun repas n\'est coché par défaut. Cochez ceux que la personne prend.',
        'Le badge s\'ouvre aussitôt pour l\'impression. Avec un email, il peut aussi être envoyé.',
        'Un stagiaire inscrit sur place a un vrai dossier, validé d\'office et compté pour l\'attestation. La convention et la facture se régularisent ensuite depuis sa fiche.']]
    ] },
    { titre: 'Qualiopi et audits', blocs: [
      ['p', 'L\'onglet Qualiopi liste les 33 indicateurs du référentiel. Pour chacun, indiquez l\'état du justificatif et rattachez les fichiers du Drive Qualiopi. Le jour de l\'audit, tout est au même endroit.'],
      ['p', 'Le dossier Drive doit être partagé avec le compte qui fait tourner la plateforme, sinon la liste des fichiers ne s\'affiche pas.']
    ] },
    { titre: 'Profils et accès', blocs: [
      ['ul', ['Utilisateur : tout le cockpit et le scanner, sans les Réglages ni les Accès. C\'est le profil de tous les membres du bureau.',
        'Administrateur : utilisateur, plus les Réglages et l\'onglet Accès.',
        'Un administrateur ajoute ou retire un compte dans l\'onglet Accès. L\'effet est immédiat.']]
    ] },
    { titre: 'Couleurs des étiquettes', blocs: [
      ['legende', [['t-vert', 'Terminé ou OK'], ['t-orange', 'À faire ou bientôt'], ['t-rouge', 'Annulé, refusé ou en retard'], ['t-violet', 'En attente d\'un tiers ou mode spécial'], ['t-bleu', 'Prévu']]]
    ] },
    { titre: 'En cas de problème', blocs: [
      ['ul', ['« Session expirée » : reconnectez-vous, la session dure 4 heures.',
        'Un badge ne s\'ouvre pas : autorisez les fenêtres pour jef.acses-asso.com, ou utilisez le bouton Télécharger qui s\'affiche.',
        'Une erreur technique affiche une référence. Notez-la : elle permet de retrouver le détail dans les journaux d\'Apps Script.',
        'Un chiffre semble faux : cliquez sur Actualiser, les données sont peut-être anciennes de quelques minutes.']]
    ] },
    { titre: 'Données personnelles', blocs: [
      ['ul', ['Les besoins liés au handicap et les régimes alimentaires sont des données de santé : ne les copiez pas hors de la plateforme.',
        'L\'export traiteur ne contient que des nombres de couverts.',
        'Après l\'événement, le menu du classeur permet d\'anonymiser les visiteurs.']]
    ] }
  ],

  nouveautes: [
    { version: '2.3.0', date: '25 novembre 2026', points: [
      'Inscription sur place depuis le cockpit (bouton en haut à droite et sur le tableau de bord) : stagiaire, exposant, invité, intervenant ou visiteur, badge imprimé tout de suite avec le modèle du profil, sans repas par défaut.',
      'Tableau de bord personnalisable : afficher ou masquer chaque widget, changer l\'ordre. Le réglage suit votre compte.',
      'Présence : présent ou absent, un seul bouton.',
      'Nouvel onglet Qualiopi pour préparer les audits : 33 indicateurs, état des justificatifs, fichiers du Drive rattachés.',
      'Profils utilisateur et administrateur, et nouvel onglet Accès pour ajouter ou retirer un membre du bureau.',
      'Scanner : mode Vérifier, qui ouvre la fiche de la personne pour marquer la présence, renvoyer le badge ou l\'attestation.',
      'Réglages des présences et de Qualiopi modifiables directement depuis ces pages, pour les administrateurs.'
    ] },
    { version: '2.2.0', date: '25 novembre 2026', points: [
      'Inscription : la première question « Qui remplit ce formulaire ? » adapte la suite. Stagiaire, service formation ou secrétariat, ou stagiaire qui paie lui-même.',
      'Un service formation peut inscrire un stagiaire en une fois et déposer la convention aussitôt. Le stagiaire reçoit un lien pour son positionnement.',
      'Stagiaire qui paie lui-même : contrat de formation, 14 jours de rétractation, règlement par virement ou chèque après la formation.',
      'Inscriptions fermées : annoncé dès l\'ouverture de la page, avec l\'adresse de contact.',
      'Civilité retirée, positionnement et SIRET facultatifs, exemples de saisie plus lisibles.',
      'Nom de la personne dans les noms de fichiers et dans l\'objet des emails.',
      'Email « convention à valider » : le bouton ouvre la fiche et le document signé, avec Valider à côté.',
      'Scanner : un seul scan à l\'arrivée vaut pour les 2 jours. Attestations le vendredi à 14 h.'
    ] },
    { version: '2.1.0', date: '25 novembre 2026', points: [
      'Nouvelle interface du cockpit : menu par thèmes, barre fixe avec recherche rapide, aide et légende sur chaque page.',
      'Personnes connectées affichées en haut à droite, et avertissement si quelqu\'un a la même fiche ouverte.',
      'Présences validables d\'un clic dans les listes.',
      'Le badge s\'ouvre directement dans le navigateur, sans passer par Drive.',
      'Entreprises partenaires gérées par le bureau, avec import en deux temps : les entreprises, puis les représentants.',
      'Tableau de bord enrichi : actions à faire, repas par jour, financement, établissements, besoins d\'aménagement.',
      'Tous les paramètres sont réglables depuis l\'onglet Réglages, avec explications et vérifications.',
      'Mode d\'emploi et page Quoi de neuf.'
    ] },
    { version: '2.0.0', date: '24 novembre 2026', points: [
      'Nouvelle plateforme sécurisée : connexion Google, données protégées, badges signés.',
      'Dépôt en ligne de la convention signée, repas à la carte, présences par demi-journée, attestations automatiques.'
    ] }
  ]
};
