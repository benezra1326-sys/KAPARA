import type fr from './fr';
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : string };

/** English — complete (checked against fr.ts by `npm run i18n:check -w @kapara/mobile`). */
const en: DeepPartial<typeof fr> = {
  tabs: { crossed: 'Crossed', forYou: 'For you', live: 'Live', messages: 'Messages', me: 'Me' },
  common: {
    demoBadge: 'Demo profile', retry: 'Try again', preferNotToSay: 'I’d rather not say', loading: 'Loading…',
    offline: 'You’re offline. What you see may be slightly out of date.',
    save: 'Save', cancel: 'Cancel', close: 'Close', back: 'Back', next: 'Next', done: 'Done', edit: 'Edit',
    send: 'Send', confirm: 'Confirm', seeMore: 'See more', notAnswered: 'Not answered', verified: 'Verified profile',
    ageCity: '{{age}} · {{city}}', photoOf: 'Photo of {{name}}, {{index}} of {{count}}',
  },
  errors: {
    generic: 'Something went wrong. Please try again in a moment.',
    network: 'Can’t connect. Check your network.',
    sessionExpired: 'Your session has expired. Please sign in again.',
    notFound: 'This profile is no longer available.',
  },
  demo: {
    banner: 'Demo mode: fictional profiles, illustrated portraits, no real data.',
    portraitsNote: 'Demo portraits are generated illustrations, not photos of real people.',
    youAre: 'In the demo, you are {{name}}.',
  },
  forYou: {
    title: 'For you', subtitle: 'Today’s selection',
    remaining_one: '{{count}} profile today', remaining_other: '{{count}} profiles today',
    doneTitle: 'That’s all for today', doneBody: 'Come back tomorrow for a new selection. Take your time with your conversations.',
    why: 'Why this suggestion', react: 'React to this', notForMe: 'Not for me', commentPlaceholder: 'Add a note (optional)',
    sent: 'Reaction sent. If it’s mutual, a conversation will open.', moreLikeThis: 'More profiles like this',
    notForMeTitle: 'What doesn’t feel right?', notForMeHint: 'Optional. It refines your next suggestions and stays between you and the app.',
    notForMeReasons: { values: 'Different values or practice', distance: 'Too far away', age: 'Age gap', intent: 'Looking for something different', other: 'Something else' },
  },
  reason: {
    'shared.shabbat': 'You experience Shabbat in a similar way', 'shared.practice': 'A similar relationship to tradition',
    'shared.kashrutHome': 'Compatible kashrut habits', 'shared.relationshipIntent': 'You’re looking for the same thing',
    'shared.holidays': 'You celebrate the holidays in a similar way', 'shared.community': 'A similar connection to community',
    'shared.children': 'Similar hopes for family life', 'shared.traditionPlace': 'Tradition plays a similar role in your lives',
    'shared.languages': 'You both speak $t(languages.{{value}})',
    nearby: 'You’re close by', crossedRecently: 'You crossed paths recently', 'feedback.moreLikeThis': 'Similar to profiles you liked',
  },
  prompts: {
    favorite_tradition: 'The tradition I hold dear', ideal_shabbat_meal: 'My ideal Shabbat meal', favorite_holiday: 'My favourite holiday',
    makes_me_laugh: 'What makes me laugh', project_excited_about: 'A project I’m excited about', perfect_sunday: 'My perfect Sunday',
    green_flag: 'What I love in someone', teach_me: 'Teach me…', family_recipe: 'The family recipe',
    currently_learning: 'Right now I’m learning', together_we_could: 'Together we could', best_advice: 'The best advice I’ve been given',
  },
  crossed: {
    title: 'Crossed', subtitle: 'Members you crossed paths with recently',
    offTitle: 'Crossed is off', offBody: 'If you turn it on, we use an approximate location to show members you crossed paths with. Never the time or the exact place. Both people must have it turned on.',
    enable: 'Turn on Crossed', disable: 'Turn off Crossed', permissionDenied: 'Location access is denied. You can allow it in your phone’s settings.',
    openSettings: 'Open settings',
    empty: 'Nobody yet. Crossings appear with a short delay, for discretion.', recently: 'Crossed recently',
    times_one: 'Crossed paths {{count}} time recently', times_other: 'Crossed paths {{count}} times recently',
    privacyNote: 'No place, no time: only the fact that you crossed paths.',
  },
  live: {
    title: 'Live', subtitle: 'Members available now',
    availableToggle: 'I’m available', availableHint: 'Visible for 15 minutes, then you’re invisible again.',
    invite: 'Suggest an audio call', empty: 'Nobody is available right now.',
    demoNotice: 'Demo mode: calls are simulated, no audio or video is transmitted.',
    consentSteps: 'Invitation, acceptance, then camera: every step is your choice.',
    presence: { available: 'Available', busy: 'Already on a call' },
    availableFor_one: '{{count}} minute left', availableFor_other: '{{count}} minutes left',
    state: {
      invited: 'Invitation sent', accepted: 'Invitation accepted', declined: 'Invitation declined', expired: 'Invitation expired',
      connected: 'Audio call in progress', video_requested: 'Video requested', video_on: 'Video on', ended: 'Call ended',
    },
    incomingTitle: '{{name}} suggests an audio call', incomingBody: 'You can accept, or decline without the other person being told why.',
    accept: 'Accept', decline: 'Decline', hangup: 'Hang up', mute: 'Mute', unmute: 'Unmute',
    requestVideo: 'Suggest video', videoRequestedBody: '{{name}} suggests turning video on. Your camera stays off until you turn it on.',
    acceptVideo: 'Turn on my camera', keepAudio: 'Stay on audio', cameraOff: 'Camera off',
    permissionMic: 'A call needs the microphone. You can allow it in settings.',
    permissionCamera: 'Camera access is denied. The call continues with audio.',
    callsFrom: { nobody: 'Nobody', matches: 'My contacts', members: 'All members' },
    report: 'Report this call',
  },
  messages: {
    title: 'Messages', empty: 'Your conversations will appear here after a mutual reaction or an accepted introduction.',
    composerPlaceholder: 'Write a message', newMatch: 'New contact', startHint: 'Start the conversation from what you liked.',
    origin: {
      likePrompt: 'It started with a reaction to “{{prompt}}”', likePhoto: 'It started with a reaction to a photo',
      introduction: 'Introduced by {{name}}', live_one: 'After a {{count}}-minute Live call', live_other: 'After a {{count}}-minute Live call',
    },
    theyReacted: 'They reacted to your profile', noReadReceipts: 'No read receipts: everyone replies at their own pace.',
    unmatch: 'End the conversation', unmatchConfirm: 'The conversation will close for both of you. This can’t be undone.',
  },
  introductions: {
    title: 'Introductions', intro: 'Introduce two people who should meet. Each one accepts separately; neither sees the other’s answer before replying.',
    propose: 'Introduce two people', pickA: 'First person', pickB: 'Second person',
    notePlaceholder: 'Why should they meet? (at least 10 characters)',
    incoming: 'You’re being introduced', outgoing: 'Your introductions', from: 'From {{name}}',
    accept: 'Accept the introduction', decline: 'No thanks',
    status: {
      proposed: 'Waiting for a reply', accepted_by_a: 'Accepted by one person', accepted_by_b: 'Accepted by one person',
      connected: 'Conversation open', declined: 'Not taken further', expired: 'Expired',
    },
    empty: 'No introductions yet.', notIntroducible: 'This person doesn’t want to be introduced right now.',
  },
  safety: {
    report: 'Report', block: 'Block', blockConfirm: 'You won’t see {{name}} anymore, and {{name}} won’t see you. They won’t be notified.',
    reportTitle: 'Why are you reporting this profile?', reportThanks: 'Thank you. Our team reviews every report.',
    reasons: { fake: 'Fake profile', inappropriate: 'Inappropriate content', harassment: 'Harassment', scam: 'Scam or request for money', underage: 'Underage person', other: 'Other' },
    detailsPlaceholder: 'Details (optional)',
  },
  me: {
    title: 'Me', editProfile: 'Edit my profile', preferences: 'My preferences', privacy: 'Privacy & visibility',
    introductions: 'Introductions', pause: 'Pause my profile', shabbatMode: 'Shabbat mode', signOut: 'Sign out',
    shabbatModeHint: 'From Friday evening to Saturday evening, your profile and notifications are paused, based on your city’s time.',
    pauseHint: 'You stay invisible in For you, Crossed and Live. Your conversations remain available.',
    language: 'App language', verify: 'Get my profile verified', deleteAccount: 'Delete my account',
  },
  profile: {
    about: 'About', languages: 'Languages', jewishLife: 'Jewish life', prompts: 'In a few words',
    gender: { woman: 'Woman', man: 'Man', nonbinary: 'Non-binary' },
    seeking: 'I’d like to meet', noPhotos: 'Add at least one photo to appear in suggestions.',
  },
  preferences: {
    title: 'My preferences', age: 'Age', ageRange: '{{min}} to {{max}}', distance: 'Distance', distanceKm: 'Up to {{km}} km',
    dealbreakers: 'Must-haves', dealbreakersHint: 'A profile that hasn’t answered is never excluded.',
    soft: 'Flexible preferences', weight: { 0: 'Doesn’t matter', 1: 'A plus', 2: 'Important', 3: 'Very important' },
  },
  jewishLife: {
    sectionTitle: 'Jewish life', sectionIntro: 'These answers are optional and can be changed. By default, only you can see them.',
    consentTitle: 'Share sensitive information', consentBody: 'This answer relates to your beliefs. Only the people you choose will see it, and it will be used for suggestions only if you allow it. You can withdraw it at any time.',
    consentAccept: 'I agree to share this answer', consentDecline: 'Keep it to myself', withdraw: 'Withdraw this answer',
    visibility: { private: 'Only me', matches: 'My contacts', members: 'Members' },
    visibilityLabel: 'Who can see this answer', useForMatching: 'Use for my suggestions',
    notePlaceholder: 'Add nuance in your own words (optional)',
    fields: {
      practice: 'Relationship to practice and tradition', partnerImportance: 'Meeting someone Jewish or open to Jewish life',
      shabbat: 'Shabbat', holidays: 'Holidays', kashrutHome: 'Kashrut at home', kashrutOutside: 'Kashrut when eating out',
      community: 'Synagogue or community', communityName: 'My community', traditionPlace: 'Tradition in daily life',
      culturalBackground: 'Heritage and cultural ties', relationshipIntent: 'What I’m looking for', children: 'Children and home',
    },
    options: {
      practice: {
        cultural: 'Cultural', traditional: 'Traditional', masorti: 'Masorti / Conservative', liberal_reform: 'Liberal / Reform', modern_orthodox: 'Modern Orthodox',
        orthodox: 'Orthodox', haredi: 'Haredi', spiritual: 'Spiritual', exploring: 'Exploring', secular: 'Secular', other: 'Another path',
      },
      partnerImportance: { essential: 'Essential', important: 'Important', open_to_jewish_life: 'Open to Jewish life', not_a_criterion: 'Not a criterion' },
      shabbat: {
        full_observance: 'I keep Shabbat', friday_dinner: 'Friday night dinner', sometimes: 'Now and then',
        family_occasions: 'With family, on some occasions', not_currently: 'Not at the moment', other: 'In my own way',
      },
      holidays: {
        all_major: 'All the major holidays', high_holidays_and_pesach: 'High Holidays and Pesach', some: 'Some holidays',
        cultural_only: 'Mostly for culture and family', not_currently: 'Not at the moment',
      },
      kashrut: {
        strict_home_and_out: 'Strictly, everywhere', kosher_home_flexible_out: 'At home, more flexible outside',
        no_pork_seafood: 'No pork or shellfish', vegetarian_for_kashrut: 'Vegetarian', not_kosher: 'I don’t keep kosher', other: 'In my own way',
      },
      community: {
        weekly: 'Every week', monthly: 'Once or twice a month', holidays: 'For the holidays', events_only: 'For events',
        rarely: 'Rarely', none: 'Not at all',
      },
      traditionPlace: { central: 'Central', important: 'Important', occasional: 'Occasional', personal_choice: 'A personal choice, day by day' },
      relationshipIntent: {
        marriage: 'A lifelong commitment', long_term: 'A long-term relationship', see_where_it_goes: 'See where it goes',
        friendship_first: 'Friendship first', not_sure_yet: 'Not sure yet',
      },
      children: {
        want: 'I’d like to have children', have_and_want_more: 'I have children and would like more', have_no_more: 'I have children, no more planned',
        open: 'Open', dont_want: 'I don’t want children', not_sure: 'Not sure yet',
      },
    },
  },
  privacy: {
    title: 'Privacy & visibility', crossed: 'Crossed', live: 'Live', liveCallsFrom: 'Who can suggest a call',
    introducible: 'My friends can introduce me', sensitiveData: 'My Jewish-life answers', exportData: 'Download my data',
    noInference: 'We never infer your religion, origins or health from your photos, name, location or activity.',
  },
  languages: {
    fr: 'French', en: 'English', he: 'Hebrew', ar: 'Arabic', es: 'Spanish', ru: 'Russian', it: 'Italian', de: 'German',
    pt: 'Portuguese', yi: 'Yiddish', lad: 'Ladino', am: 'Amharic',
  },
  regions: { 'fr-paris': 'Paris', 'gb-london': 'London', 'il-tel-aviv': 'Tel Aviv', 'us-new-york': 'New York' },
};
export default en;
