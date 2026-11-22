/**
 * French — reference catalogue. Every key added here must also exist in en.ts
 * and he.ts (checked by `npm run i18n:check -w @kapara/mobile`).
 * Plurals follow i18next suffixes (_one, _other; Hebrew adds _two).
 */
export default {
  tabs: { crossed: 'Croisés', forYou: 'Pour toi', live: 'Live', messages: 'Messages', me: 'Moi' },
  common: {
    demoBadge: 'Profil de démonstration', retry: 'Réessayer', preferNotToSay: 'Je préfère ne pas répondre', loading: 'Chargement…',
    offline: 'Vous êtes hors ligne. Les dernières données affichées peuvent dater un peu.',
    save: 'Enregistrer', cancel: 'Annuler', close: 'Fermer', back: 'Retour', next: 'Suivant', done: 'Terminé', edit: 'Modifier',
    send: 'Envoyer', confirm: 'Confirmer', seeMore: 'Voir plus', notAnswered: 'Pas de réponse', verified: 'Profil vérifié',
    ageCity: '{{age}} ans · {{city}}', photoOf: 'Photo de {{name}}, {{index}} sur {{count}}',
  },
  errors: {
    generic: 'Un problème est survenu. Réessayez dans un instant.',
    network: 'Connexion impossible. Vérifiez votre réseau.',
    sessionExpired: 'Votre session a expiré. Reconnectez-vous.',
    notFound: 'Ce profil n’est plus disponible.',
  },
  demo: {
    banner: 'Mode démonstration : profils fictifs, portraits illustrés, aucune donnée réelle.',
    portraitsNote: 'Les portraits de démonstration sont des illustrations générées, pas des photos de personnes réelles.',
    youAre: 'Dans la démo, vous êtes {{name}}.',
  },
  forYou: {
    title: 'Pour toi', subtitle: 'Votre sélection du jour',
    remaining_one: '{{count}} profil aujourd’hui', remaining_other: '{{count}} profils aujourd’hui',
    doneTitle: 'C’est tout pour aujourd’hui', doneBody: 'Revenez demain pour une nouvelle sélection. Prenez le temps de répondre à vos conversations.',
    why: 'Pourquoi cette suggestion', react: 'Réagir à ceci', notForMe: 'Pas pour moi', commentPlaceholder: 'Ajouter un mot (facultatif)',
    sent: 'Réaction envoyée. Si c’est réciproque, une conversation s’ouvrira.', moreLikeThis: 'Plus de profils comme celui-ci',
    notForMeTitle: 'Qu’est-ce qui ne vous correspond pas ?', notForMeHint: 'Facultatif. Cela affine vos prochaines suggestions et reste entre vous et l’application.',
    notForMeReasons: { values: 'Valeurs ou pratique différentes', distance: 'Trop loin', age: 'Écart d’âge', intent: 'Pas la même intention', other: 'Autre raison' },
  },
  reason: {
    'shared.shabbat': 'Vous vivez Shabbat de façon proche', 'shared.practice': 'Un rapport à la tradition proche du vôtre',
    'shared.kashrutHome': 'Des habitudes de cacherout compatibles', 'shared.relationshipIntent': 'Vous cherchez la même chose',
    'shared.holidays': 'Vous célébrez les fêtes de façon proche', 'shared.community': 'Un lien à la communauté comparable',
    'shared.children': 'Des souhaits proches pour la famille', 'shared.traditionPlace': 'La tradition a une place comparable dans vos vies',
    'shared.languages': 'Vous parlez tous les deux $t(languages.{{value}})',
    nearby: 'Vous êtes proches', crossedRecently: 'Vous vous êtes croisés récemment', 'feedback.moreLikeThis': 'Proche des profils que vous avez aimés',
  },
  prompts: {
    favorite_tradition: 'La tradition qui me tient à cœur', ideal_shabbat_meal: 'Mon repas de Shabbat idéal', favorite_holiday: 'Ma fête préférée',
    makes_me_laugh: 'Ce qui me fait rire', project_excited_about: 'Le projet qui m’enthousiasme', perfect_sunday: 'Mon dimanche parfait',
    green_flag: 'Ce qui me plaît chez quelqu’un', teach_me: 'Apprends-moi…', family_recipe: 'La recette de famille',
    currently_learning: 'En ce moment, j’apprends', together_we_could: 'Ensemble, on pourrait', best_advice: 'Le meilleur conseil qu’on m’ait donné',
  },
  crossed: {
    title: 'Croisés', subtitle: 'Des membres croisés ces derniers jours',
    offTitle: 'Croisés est désactivé', offBody: 'Si vous l’activez, nous utilisons une position approximative pour vous montrer les membres que vous avez croisés. Jamais l’heure ni le lieu exact. Les deux personnes doivent l’avoir activé.',
    enable: 'Activer Croisés', disable: 'Désactiver Croisés', permissionDenied: 'La localisation est refusée. Vous pouvez l’autoriser dans les réglages du téléphone.',
    openSettings: 'Ouvrir les réglages',
    empty: 'Personne pour l’instant. Vos croisements apparaissent avec un peu de délai, par discrétion.', recently: 'Croisé·e récemment',
    times_one: 'Croisé·e {{count}} fois ces derniers jours', times_other: 'Croisé·e {{count}} fois ces derniers jours',
    privacyNote: 'Ni lieu, ni heure : seulement le fait de vous être croisés.',
  },
  live: {
    title: 'Live', subtitle: 'Membres disponibles maintenant',
    availableToggle: 'Je suis disponible', availableHint: 'Visible pendant 15 minutes, puis vous redevenez invisible.',
    invite: 'Proposer un appel audio', empty: 'Personne n’est disponible pour le moment.',
    demoNotice: 'Mode démonstration : les appels sont simulés, aucun audio ni vidéo n’est transmis.',
    consentSteps: 'Invitation, acceptation, puis caméra : chaque étape est votre choix.',
    presence: { available: 'Disponible', busy: 'Déjà en appel' },
    availableFor_one: 'Encore {{count}} minute', availableFor_other: 'Encore {{count}} minutes',
    state: {
      invited: 'Invitation envoyée', accepted: 'Invitation acceptée', declined: 'Invitation déclinée', expired: 'Invitation expirée',
      connected: 'Appel audio en cours', video_requested: 'Demande de vidéo', video_on: 'Vidéo activée', ended: 'Appel terminé',
    },
    incomingTitle: '{{name}} vous propose un appel audio', incomingBody: 'Vous pouvez accepter, ou décliner sans que l’autre personne soit notifiée de la raison.',
    accept: 'Accepter', decline: 'Décliner', hangup: 'Raccrocher', mute: 'Couper le micro', unmute: 'Réactiver le micro',
    requestVideo: 'Proposer la vidéo', videoRequestedBody: '{{name}} propose d’activer la vidéo. Votre caméra reste éteinte tant que vous ne l’allumez pas.',
    acceptVideo: 'Activer ma caméra', keepAudio: 'Rester en audio', cameraOff: 'Caméra éteinte',
    permissionMic: 'Le micro est nécessaire pour un appel. Vous pouvez l’autoriser dans les réglages.',
    permissionCamera: 'La caméra est refusée. L’appel continue en audio.',
    callsFrom: { nobody: 'Personne', matches: 'Mes contacts', members: 'Tous les membres' },
    report: 'Signaler cet appel',
  },
  messages: {
    title: 'Messages', empty: 'Vos conversations apparaîtront ici après une réaction réciproque ou une présentation acceptée.',
    composerPlaceholder: 'Écrire un message', newMatch: 'Nouveau contact', startHint: 'Lancez la conversation à partir de ce qui vous a plu.',
    origin: {
      likePrompt: 'Tout a commencé par une réaction à « {{prompt}} »', likePhoto: 'Tout a commencé par une réaction à une photo',
      introduction: 'Présentés par {{name}}', live_one: 'Après un appel Live de {{count}} minute', live_other: 'Après un appel Live de {{count}} minutes',
    },
    theyReacted: 'Ils ont réagi à votre profil', noReadReceipts: 'Pas d’accusés de lecture : chacun répond à son rythme.',
    unmatch: 'Mettre fin à la conversation', unmatchConfirm: 'La conversation sera fermée pour vous deux. Cette action est définitive.',
  },
  introductions: {
    title: 'Présentations', intro: 'Présentez deux personnes qui devraient se rencontrer. Chacune accepte séparément ; aucune ne voit la réponse de l’autre avant d’avoir répondu.',
    propose: 'Présenter deux personnes', pickA: 'Première personne', pickB: 'Deuxième personne',
    notePlaceholder: 'Pourquoi devraient-ils se rencontrer ? (10 caractères minimum)',
    incoming: 'On vous présente', outgoing: 'Vos présentations', from: 'De la part de {{name}}',
    accept: 'Accepter la présentation', decline: 'Non merci',
    status: {
      proposed: 'En attente de réponse', accepted_by_a: 'Acceptée par une personne', accepted_by_b: 'Acceptée par une personne',
      connected: 'Conversation ouverte', declined: 'Pas de suite', expired: 'Expirée',
    },
    empty: 'Aucune présentation pour l’instant.', notIntroducible: 'Cette personne ne souhaite pas être présentée pour le moment.',
  },
  safety: {
    report: 'Signaler', block: 'Bloquer', blockConfirm: 'Vous ne verrez plus {{name}}, et {{name}} ne vous verra plus. Cette personne ne sera pas prévenue.',
    reportTitle: 'Pourquoi signalez-vous ce profil ?', reportThanks: 'Merci. Notre équipe examine chaque signalement.',
    reasons: { fake: 'Faux profil', inappropriate: 'Contenu inapproprié', harassment: 'Harcèlement', scam: 'Arnaque ou demande d’argent', underage: 'Personne mineure', other: 'Autre' },
    detailsPlaceholder: 'Détails (facultatif)',
  },
  me: {
    title: 'Moi', editProfile: 'Modifier mon profil', preferences: 'Mes préférences', privacy: 'Confidentialité et visibilité',
    introductions: 'Présentations', pause: 'Mettre mon profil en pause', shabbatMode: 'Mode Shabbat', signOut: 'Se déconnecter',
    shabbatModeHint: 'Du vendredi soir au samedi soir, votre profil et vos notifications sont en pause, selon l’heure de votre ville.',
    pauseHint: 'Vous restez invisible dans Pour toi, Croisés et Live. Vos conversations restent accessibles.',
    language: 'Langue de l’application', verify: 'Faire vérifier mon profil', deleteAccount: 'Supprimer mon compte',
  },
  profile: {
    about: 'À propos', languages: 'Langues', jewishLife: 'Vie juive', prompts: 'En quelques mots',
    gender: { woman: 'Femme', man: 'Homme', nonbinary: 'Non binaire' },
    seeking: 'Je souhaite rencontrer', noPhotos: 'Ajoutez au moins une photo pour apparaître dans les suggestions.',
  },
  preferences: {
    title: 'Mes préférences', age: 'Âge', ageRange: 'De {{min}} à {{max}} ans', distance: 'Distance', distanceKm: 'Jusqu’à {{km}} km',
    dealbreakers: 'Critères indispensables', dealbreakersHint: 'Un profil qui n’a pas répondu n’est jamais exclu.',
    soft: 'Préférences souples', weight: { 0: 'Sans importance', 1: 'Un plus', 2: 'Important', 3: 'Très important' },
  },
  jewishLife: {
    sectionTitle: 'Vie juive', sectionIntro: 'Ces réponses sont facultatives et modifiables. Par défaut, elles ne sont visibles que par vous.',
    consentTitle: 'Partager une information sensible', consentBody: 'Cette réponse touche à vos convictions. Elle ne sera visible que par les personnes que vous choisissez et utilisée pour les suggestions seulement si vous l’autorisez. Vous pouvez la retirer à tout moment.',
    consentAccept: 'J’accepte de partager cette réponse', consentDecline: 'Garder pour moi', withdraw: 'Retirer cette réponse',
    visibility: { private: 'Moi seul·e', matches: 'Mes contacts', members: 'Membres' },
    visibilityLabel: 'Qui peut voir cette réponse', useForMatching: 'Utiliser pour mes suggestions',
    notePlaceholder: 'Nuancer avec vos mots (facultatif)',
    fields: {
      practice: 'Rapport à la pratique et à la tradition', partnerImportance: 'Rencontrer une personne juive ou ouverte à une vie juive',
      shabbat: 'Shabbat', holidays: 'Les fêtes', kashrutHome: 'Cacherout à la maison', kashrutOutside: 'Cacherout à l’extérieur',
      community: 'Synagogue ou communauté', communityName: 'Ma communauté', traditionPlace: 'Place de la tradition au quotidien',
      culturalBackground: 'Origines et liens culturels', relationshipIntent: 'Ce que je cherche', children: 'Enfants et foyer',
    },
    options: {
      practice: {
        cultural: 'Culturel·le', traditional: 'Traditionaliste', masorti: 'Massorti', liberal_reform: 'Libéral·e', modern_orthodox: 'Orthodoxe moderne',
        orthodox: 'Orthodoxe', haredi: 'Haredi', spiritual: 'Spirituel·le', exploring: 'En questionnement', secular: 'Laïque', other: 'Autre parcours',
      },
      partnerImportance: { essential: 'Essentiel', important: 'Important', open_to_jewish_life: 'Ouvert·e à une vie juive', not_a_criterion: 'Pas un critère' },
      shabbat: {
        full_observance: 'Je respecte Shabbat', friday_dinner: 'Le dîner du vendredi soir', sometimes: 'De temps en temps',
        family_occasions: 'En famille, à certaines occasions', not_currently: 'Pas en ce moment', other: 'À ma façon',
      },
      holidays: {
        all_major: 'Toutes les grandes fêtes', high_holidays_and_pesach: 'Les fêtes de Tichri et Pessah', some: 'Certaines fêtes',
        cultural_only: 'Surtout pour la culture et la famille', not_currently: 'Pas en ce moment',
      },
      kashrut: {
        strict_home_and_out: 'Strictement, partout', kosher_home_flexible_out: 'À la maison, plus souple à l’extérieur',
        no_pork_seafood: 'Sans porc ni fruits de mer', vegetarian_for_kashrut: 'Végétarien·ne', not_kosher: 'Je ne mange pas cacher', other: 'À ma façon',
      },
      community: {
        weekly: 'Chaque semaine', monthly: 'Une ou deux fois par mois', holidays: 'Pour les fêtes', events_only: 'Pour des événements',
        rarely: 'Rarement', none: 'Pas de fréquentation',
      },
      traditionPlace: { central: 'Centrale', important: 'Importante', occasional: 'Ponctuelle', personal_choice: 'Un choix personnel, au jour le jour' },
      relationshipIntent: {
        marriage: 'Un engagement pour la vie', long_term: 'Une relation durable', see_where_it_goes: 'Voir où cela mène',
        friendship_first: 'D’abord une amitié', not_sure_yet: 'Je ne sais pas encore',
      },
      children: {
        want: 'J’aimerais avoir des enfants', have_and_want_more: 'J’ai des enfants et j’en souhaite d’autres', have_no_more: 'J’ai des enfants, pas d’autres en projet',
        open: 'Ouvert·e', dont_want: 'Je ne souhaite pas d’enfants', not_sure: 'Je ne sais pas encore',
      },
    },
  },
  privacy: {
    title: 'Confidentialité et visibilité', crossed: 'Croisés', live: 'Live', liveCallsFrom: 'Qui peut me proposer un appel',
    introducible: 'Mes amis peuvent me présenter', sensitiveData: 'Mes réponses sur la vie juive', exportData: 'Télécharger mes données',
    noInference: 'Nous ne déduisons jamais votre religion, vos origines ou votre santé à partir de vos photos, de votre nom, de votre position ou de votre activité.',
  },
  languages: {
    fr: 'français', en: 'anglais', he: 'hébreu', ar: 'arabe', es: 'espagnol', ru: 'russe', it: 'italien', de: 'allemand',
    pt: 'portugais', yi: 'yiddish', lad: 'judéo-espagnol', am: 'amharique',
  },
  regions: { 'fr-paris': 'Paris', 'gb-london': 'Londres', 'il-tel-aviv': 'Tel-Aviv', 'us-new-york': 'New York' },
};
