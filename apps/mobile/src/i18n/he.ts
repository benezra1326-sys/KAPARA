import type fr from './fr';
/** Like fr, plus the extra plural forms Hebrew needs (_two). */
type Catalog<T> = { [K in keyof T]?: T[K] extends object ? Catalog<T[K]> : string } & { [pluralForm: `${string}_two`]: string };

/**
 * Hebrew (RTL) — complete (checked against fr.ts by `npm run i18n:check -w @kapara/mobile`).
 * Addressing the reader: plural or infinitive forms, to stay gender-neutral.
 * Plurals: Hebrew uses _one, _two and _other.
 */
const he: Catalog<typeof fr> = {
  tabs: { crossed: 'הצטלבויות', forYou: 'בשבילך', live: 'לייב', messages: 'הודעות', me: 'אני' },
  common: {
    demoBadge: 'פרופיל לדוגמה', retry: 'לנסות שוב', preferNotToSay: 'מעדיפים לא לענות', loading: 'טוען…',
    offline: 'אין חיבור לרשת. ייתכן שהמידע המוצג אינו עדכני.',
    save: 'שמירה', cancel: 'ביטול', close: 'סגירה', back: 'חזרה', next: 'הבא', done: 'סיום', edit: 'עריכה',
    send: 'שליחה', confirm: 'אישור', seeMore: 'עוד', notAnswered: 'אין תשובה', verified: 'פרופיל מאומת',
    ageCity: '{{age}} · {{city}}', photoOf: 'תמונה של {{name}}, {{index}} מתוך {{count}}',
  },
  errors: {
    generic: 'משהו השתבש. כדאי לנסות שוב בעוד רגע.',
    network: 'אין חיבור. כדאי לבדוק את הרשת.',
    sessionExpired: 'פג תוקף החיבור. יש להתחבר מחדש.',
    notFound: 'הפרופיל הזה כבר אינו זמין.',
  },
  demo: {
    banner: 'מצב הדגמה: פרופילים בדיוניים, דיוקנאות מאוירים, ללא מידע אמיתי.',
    portraitsNote: 'דיוקנאות ההדגמה הם איורים שנוצרו בקוד, לא תמונות של אנשים אמיתיים.',
    youAre: 'בהדגמה, הפרופיל שלך הוא {{name}}.',
  },
  forYou: {
    title: 'בשבילך', subtitle: 'הבחירה של היום',
    remaining_one: 'פרופיל אחד היום', remaining_two: 'שני פרופילים היום', remaining_other: '{{count}} פרופילים היום',
    doneTitle: 'זה הכול להיום', doneBody: 'מחר תחכה כאן בחירה חדשה. בינתיים אפשר להקדיש זמן לשיחות.',
    why: 'למה ההצעה הזאת', react: 'להגיב לזה', notForMe: 'לא בשבילי', commentPlaceholder: 'להוסיף מילה (לא חובה)',
    sent: 'התגובה נשלחה. אם זה הדדי, תיפתח שיחה.', moreLikeThis: 'עוד פרופילים כאלה',
    notForMeTitle: 'מה לא מתאים?', notForMeHint: 'לא חובה. זה משפר את ההצעות הבאות ונשאר בינך לבין האפליקציה.',
    notForMeReasons: { too_far: 'רחוק מדי', values_differ: 'ערכים או אורח חיים שונים', intent_differs: 'מחפשים דברים שונים', not_my_type: 'לא הטיפוס שלי', other: 'סיבה אחרת' },
  },
  reason: {
    shared: {
      practice: 'יחס דומה למסורת: $t(jewishLife.options.practice.{{value}})',
      partnerImportance: 'אותה חשיבות לחיים יהודיים משותפים',
      shabbat: 'שבת: $t(jewishLife.options.shabbat.{{value}})',
      holidays: 'חגים: $t(jewishLife.options.holidays.{{value}})',
      kashrutHome: 'כשרות בבית: $t(jewishLife.options.kashrut.{{value}})',
      kashrutOutside: 'כשרות מחוץ לבית: $t(jewishLife.options.kashrut.{{value}})',
      community: 'קהילה: $t(jewishLife.options.community.{{value}})',
      traditionPlace: 'למסורת מקום דומה בחיים שלכם',
      relationshipIntent: 'אתם מחפשים את אותו הדבר',
      children: 'רצונות דומים לגבי משפחה',
    },
    same_intent: 'אותה כוונה: $t(jewishLife.options.relationshipIntent.{{value}})',
    like_profiles_you_appreciated: 'דומה לפרופילים שאהבת',
    nearby: 'פחות מ־{{km}} ק״מ ממך', shared_language: 'שניכם מדברים $t(languages.{{language}})',
    fits_your_criteria: 'מתאים לקריטריונים שלך', crossed_recently: 'הדרכים שלכם הצטלבו לאחרונה',
  },
  prompts: {
    favorite_tradition: 'המסורת הקרובה ללבי', ideal_shabbat_meal: 'ארוחת השבת האידיאלית שלי', favorite_holiday: 'החג האהוב עליי',
    makes_me_laugh: 'מה מצחיק אותי', project_excited_about: 'הפרויקט שמלהיב אותי', perfect_sunday: 'יום החופש המושלם שלי',
    green_flag: 'מה שאני אוהב/ת באדם', teach_me: 'תלמדו אותי…', family_recipe: 'המתכון המשפחתי',
    currently_learning: 'עכשיו אני לומד/ת', together_we_could: 'ביחד נוכל', best_advice: 'העצה הכי טובה שקיבלתי',
  },
  crossed: {
    title: 'הצטלבויות', subtitle: 'חברים שהדרכים שלכם הצטלבו בימים האחרונים',
    offTitle: 'הצטלבויות כבויות', offBody: 'כשמפעילים, אנחנו משתמשים במיקום משוער כדי להציג חברים שהדרכים שלכם הצטלבו. אף פעם לא השעה או המקום המדויק. שני הצדדים צריכים להפעיל את האפשרות.',
    enable: 'הפעלת הצטלבויות', disable: 'כיבוי הצטלבויות', permissionDenied: 'הגישה למיקום נדחתה. אפשר לאשר אותה בהגדרות הטלפון.',
    openSettings: 'פתיחת ההגדרות',
    empty: 'עדיין אין אף אחד. הצטלבויות מופיעות באיחור קל, מטעמי פרטיות.', recently: 'הצטלבות לאחרונה',
    times_one: 'הצטלבות אחת בימים האחרונים', times_two: 'שתי הצטלבויות בימים האחרונים', times_other: '{{count}} הצטלבויות בימים האחרונים',
    privacyNote: 'בלי מקום ובלי שעה: רק העובדה שהדרכים הצטלבו.',
  },
  live: {
    title: 'לייב', subtitle: 'חברים שזמינים עכשיו',
    availableToggle: 'אני זמין/ה', availableHint: 'גלוי למשך 15 דקות, ואז חוזרים להיות בלתי נראים.',
    invite: 'להציע שיחה קולית', empty: 'אף אחד לא זמין כרגע.',
    demoNotice: 'מצב הדגמה: השיחות מדומות, לא מועבר שום קול או וידאו.',
    consentSteps: 'הזמנה, אישור ואז מצלמה: כל שלב הוא בחירה שלך.',
    presence: { available: 'זמין/ה', busy: 'כבר בשיחה' },
    availableFor_one: 'נותרה דקה אחת', availableFor_two: 'נותרו שתי דקות', availableFor_other: 'נותרו {{count}} דקות',
    state: {
      invited: 'ההזמנה נשלחה', accepted: 'ההזמנה התקבלה', declined: 'ההזמנה נדחתה', expired: 'פג תוקף ההזמנה',
      connected: 'שיחה קולית פעילה', video_requested: 'בקשה לווידאו', video_on: 'הווידאו פעיל', ended: 'השיחה הסתיימה',
    },
    incomingTitle: '{{name}} מציע/ה שיחה קולית', incomingBody: 'אפשר לאשר, או לדחות בלי שהצד השני יידע את הסיבה.',
    accept: 'אישור', decline: 'דחייה', hangup: 'ניתוק', mute: 'השתקת המיקרופון', unmute: 'ביטול ההשתקה',
    requestVideo: 'להציע וידאו', videoRequestedBody: '{{name}} מציע/ה להפעיל וידאו. המצלמה שלך נשארת כבויה עד שתפעילו אותה.',
    acceptVideo: 'הפעלת המצלמה שלי', keepAudio: 'להישאר בשיחה קולית', cameraOff: 'המצלמה כבויה',
    permissionMic: 'לשיחה צריך מיקרופון. אפשר לאשר אותו בהגדרות.',
    permissionCamera: 'הגישה למצלמה נדחתה. השיחה ממשיכה בקול בלבד.',
    callsFrom: { nobody: 'אף אחד', matches: 'אנשי הקשר שלי', members: 'כל החברים' },
    report: 'דיווח על השיחה',
  },
  messages: {
    title: 'הודעות', empty: 'השיחות יופיעו כאן אחרי תגובה הדדית או היכרות שהתקבלה.',
    composerPlaceholder: 'כתיבת הודעה', newMatch: 'קשר חדש', startHint: 'אפשר לפתוח את השיחה ממה שמצא חן בעיניך.',
    origin: {
      likePrompt: 'הכול התחיל בתגובה ל„{{prompt}}”', likePhoto: 'הכול התחיל בתגובה לתמונה',
      introduction: 'הכרתם דרך {{name}}', live_one: 'אחרי שיחת לייב של דקה', live_two: 'אחרי שיחת לייב של שתי דקות', live_other: 'אחרי שיחת לייב של {{count}} דקות',
    },
    theyReacted: 'הגיבו לפרופיל שלך', noReadReceipts: 'בלי אישורי קריאה: כל אחד עונה בקצב שלו.',
    unmatch: 'סיום השיחה', unmatchConfirm: 'השיחה תיסגר לשניכם. אי אפשר לבטל את הפעולה.',
  },
  introductions: {
    title: 'היכרויות', intro: 'אפשר להכיר בין שני אנשים שכדאי שייפגשו. כל אחד מאשר בנפרד, ואף אחד לא רואה את תשובת השני לפני שענה.',
    propose: 'להכיר בין שניים', pickA: 'האדם הראשון', pickB: 'האדם השני',
    notePlaceholder: 'למה כדאי שייפגשו? (לפחות 10 תווים)',
    incoming: 'מכירים לך מישהו', outgoing: 'ההיכרויות שלך', from: 'מאת {{name}}',
    accept: 'לקבל את ההיכרות', decline: 'לא, תודה',
    status: {
      proposed: 'ממתין לתשובה', accepted_by_a: 'אושר על ידי צד אחד', accepted_by_b: 'אושר על ידי צד אחד',
      connected: 'השיחה נפתחה', declined: 'לא התקדם', expired: 'פג תוקף',
    },
    empty: 'עדיין אין היכרויות.', notIntroducible: 'האדם הזה לא מעוניין בהיכרויות כרגע.',
  },
  safety: {
    report: 'דיווח', block: 'חסימה', blockConfirm: 'לא תראו יותר את {{name}}, ו{{name}} לא יראו אתכם. לא תישלח על כך הודעה.',
    reportTitle: 'למה לדווח על הפרופיל הזה?', reportThanks: 'תודה. הצוות שלנו בודק כל דיווח.',
    reasons: { fake: 'פרופיל מזויף', inappropriate: 'תוכן לא הולם', harassment: 'הטרדה', scam: 'הונאה או בקשת כסף', underage: 'קטין/ה', other: 'אחר' },
    detailsPlaceholder: 'פרטים (לא חובה)',
  },
  me: {
    title: 'אני', editProfile: 'עריכת הפרופיל', preferences: 'ההעדפות שלי', privacy: 'פרטיות ונראות',
    introductions: 'היכרויות', pause: 'השהיית הפרופיל', shabbatMode: 'מצב שבת', signOut: 'התנתקות',
    shabbatModeHint: 'מיום שישי בערב ועד מוצאי שבת, הפרופיל וההתראות מושהים לפי השעה בעיר שלך.',
    pauseHint: 'לא תופיעו ב„בשבילך”, ב„הצטלבויות” ובלייב. השיחות נשארות זמינות.',
    language: 'שפת האפליקציה', verify: 'אימות הפרופיל', deleteAccount: 'מחיקת החשבון',
  },
  profile: {
    about: 'קצת עליי', languages: 'שפות', jewishLife: 'חיים יהודיים', prompts: 'במילים ספורות',
    gender: { woman: 'אישה', man: 'גבר', nonbinary: 'א־בינארי' },
    seeking: 'מעוניין/ת להכיר', noPhotos: 'כדי להופיע בהצעות צריך להוסיף לפחות תמונה אחת.',
  },
  preferences: {
    title: 'ההעדפות שלי', age: 'גיל', ageRange: '{{min}} עד {{max}}', distance: 'מרחק', distanceKm: 'עד {{km}} ק״מ',
    dealbreakers: 'תנאים הכרחיים', dealbreakersHint: 'פרופיל שלא ענה לעולם לא מוחרג.',
    soft: 'העדפות גמישות', weight: { 0: 'לא משנה', 1: 'יתרון', 2: 'חשוב', 3: 'חשוב מאוד' },
  },
  jewishLife: {
    sectionTitle: 'חיים יהודיים', sectionIntro: 'התשובות האלה אינן חובה ואפשר לשנות אותן. כברירת מחדל, רק את/ה רואים אותן.',
    consentTitle: 'שיתוף מידע רגיש', consentBody: 'התשובה הזאת נוגעת לאמונות שלך. רק מי שבחרת יראו אותה, והיא תשמש להצעות רק באישורך. אפשר לבטל את השיתוף בכל רגע.',
    consentAccept: 'אני מסכים/ה לשתף את התשובה', consentDecline: 'לשמור לעצמי', withdraw: 'ביטול התשובה',
    visibility: { private: 'רק אני', matches: 'אנשי הקשר שלי', members: 'חברים' },
    visibilityLabel: 'מי יכול לראות את התשובה', useForMatching: 'להשתמש בתשובה להצעות שלי',
    notePlaceholder: 'להוסיף ניואנס במילים שלך (לא חובה)',
    fields: {
      practice: 'היחס למסורת ולשמירת מצוות', partnerImportance: 'להכיר אדם יהודי או פתוח לחיים יהודיים',
      shabbat: 'שבת', holidays: 'חגים', kashrutHome: 'כשרות בבית', kashrutOutside: 'כשרות מחוץ לבית',
      community: 'בית כנסת או קהילה', communityName: 'הקהילה שלי', traditionPlace: 'מקום המסורת ביום־יום',
      culturalBackground: 'מוצא וקשרים תרבותיים', relationshipIntent: 'מה אני מחפש/ת', children: 'ילדים ובית',
    },
    options: {
      practice: {
        cultural: 'יהדות תרבותית', traditional: 'מסורתי/ת', masorti: 'מסורתי/ת־קונסרבטיבי/ת', liberal_reform: 'רפורמי/ת', modern_orthodox: 'דתי/ה מודרני/ת',
        orthodox: 'דתי/ה', haredi: 'חרדי/ת', spiritual: 'רוחני/ת', exploring: 'בחיפוש', secular: 'חילוני/ת', other: 'דרך אחרת',
      },
      partnerImportance: { essential: 'הכרחי', important: 'חשוב', open_to_jewish_life: 'פתיחות לחיים יהודיים', not_a_criterion: 'לא שיקול' },
      shabbat: {
        full_observance: 'שומר/ת שבת', friday_dinner: 'ארוחת ליל שבת', sometimes: 'מדי פעם',
        family_occasions: 'עם המשפחה, באירועים', not_currently: 'לא כרגע', other: 'בדרך שלי',
      },
      holidays: {
        all_major: 'כל החגים הגדולים', high_holidays_and_pesach: 'חגי תשרי ופסח', some: 'חלק מהחגים',
        cultural_only: 'בעיקר מסיבות תרבותיות ומשפחתיות', not_currently: 'לא כרגע',
      },
      kashrut: {
        strict_home_and_out: 'בהקפדה, בכל מקום', kosher_home_flexible_out: 'בבית, גמיש יותר בחוץ',
        no_pork_seafood: 'בלי חזיר ופירות ים', vegetarian_for_kashrut: 'צמחוני/ת', not_kosher: 'לא שומר/ת כשרות', other: 'בדרך שלי',
      },
      community: {
        weekly: 'כל שבוע', monthly: 'פעם־פעמיים בחודש', holidays: 'בחגים', events_only: 'באירועים',
        rarely: 'לעיתים רחוקות', none: 'בכלל לא',
      },
      traditionPlace: { central: 'מרכזי', important: 'חשוב', occasional: 'מדי פעם', personal_choice: 'בחירה אישית, יום־יום' },
      relationshipIntent: {
        marriage: 'מחויבות לכל החיים', long_term: 'קשר ארוך טווח', see_where_it_goes: 'לראות לאן זה הולך',
        friendship_first: 'קודם כול חברות', not_sure_yet: 'עוד לא יודע/ת',
      },
      children: {
        want: 'רוצה ילדים', have_and_want_more: 'יש לי ילדים ורוצה עוד', have_no_more: 'יש לי ילדים, בלי תוכניות לעוד',
        open: 'פתוח/ה', dont_want: 'לא רוצה ילדים', not_sure: 'עוד לא יודע/ת',
      },
    },
  },
  privacy: {
    title: 'פרטיות ונראות', crossed: 'הצטלבויות', live: 'לייב', liveCallsFrom: 'מי יכול להציע לי שיחה',
    introducible: 'חברים יכולים להכיר לי אנשים', sensitiveData: 'התשובות שלי על חיים יהודיים', exportData: 'הורדת המידע שלי',
    noInference: 'לעולם איננו מסיקים דת, מוצא או מצב בריאותי מתמונות, משם, ממיקום או מפעילות באפליקציה.',
  },
  languages: {
    fr: 'צרפתית', en: 'אנגלית', he: 'עברית', ar: 'ערבית', es: 'ספרדית', ru: 'רוסית', it: 'איטלקית', de: 'גרמנית',
    pt: 'פורטוגזית', yi: 'יידיש', lad: 'לדינו', am: 'אמהרית',
  },
  regions: { 'fr-paris': 'פריז', 'gb-london': 'לונדון', 'il-tel-aviv': 'תל אביב', 'us-new-york': 'ניו יורק' },
};
export default he;
