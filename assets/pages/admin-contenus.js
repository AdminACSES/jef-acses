/* ==========================================================================
   Textes du cockpit : menu, aide de chaque page, mode d'emploi, quoi de neuf.
   Modifiable sans toucher à la logique (admin.js).
   ========================================================================== */
window.JEF_COCKPIT = {
  version: '2.7.0',

  // Cinq espaces séparés, même connexion et même serveur. Chaque espace ne montre que ses pages.
  // Cinq espaces (les tuiles du bandeau). Chaque espace a ses onglets (ses pages).
  menu: [
    { id: 'inscriptions', titre: 'Inscriptions', court: 'Inscriptions', ico: '👥', couleur: '#EB7E0C', texte: 'Participants, entreprises, paiements, badges',
      pages: [['tableau', 'Tableau de bord'], ['participants', 'Tous'], ['stagiaires', 'Stagiaires'], ['accompagnants', 'Accompagnants'], ['entreprises', 'Exposants'],
        ['visiteurs', 'Visiteurs'], ['invites', 'Invités'], ['invitations', 'Invitations'], ['communication', 'Emails'], ['restauration', 'Repas']] },
    { id: 'programme', titre: 'Programme', court: 'Programme', ico: '🗓️', couleur: '#0E9F6E', texte: 'Planning des deux jours, intervenants, rétroplanning',
      pages: [['programme', 'Planning'], ['intervenants', 'Intervenants'], ['taches', 'Rétroplanning']] },
    { id: 'jourj', titre: 'Jour J et régie', court: 'Jour J', ico: '🎬', couleur: '#DB2777', texte: 'Accueil, animations, questions de la salle',
      pages: [['jourj', 'Accueil'], ['animation', 'Animations'], ['questions_salle', 'Questions de la salle'], ['presences', 'Présences']] },
    { id: 'qualiopi', titre: 'Qualiopi', court: 'Qualiopi', ico: '✅', couleur: '#7C3AED', texte: 'Questionnaires, indicateurs, dossier d\'audit',
      pages: [['qualiopi', 'Indicateurs'], ['questionnaires', 'Résultats des questionnaires'], ['q_reglages', 'Réglage des questionnaires']] },
    { id: 'administration', titre: 'Administration', court: 'Admin', ico: '⚙️', couleur: '#2575B3', texte: 'Réglages, éditions, accès, aide',
      pages: [['reglages', 'Réglages'], ['editions', 'Éditions'], ['acces', 'Accès'], ['journal', 'Journal'], ['aide', 'Mode d\'emploi'], ['nouveautes', 'Quoi de neuf']] }
  ],

  // Pictogrammes des espaces (traits, 24 x 24), dessinés pour le cockpit.
  icones: {
    inscriptions: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2.4"/><path d="M5.6 16.6c.8-1.7 2-2.5 3.4-2.5s2.6.8 3.4 2.5"/><path d="M15 10h3.2M15 13.2h3.2"/>',
    programme: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.8v3.4M16 2.8v3.4"/><path d="M7.5 13.5h4M7.5 17h7"/><circle cx="16.5" cy="14.5" r=".9"/>',
    jourj: '<rect x="2.5" y="4" width="19" height="13" rx="2.5"/><path d="M10.2 8.3v5.4l4.4-2.7z"/><path d="M8 21h8M12 17v4"/>',
    qualiopi: '<path d="M12 2.8l7.2 3v5.3c0 4.6-3.1 8.5-7.2 10.1-4.1-1.6-7.2-5.5-7.2-10.1V5.8z"/><path d="M8.6 12.1l2.4 2.4 4.5-4.8"/>',
    administration: '<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>'
  },

  legendes: {
    dossier: [['t-violet', 'En attente du service formation'], ['t-orange', 'À faire par le bureau'], ['t-bleu', 'Validé, paiement attendu'], ['t-vert', 'Terminé'], ['t-rouge', 'Annulé']],
    badge: [['t-orange', 'Badge à envoyer'], ['t-vert', 'Badge envoyé'], ['t-rouge', 'Annulé']],
    pass: [['t-vert', 'Pass inclus'], ['t-orange', 'Pass supplémentaire à facturer']],
    presence: [['pres-on', 'Présent'], ['pres', 'Pas encore enregistré, cliquer pour valider']]
  },

  aides: {
    portail: {
      texte: 'Une tuile, c\'est un espace. Un onglet, c\'est une page de cet espace. Les cinq tuiles restent en haut de toutes les pages.',
      points: ['Le chiffre orange d\'une tuile signale ce qui attend une action dans cet espace.',
        'La régie et le scanner s\'ouvrent dans leur propre fenêtre et s\'installent comme des applications.']
    },
    q_reglages: {
      texte: 'Quand chaque questionnaire s\'ouvre, et ses questions. Les résultats sont dans l\'onglet « Résultats des questionnaires ».',
      points: ['AUTO suit les demi-journées des Réglages. OUVERT ou FERMÉ force l\'état, par exemple pour faire répondre en salle plus tôt.',
        'En mode test, tout est ouvert pour les essais.',
        'Les questions de l\'évaluation des acquis viennent des objectifs du Planning : une question par objectif, regroupées par jour.']
    },
    questions_salle: {
      texte: 'Les questions posées par la salle, une série par présentation. La modération en direct se fait dans la régie.',
      points: ['Chaque participant, quel que soit son profil, pose ses questions depuis son espace. Il peut demander l\'anonymat à l\'écran, son nom reste dans l\'archive.',
        'Une série fermée reste consultable ici, avec l\'auteur, les votes et la suite donnée. Le bouton PDF la range dans le Drive Qualiopi.']
    },
    taches: {
      texte: 'Le rétroplanning de l\'édition : ce qu\'il faut faire avant, pendant et après les journées, avec une échéance et un responsable.',
      points: ['Chaque tâche garde son écart avec le premier jour. À l\'édition suivante, les échéances se recalculent seules.',
        '« Charger le modèle » ajoute une proposition de départ, à adapter. Il ne crée jamais de doublon.',
        'Un clic sur l\'état fait passer la tâche à l\'état suivant. Les tâches en retard sont en rouge.']
    },
    editions: {
      texte: 'Le passage d\'une édition à la suivante, sans changer de fichier ni d\'adresse. Réservé aux administrateurs.',
      points: ['1. Après l\'événement, « Clôturer l\'édition » copie les onglets de l\'année dans un classeur d\'archive rangé dans Archives / JEF année, et ajoute une ligne à l\'historique.',
        '2. Ensuite, « Préparer l\'édition suivante » vide les inscriptions, les badges, les réponses et le journal. Réglages, questionnaires, entreprises, adhérents, Qualiopi, invitations, animations et rétroplanning sont gardés.',
        'Les dates sont décalées d\'autant que le premier jour. Les textes avec des jours de la semaine, le lieu et les tarifs sont à relire dans Réglages.',
        'L\'archive est protégée par un avertissement : un administrateur peut encore la modifier, mais Google prévient avant.']
    },
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
    participants: {
      texte: 'Toutes les personnes qui ont un badge, toutes catégories confondues : stagiaires, accompagnants, exposants, visiteurs, intervenants et invités.',
      points: ['Les pastilles filtrent par catégorie, par présence ou par badge à envoyer. Les cases sous les titres filtrent chaque colonne.',
        '« Imprimer les badges affichés » prépare un seul PDF avec les badges de la liste filtrée, 40 au plus.',
        '« Ajouter une personne » ouvre le formulaire de la catégorie choisie dans les pastilles.'],
      legende: 'badge'
    },
    accompagnants: {
      texte: 'Les accompagnants des congressistes, pour les repas et la soirée de gala. Leur badge part avec celui de la personne accompagnée.',
      points: ['Le congressiste peut ajouter son accompagnant dans le formulaire d\'inscription. Le bureau peut aussi en ajouter ici.',
        'Le tarif accompagnant se règle à part, hors convention de formation. « Encaisser » enregistre le paiement.'],
      legende: 'badge'
    },
    visiteurs: {
      texte: 'Les visiteurs de l\'espace exposants, pour une demi-journée, sans conférences ni repas.',
      points: ['Ils s\'inscrivent seuls avec le lien d\'invitation, que le bouton « Copier le lien » met dans le presse-papiers.'],
      legende: 'badge'
    },
    intervenants: {
      texte: 'Les intervenants des journées : état du contact, thème, créneau, logistique et documents reçus.',
      points: ['« Suivi » met à jour l\'état (à contacter, contacté, confirmé), le thème, l\'hôtel, les frais et les documents.',
        'Le CV et le support servent de preuves Qualiopi (indicateurs 21 et 19). « Documents manquants » liste ceux à relancer.',
        'Le conducteur des journées se construit dans Programme.'],
      legende: 'badge'
    },
    invites: {
      texte: 'Les invités de l\'ACSES. Les invitations institutionnelles et leurs réponses se suivent dans Invitations.',
      points: ['Un invité est sans repas par défaut. Cochez ceux qui lui sont offerts.'],
      legende: 'badge'
    },
    questionnaires: {
      texte: 'Les questionnaires Qualiopi intégrés et reliés au badge : test d\'entrée et de fin, évaluation des acquis, satisfaction des congressistes et des entreprises.',
      points: ['Chaque participant répond depuis son espace, ouvert par le QR « Mon espace participant » de son badge, ou par le lien des emails de rappel et d\'attestation.',
        'Le test de connaissances est le même à l\'entrée et à la fin : la progression est calculée participant par participant. Ses questions sont à écrire avec les intervenants.',
        '« Rapport PDF pour l\'audit » dépose le bilan dans le Drive Qualiopi de l\'année et le rattache à l\'indicateur (11 ou 30). Le rapport avec réponses individuelles ajoute le détail par personne.',
        'Modifiez les questions avant l\'ouverture : après les premières réponses, ajoutez plutôt des questions à la fin.']
    },
    animation: {
      texte: 'Les animations du public : nuage de mots, sondage, étoiles, quiz, note, questionnaires. On les prépare ici, on les lance depuis la régie.',
      points: ['La bibliothèque propose 18 animations prêtes, inspirées des séances 2026. Cochez, ajoutez, puis ajustez le texte.',
        'Rattachez une animation à une séquence du planning : la régie la propose au bon moment.',
        'Un quiz garde sa bonne réponse secrète jusqu\'à ce que la régie la dévoile.',
        'Après la séance, le bouton PDF classe les résultats dans le Drive Qualiopi.']
    },
    animation_ancien: {
      texte: 'Nuage de mots, sondage, note et questions de la salle, affichés en direct sur l\'écran. Le public répond depuis son téléphone, avec le QR « Mon espace » de son badge.',
      points: ['Ouvrez l\'écran de projection sur l\'ordinateur relié au vidéoprojecteur (bouton en haut). Il n\'a pas besoin de connexion Google.',
        '« Lancer » affiche la question sur tous les téléphones et sur l\'écran. Une seule animation est en direct à la fois.',
        '« Lancer un questionnaire » affiche « Sortez votre badge » avec le compteur de réponses : c\'est le moment de faire remplir le test d\'entrée, le test de fin ou l\'évaluation des acquis.',
        'Après la séance, le bouton PDF classe les résultats dans le Drive Qualiopi. Slido reste possible en secours.']
    },
    programme: {
      texte: 'Le planning des deux jours. Chaque séquence relie son intervenant, son support, sa salle, ses animations et ses questions. La régie et l\'espace participant le reprennent.',
      points: ['Un clic sur le nom de l\'intervenant ouvre sa fiche. « Support » ouvre sa présentation, déposée dans son espace ou collée dans le planning.',
        '« Régie » ouvre la régie directement sur cette séquence.',
        '« Modifier le planning » passe en saisie : une carte par séquence, flèches pour l\'ordre, puis Enregistrer.',
        'L\'objectif de chaque conférence crée la question de l\'évaluation des acquis du jour.']
    },
    invitations: {
      texte: 'Les invitations institutionnelles : préfecture, ARS, SDIS, FHF, élus. Destinataire, formule, suivi et réponse.',
      points: ['Quand une invitation est acceptée, « créer les badges » prépare un badge Invité ACSES par personne avec les repas de la formule.',
        'L\'import accepte un fichier CSV avec au moins une colonne Destinataire.']
    },
    communication: {
      texte: 'Emails groupés par catégorie, relances et bilan de l\'édition.',
      points: ['Comptez toujours les destinataires avant d\'envoyer. Google limite le nombre d\'emails par jour.',
        'Les relances automatiques sont désactivées par défaut. « Relancer maintenant » fonctionne quand même.',
        'Le bilan PDF rassemble les chiffres de l\'édition, pour le bureau et pour l\'assemblée générale.']
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
    { titre: 'Les cinq espaces', blocs: [
      ['p', 'Le cockpit s\'ouvre sur un portail à cinq tuiles. Chaque espace ne montre que ses pages : Inscriptions et adhésions, Programme et intervenants, Jour J et régie, Qualiopi, Administration.'],
      ['p', 'Tout reste relié : une inscription apparaît aussitôt au scanner, un objectif du programme crée la question de l\'évaluation des acquis. Le découpage sert à ne voir que ce dont on a besoin.']
    ] },
    { titre: 'Les questions de la salle', blocs: [
      ['p', 'Au début de chaque présentation, la régie ouvre une série de questions. Tout le monde (stagiaires, exposants, visiteurs, intervenants, invités) pose ses questions depuis son espace et vote pour celles des autres.'],
      ['ol', ['Avec la modération, chaque question attend une validation de la régie avant d\'être visible.',
        'Les questions validées se classent par votes. « À la une » en affiche une en grand sur l\'écran.',
        'Pendant le temps d\'échange, marquez les questions répondues.',
        'À la fin, « Fermer la série ». Elle reste archivée avec l\'auteur de chaque question, et part en PDF dans le Drive Qualiopi.']]
    ] },
    { titre: 'La régie du jour J', blocs: [
      ['p', 'Ouvrez la régie (regie.html) sur l\'ordinateur relié au vidéoprojecteur. Elle affiche la séquence en cours, la suivante et le temps restant, d\'après le Programme.'],
      ['ol', ['Branchez le vidéoprojecteur en écran étendu (touches Windows + P, puis « Étendre »).',
        'Lancez les PowerPoint en mode Présentateur : la diapositive part sur le vidéoprojecteur, vos notes restent sur l\'ordinateur.',
        'Depuis la régie, « Ouvrir l\'écran de projection » ouvre une seconde fenêtre. Glissez-la sur le vidéoprojecteur et passez-la en plein écran (F11).',
        'Pour une animation, lancez-la depuis la régie puis basculez sur la fenêtre de l\'écran (Alt + Tab). Pour revenir au PowerPoint, Alt + Tab encore.']],
      ['p', 'Une page web ne peut pas piloter PowerPoint : la bascule se fait au clavier. Répétez la manipulation sur place la veille.']
    ] },
    { titre: 'D\'une année sur l\'autre', blocs: [
      ['p', 'On garde un seul fichier et une seule adresse. Après l\'événement, Administration, Éditions et historique : clôturez l\'édition, puis préparez la suivante. Relisez ensuite les réglages signalés.']
    ] },
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
    { titre: 'Les participants par catégorie', blocs: [
      ['p', '« Tous les participants » regroupe toutes les personnes qui ont un badge. Chaque catégorie a ensuite sa page, avec son bouton « Ajouter » déjà réglé sur la bonne catégorie.'],
      ['ul', ['Visiteurs : ils s\'inscrivent seuls sur jef.acses-asso.com/visiteur.html, pour une demi-journée, sans repas. Leur badge part automatiquement.',
        'Accompagnants : ajoutés par le congressiste à l\'inscription, ou par le bureau. Tarif à part, hors convention.',
        'Intervenants : suivi du contact, du thème, de la logistique et des documents (CV, support, photo).',
        'Invités : sans repas par défaut. Les invitations institutionnelles se suivent dans Invitations.']]
    ] },
    { titre: 'Le badge', blocs: [
      ['p', 'Le badge s\'imprime sur une page A4, recto seul. On le plie en deux le bas derrière, puis en deux la droite derrière. Devant : le nom, le profil, les repas et le QR d\'identification. Derrière : le nom et le grand QR « Mon espace participant ». Le mode d\'emploi est imprimé à l\'intérieur.'],
      ['p', 'À l\'accueil, le scanner accepte les deux QR codes : un badge retourné sur son cordon fonctionne quand même.'],
      ['p', 'Imprimé en noir et blanc, le badge reste lisible : le profil est écrit en toutes lettres avec un code en carré noir (STA, BUR, EXP, VIS, VIP, INT, ACC), et chaque repas porte ✓ ou ✗. Le scan reste la vraie vérification.'],
      ['p', 'À l\'intérieur, quand la feuille est à plat : le programme résumé à gauche, le pliage et les contacts à droite.']
    ] },
    { titre: 'Animation en direct', blocs: [
      ['p', 'Préparez les animations dans « Animation en direct » (le bouton « Créer les animations conseillées » en prépare 7). Ouvrez l\'écran de projection sur l\'ordinateur du vidéoprojecteur, puis lancez chaque animation au bon moment. Le public répond depuis son espace, avec le QR de son badge.'],
      ['p', 'Pour faire remplir un questionnaire en salle, lancez « Lancer un questionnaire » : l\'écran affiche « Sortez votre badge » et le compteur de réponses.']
    ] },
    { titre: 'Intervenants et Qualiopi', blocs: [
      ['p', 'Dans Intervenants, « Suivi » envoie à chaque intervenant le lien de son espace. Il y dépose CV, photo et support, et donne l\'objectif de son intervention. Tout se range seul dans le Drive Qualiopi de l\'année et coche son suivi.'],
      ['p', 'Dans Programme, choisir l\'intervenant d\'une séquence reprend son objectif. Les objectifs construisent l\'évaluation des acquis de chaque jour.'],
      ['p', 'Un fichier déposé à la main dans le Drive Qualiopi est retrouvé par « Analyser le Drive », si le nom de l\'intervenant figure dans le nom du fichier.']
    ] },
    { titre: 'Espace participant et questionnaires', blocs: [
      ['p', 'Chaque badge porte un deuxième QR code « Mon espace participant ». Scanné avec un téléphone, il ouvre une page personnelle : programme, repas et questionnaires du profil. Aucun mot de passe : le lien est signé.'],
      ['ul', ['Stagiaires : test d\'entrée, test de fin, évaluation des acquis et satisfaction.',
        'Exposants : satisfaction des entreprises partenaires.', 'Autres profils : satisfaction.']],
      ['p', 'Les questionnaires s\'ouvrent seuls selon les demi-journées. Les rapports PDF se déposent dans le Drive Qualiopi de l\'année, prêts pour l\'auditeur.']
    ] },
    { titre: 'Classement du Drive', blocs: [
      ['p', 'Chaque édition a son dossier « JEF année » dans le dossier d\'archives : Stagiaires, Badges et Documents de l\'édition. Les rapports Qualiopi vont dans « JEF année » du dossier d\'audit Qualiopi. Les éditions précédentes restent où elles sont.']
    ] },
    { titre: 'Jour J et Qualiopi', blocs: [
      ['p', 'Ouvrez scanner.html sur un téléphone ou un PC. En mode Présence, chaque personne est scannée une seule fois, à son arrivée. Le résultat s\'affiche en plein écran : vert, il se ferme seul après 2 secondes. Orange ou rouge, il reste affiché jusqu\'à ce que vous touchiez l\'écran.'],
      ['p', 'En mode Contrôle, le scan ouvre la fiche de la personne sans pointer sa présence. Le lecteur s\'efface, le bouton « Scanner le suivant » le fait revenir.'],
      ['p', 'Le mode Borne (lien en bas du scanner) transforme une tablette en borne d\'auto-accueil : les participants scannent eux-mêmes leur badge. Un membre du bureau se connecte d\'abord. Touchez deux fois « Quitter » pour sortir.'],
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
    { version: '2.7.0', date: '27 novembre 2026', points: [
      'Questionnaires sur le modèle JEF 2026 : test d\'entrée et de fin, évaluation des acquis par jour construite avec les objectifs du Programme, courte satisfaction en fin de dernier jour, enquête des entreprises partenaires pour les seuls exposants.',
      'Questionnaires modernes sur téléphone : une question par écran, échelles du moins bon (à gauche) au meilleur (à droite), récapitulatif avant l\'envoi, réponses gardées sur le téléphone si le réseau sature.',
      'Animation en direct : nuage de mots, sondage, note, questions de la salle et lancement des questionnaires, avec un écran de projection. Slido reste possible en secours.',
      'Qualiopi automatique : programme, CV, supports, coordination, rapports, feuille de présence et bilan sont classés dans le Drive de l\'année et rattachés à leur indicateur. Bouton « Préparer le dossier d\'audit ».',
      'Espace intervenant : chaque intervenant dépose son CV, sa photo et son support, donne son objectif et ses questions pour le test, son hôtel et ses repas.',
      'Badge : nouveau pliage, le nom devant, le nom et le QR « Mon espace » derrière. Les deux QR codes enregistrent l\'arrivée.',
      'Scanner : caméra directe sur téléphone sans clavier, plus de choix de demi-journée avec le scan unique.',
      'Fenêtres qui ne se ferment plus par erreur, saisie gardée 30 minutes, menus visibles en demi-écran, attentes signalées pendant chaque enregistrement.',
      'La demande de formation interne n\'est plus demandée au service formation : simple rappel pour le stagiaire.'
    ] },
    { version: '2.4.2', date: '26 novembre 2026', points: [
      'Les mises à jour du site s\'affichent tout de suite, sans vider le cache du navigateur.'
    ] },
    { version: '2.4.1', date: '26 novembre 2026', points: [
      'Cockpit et Scanner deviennent deux applications distinctes, installables depuis Chrome sur ordinateur et sur téléphone.',
      'Cockpit sur téléphone : barre de navigation en bas avec le bouton + pour l\'inscription sur place, listes en cartes, fiche en plein écran, fenêtres qui montent du bas.',
      'Le bouton retour du téléphone ferme la fiche ouverte. Les données se rafraîchissent quand on revient dans l\'application.',
      'Le scanner s\'ouvre même sans réseau une fois installé.'
    ] },
    { version: '2.4.0', date: '26 novembre 2026', points: [
      'Menu Participants : tous les participants, puis une page par catégorie (stagiaires, accompagnants, exposants, visiteurs, intervenants, invités), chacune avec son bouton Ajouter.',
      'Accompagnants : nouvelle catégorie, ajoutée par le congressiste à l\'inscription ou par le bureau, badge envoyé avec celui de la personne accompagnée.',
      'Questionnaires Qualiopi intégrés et reliés au badge : test d\'entrée et de fin avec progression, évaluation des acquis, satisfaction congressistes et entreprises. Rapports PDF déposés dans le Drive Qualiopi.',
      'Espace participant ouvert par un deuxième QR code sur le badge : programme, repas, questionnaires.',
      'Programme des journées, suivi des intervenants, invitations institutionnelles, emails groupés, relances (désactivées par défaut), badges en lot et bilan PDF de l\'édition.',
      'Scanner refait : mode Présence en plein écran, mode Contrôle qui affiche la fiche, mode Borne d\'auto-accueil.',
      'Repas compris dans le prix : les cases repas servent à compter les couverts.',
      'Drive classé par édition : un dossier « JEF année » pour les stagiaires, les badges et les documents.',
      'Le logo du menu ramène au tableau de bord, et les chiffres clés ouvrent la liste correspondante.'
    ] },
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
