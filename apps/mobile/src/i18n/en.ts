import type fr from './fr';
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : string };

const en: DeepPartial<typeof fr> = {
  tabs: { crossed: 'Crossed', forYou: 'For you', live: 'Live', messages: 'Messages', me: 'Me' },
  common: { demoBadge: 'Demo profile', retry: 'Retry', preferNotToSay: 'I’d rather not say', loading: 'Loading…' },
  forYou: { title: 'For you', subtitle: 'Today’s selection', doneTitle: 'That’s all for today', why: 'Why this suggestion', react: 'React to this', notForMe: 'Not for me' },
  crossed: { title: 'Crossed', subtitle: 'Members you crossed paths with', enable: 'Turn on Crossed' },
  live: { title: 'Live', subtitle: 'Members available now', availableToggle: 'I’m available', invite: 'Suggest an audio call', demoNotice: 'Demo mode: calls are simulated, no audio or video is transmitted.' },
  messages: { title: 'Messages' },
  me: { title: 'Me', privacy: 'Privacy & visibility', introductions: 'Introductions', signOut: 'Sign out' },
};
export default en;
