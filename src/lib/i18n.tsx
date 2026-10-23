"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  type Handedness,
  type Locale,
  readStoredHandedness,
  readStoredLocale,
  resolveLocale,
  writeStoredHandedness,
  writeStoredLocale,
} from "./preferences";

export type Messages = {
  brand: string;
  homeTagline: string;
  homeTip: string;
  loadingHome: string;
  openingList: string;
  switchHouseholdHint: string;
  createList: string;
  creating: string;
  orJoinWithCode: string;
  householdCode: string;
  codePlaceholder: string;
  openList: string;
  opening: string;
  joinCodeTooShort: string;
  createFailed: string;
  joinFailed: string;
  householdMissing: string;

  sharedHousehold: string;
  listTagline: string;
  loadingList: string;
  loadFailed: string;
  tryAgain: string;
  toHome: string;
  emptyTitle: string;
  emptyBody: string;
  noItems: string;
  todaysBuys: string;
  addItem: string;
  itemPlaceholder: string;
  aisle: string;
  addToList: string;
  adding: string;
  needItemName: string;
  addFailed: string;
  updateFailed: string;
  deleteFailed: string;
  reorderFailed: string;
  saveFailed: string;
  copyFailed: string;

  household: string;
  share: string;
  shareTitle: string;
  shareBody: string;
  code: string;
  link: string;
  copyLink: string;
  copied: string;
  switchHousehold: string;

  editItem: string;
  editItemBody: string;
  name: string;
  cancel: string;
  save: string;
  saving: string;
  removeItem: string;
  removeItemBody: string;
  removeItemBodyNamed: (name: string) => string;
  remove: string;

  bought: string;
  markBought: (name: string) => string;
  unmarkBought: (name: string) => string;
  dragItem: (name: string) => string;
  removeItemAria: (name: string) => string;
  dueSoon: string;
  buyNow: string;

  categories: string;
  categoriesBody: string;
  newCategory: string;
  categoryPlaceholder: string;
  add: string;
  editCategory: string;
  editCategoryBody: string;
  color: string;
  createCategoryFailed: string;
  saveCategoryFailed: string;
  reorderCategoriesFailed: string;
  moveCategoryUp: (name: string) => string;
  moveCategoryDown: (name: string) => string;
  editColorFor: (name: string) => string;

  settings: string;
  settingsTitle: string;
  settingsBody: string;
  handedness: string;
  handednessHint: string;
  leftHanded: string;
  rightHanded: string;
  language: string;
  languageHint: string;
  danish: string;
  english: string;
  privacyTitle: string;
  privacyBody: string;
  householdSection: string;
  householdSectionHint: string;
  close: string;
};

const da: Messages = {
  brand: "Indkøbsliste",
  homeTagline:
    "Én fælles liste til jer to. Afkryds i butikken — den anden ser det med det samme.",
  homeTip:
    "Tip: På iPhone — åbn listen først, så Del → Tilføj til hjemmeskærm. Ikonet åbner jeres seneste husstand igen.",
  loadingHome: "Henter…",
  openingList: "Åbner jeres liste…",
  switchHouseholdHint: "Vælg en anden husstand — eller opret en ny fælles liste.",
  createList: "Opret fælles liste",
  creating: "Opretter…",
  orJoinWithCode: "eller join med kode",
  householdCode: "Husstandskode",
  codePlaceholder: "Fx 7K2M9P",
  openList: "Åbn listen",
  opening: "Åbner…",
  joinCodeTooShort: "Indtast husstandskoden fra jeres link.",
  createFailed: "Kunne ikke oprette husstand. Prøv igen.",
  joinFailed: "Kunne ikke åbne husstanden. Prøv igen.",
  householdMissing: "Husstanden findes ikke.",

  sharedHousehold: "Fælles husstand",
  listTagline: "Træk for at sortere. Farve viser når det er tid at købe igen.",
  loadingList: "Henter jeres indkøbsliste…",
  loadFailed: "Kunne ikke hente listen. Prøv igen om et øjeblik.",
  tryAgain: "Prøv igen",
  toHome: "Til forsiden",
  emptyTitle: "Listen er tom",
  emptyBody:
    "Tilføj den første vare nedenfor — I kan begge se den med det samme.",
  noItems: "Ingen varer",
  todaysBuys: "Dagens køb",
  addItem: "Tilføj vare",
  itemPlaceholder: "Fx avocado, mælk, opvasketabs…",
  aisle: "Afdeling",
  addToList: "Tilføj til listen",
  adding: "Tilføjer…",
  needItemName: "Skriv et varenavn.",
  addFailed: "Kunne ikke tilføje varen.",
  updateFailed: "Kunne ikke opdatere varen.",
  deleteFailed: "Kunne ikke slette varen.",
  reorderFailed: "Kunne ikke ændre rækkefølgen.",
  saveFailed: "Kunne ikke gemme ændringen.",
  copyFailed: "Kunne ikke kopiere linket. Kopiér adressen manuelt.",

  household: "Husstand",
  share: "Del",
  shareTitle: "Del med din partner",
  shareBody: "Send koden eller linket — begge åbner den samme liste.",
  code: "Kode",
  link: "Link",
  copyLink: "Kopiér link",
  copied: "Kopieret",
  switchHousehold: "Skift husstand",

  editItem: "Ret vare",
  editItemBody: "Ændr navn eller flyt til en anden afdeling.",
  name: "Navn",
  cancel: "Annuller",
  save: "Gem",
  saving: "Gemmer…",
  removeItem: "Fjern vare?",
  removeItemBody: "Varen fjernes fra listen for jer begge.",
  removeItemBodyNamed: (name) =>
    `“${name}” fjernes fra listen for jer begge.`,
  remove: "Fjern",

  bought: "Købt",
  markBought: (name) => `Markér ${name} som købt`,
  unmarkBought: (name) => `Fjern afkrydsning for ${name}`,
  dragItem: (name) => `Træk for at flytte ${name}`,
  removeItemAria: (name) => `Fjern ${name}`,
  dueSoon: "Snart tid igen",
  buyNow: "Bør købes nu",

  categories: "Kategorier",
  categoriesBody:
    "Opret, omdøb, farvelæg og flyt afdelinger — begge telefoner ser det.",
  newCategory: "Ny kategori",
  categoryPlaceholder: "Fx Frost",
  add: "Tilføj",
  editCategory: "Ret kategori",
  editCategoryBody: "Omdøb eller skift farve. Varer følger det nye navn.",
  color: "Farve",
  createCategoryFailed: "Kunne ikke oprette kategori.",
  saveCategoryFailed: "Kunne ikke gemme kategorien.",
  reorderCategoriesFailed: "Kunne ikke ændre rækkefølgen.",
  moveCategoryUp: (name) => `Flyt ${name} op`,
  moveCategoryDown: (name) => `Flyt ${name} ned`,
  editColorFor: (name) => `Ret farve for ${name}`,

  settings: "Indstillinger",
  settingsTitle: "Indstillinger",
  settingsBody: "Sprog og layout på denne enhed.",
  handedness: "Hånd",
  handednessHint:
    "Placér «Købt» til venstre eller højre under Dagens køb.",
  leftHanded: "Venstrehåndet",
  rightHanded: "Højrehåndet",
  language: "Sprog",
  languageHint: "Vælges pr. enhed. Engelsk domæne kan sætte standard senere.",
  danish: "Dansk",
  english: "English",
  privacyTitle: "Privatliv",
  privacyBody:
    "Varenavne krypteres på din telefon før de gemmes. Serveren ser kun ciphertext. Alle med husstandskoden kan læse listen — koden i linket er stadig hemmeligheden.",
  householdSection: "Husstand",
  householdSectionHint: "Kode, deling og skift af husstand.",
  close: "Luk",
};

const en: Messages = {
  brand: "Grocery List",
  homeTagline:
    "One shared list for the two of you. Check items in the store — the other person sees it right away.",
  homeTip:
    "Tip: On iPhone — open the list first, then Share → Add to Home Screen. The icon reopens your last household.",
  loadingHome: "Loading…",
  openingList: "Opening your list…",
  switchHouseholdHint: "Pick another household — or create a new shared list.",
  createList: "Create shared list",
  creating: "Creating…",
  orJoinWithCode: "or join with a code",
  householdCode: "Household code",
  codePlaceholder: "E.g. 7K2M9P",
  openList: "Open list",
  opening: "Opening…",
  joinCodeTooShort: "Enter the household code from your link.",
  createFailed: "Could not create household. Try again.",
  joinFailed: "Could not open the household. Try again.",
  householdMissing: "Household not found.",

  sharedHousehold: "Shared household",
  listTagline: "Drag to sort. Color shows when it is time to buy again.",
  loadingList: "Loading your grocery list…",
  loadFailed: "Could not load the list. Try again in a moment.",
  tryAgain: "Try again",
  toHome: "Back to home",
  emptyTitle: "The list is empty",
  emptyBody: "Add the first item below — you both see it right away.",
  noItems: "No items",
  todaysBuys: "Today’s buys",
  addItem: "Add item",
  itemPlaceholder: "E.g. avocado, milk, dishwasher tabs…",
  aisle: "Aisle",
  addToList: "Add to list",
  adding: "Adding…",
  needItemName: "Enter an item name.",
  addFailed: "Could not add the item.",
  updateFailed: "Could not update the item.",
  deleteFailed: "Could not delete the item.",
  reorderFailed: "Could not change the order.",
  saveFailed: "Could not save the change.",
  copyFailed: "Could not copy the link. Copy the address manually.",

  household: "Household",
  share: "Share",
  shareTitle: "Share with your partner",
  shareBody: "Send the code or link — you both open the same list.",
  code: "Code",
  link: "Link",
  copyLink: "Copy link",
  copied: "Copied",
  switchHousehold: "Switch household",

  editItem: "Edit item",
  editItemBody: "Change the name or move it to another aisle.",
  name: "Name",
  cancel: "Cancel",
  save: "Save",
  saving: "Saving…",
  removeItem: "Remove item?",
  removeItemBody: "The item is removed from the list for both of you.",
  removeItemBodyNamed: (name) =>
    `“${name}” will be removed from the list for both of you.`,
  remove: "Remove",

  bought: "Bought",
  markBought: (name) => `Mark ${name} as bought`,
  unmarkBought: (name) => `Uncheck ${name}`,
  dragItem: (name) => `Drag to move ${name}`,
  removeItemAria: (name) => `Remove ${name}`,
  dueSoon: "Due soon",
  buyNow: "Should buy now",

  categories: "Categories",
  categoriesBody:
    "Create, rename, recolor, and reorder aisles — both phones see it.",
  newCategory: "New category",
  categoryPlaceholder: "E.g. Frozen",
  add: "Add",
  editCategory: "Edit category",
  editCategoryBody: "Rename or change color. Items follow the new name.",
  color: "Color",
  createCategoryFailed: "Could not create category.",
  saveCategoryFailed: "Could not save the category.",
  reorderCategoriesFailed: "Could not change the order.",
  moveCategoryUp: (name) => `Move ${name} up`,
  moveCategoryDown: (name) => `Move ${name} down`,
  editColorFor: (name) => `Edit color for ${name}`,

  settings: "Settings",
  settingsTitle: "Settings",
  settingsBody: "Language and layout on this device.",
  handedness: "Handedness",
  handednessHint:
    "Place «Bought» on the left or right under Today’s buys.",
  leftHanded: "Left-handed",
  rightHanded: "Right-handed",
  language: "Language",
  languageHint:
    "Per device. An English domain can set the default later.",
  danish: "Dansk",
  english: "English",
  privacyTitle: "Privacy",
  privacyBody:
    "Item names are encrypted on your phone before they are stored. The server only sees ciphertext. Anyone with the household code can read the list — the code in the link is still the secret.",
  householdSection: "Household",
  householdSectionHint: "Code, sharing, and switching household.",
  close: "Close",
};

const DICTS: Record<Locale, Messages> = { da, en };

type PrefsContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  handedness: Handedness;
  setHandedness: (hand: Handedness) => void;
  t: Messages;
};

const PrefsContext = createContext<PrefsContextValue | null>(null);

function subscribeStorage(onStore: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (event: StorageEvent) => {
    if (
      event.key === "indkobsliste.locale" ||
      event.key === "indkobsliste.handedness" ||
      event.key === null
    ) {
      onStore();
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getLocaleSnapshot(): Locale {
  return resolveLocale();
}

function getHandSnapshot(): Handedness {
  return readStoredHandedness();
}

function getServerSnapshotLocale(): Locale {
  return "da";
}

function getServerSnapshotHand(): Handedness {
  return "right";
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const localeFromStore = useSyncExternalStore(
    subscribeStorage,
    getLocaleSnapshot,
    getServerSnapshotLocale,
  );
  const handFromStore = useSyncExternalStore(
    subscribeStorage,
    getHandSnapshot,
    getServerSnapshotHand,
  );

  // Local overrides so UI updates immediately on same-tab writes
  const [localeOverride, setLocaleOverride] = useState<Locale | null>(null);
  const [handOverride, setHandOverride] = useState<Handedness | null>(null);

  const locale = localeOverride ?? localeFromStore;
  const handedness = handOverride ?? handFromStore;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    writeStoredLocale(next);
    setLocaleOverride(next);
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
    }
  }, []);

  const setHandedness = useCallback((next: Handedness) => {
    writeStoredHandedness(next);
    setHandOverride(next);
  }, []);

  const value = useMemo<PrefsContextValue>(
    () => ({
      locale,
      setLocale,
      handedness,
      setHandedness,
      t: DICTS[locale],
    }),
    [handedness, locale, setHandedness, setLocale],
  );

  return (
    <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
  );
}

export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) {
    throw new Error("usePrefs must be used within PrefsProvider");
  }
  return ctx;
}

export function useT(): Messages {
  return usePrefs().t;
}

/** Warm localStorage read so first paint can skip flicker when possible. */
export function peekStoredLocale(): Locale | null {
  return readStoredLocale();
}
