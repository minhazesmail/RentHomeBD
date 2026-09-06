export const en = {
  common: {
    language: "Language",
    english: "English",
    bangla: "বাংলা",
    changeLanguage: "Change language",
    switchToEnglish: "Switch to English",
    switchToBangla: "Switch to Bangla",
    skipToMain: "Skip to main content",
  },
  navigation: {
    primaryNavigationAria: "Primary navigation",
    productNavigationAria: "NearBasha product navigation",
    findOnMap: "Find on map",
    howItWorks: "How it works",
    about: "About",
    contact: "Contact",
    privacy: "Privacy",
    terms: "Terms",
    signIn: "Sign in",
    listProperty: "List a property",
    explore: "Explore",
    saved: "Saved",
    messages: "Messages",
    properties: "Properties",
    dashboard: "Dashboard",
  },
  landing: {},
  auth: {},
  homes: {},
  property: {},
  saved: {},
  messages: {},
  dashboard: {},
  owner: {},
  verification: {},
  moderation: {},
  information: {},
} as const;

export type DictionaryShape<T> = {
  readonly [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends object
      ? DictionaryShape<T[K]>
      : never;
};

export type Dictionary = DictionaryShape<typeof en>;
