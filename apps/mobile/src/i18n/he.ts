// Hebrew (RTL). Partial for now; falls back to French then English.
export default {
  tabs: { crossed: 'הצטלבויות', forYou: 'בשבילך', live: 'לייב', messages: 'הודעות', me: 'אני' },
  common: { demoBadge: 'פרופיל לדוגמה' },
  live: {
    title: 'לייב', subtitle: 'חברים זמינים עכשיו', availableToggle: 'אני זמין/ה',
    availableHint: 'גלוי/ה למשך {{minutes}} דקות, ואז שוב בלתי נראה/ית.', availableFor: 'גלוי/ה עוד {{minutes}} דק׳',
    availableOff: 'את/ה בלתי נראה/ית. אחרים לא רואים אותך כאן.',
    invite: 'להציע שיחה קולית', inviteHint: 'קודם קול. המצלמה נדלקת רק אם שניכם מסכימים.',
    empty: 'אף אחד לא זמין כרגע.', enable: 'להפעיל לייב', whoCanCall: 'מי יכול להתקשר אליי', settingsLink: 'הגדרות לייב',
    demoLocalNotice: 'מצב הדגמה: פרופילים בדויים ושיחות מדומות. שום קול או תמונה לא מועברים.',
    demoNotice: 'מצב הדגמה: השיחות מדומות, שום קול או וידאו לא מועברים.',
    consentSteps: 'הזמנה, הסכמה ואז מצלמה: כל שלב הוא הבחירה שלך.',
  },
  call: {
    incomingTitle: '{{name}} מציע/ה שיחה קולית', incomingHint: 'אם תסכים/י, השיחה מתחילה בקול בלבד. המצלמה נשארת כבויה.',
    accept: 'לקבל בקול', decline: 'לא עכשיו', hangup: 'לנתק', audioOnly: 'קול בלבד',
    proposeVideo: 'להציע וידאו', videoRequestTitle: '{{name}} מציע/ה להפעיל וידאו',
    videoRequestBody: 'המצלמה שלך נשארת כבויה עד שתסכים/י. אפשר לכבות אותה בכל רגע.',
    acceptVideo: 'להפעיל את המצלמה שלי', declineVideo: 'להישאר בקול', reportSend: 'לדווח ולחסום',
    demoBanner: 'הדגמה: שיחה מדומה, שום דבר לא מועבר.',
  },
};
