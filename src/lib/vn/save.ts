import type { SaveSlot, Settings } from "./types";

const SAVE_VERSION = 1;
const SLOTS_KEY = "snow-vn-slots-v1";
const SETTINGS_KEY = "snow-vn-settings-v1";
const ENDINGS_KEY = "snow-vn-endings-v1";

export const DEFAULT_SETTINGS: Settings = {
  textSpeed: 0.55,
  autoDelay: 0.7,
  music: 0.7,
  sfx: 0.75,
  mute: false,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
}

export function loadSlots(): Array<SaveSlot | null> {
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    if (!raw) return [null, null, null];
    const parsed = JSON.parse(raw) as Array<SaveSlot | null>;
    return [0, 1, 2].map((i) => parsed[i] ?? null);
  } catch {
    return [null, null, null];
  }
}

export function writeSlot(index: number, slot: SaveSlot) {
  const slots = loadSlots();
  slots[index] = slot;
  try {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  } catch {
    /* ignore */
  }
}

export function clearSlot(index: number) {
  const slots = loadSlots();
  slots[index] = null;
  try {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  } catch {
    /* ignore */
  }
}

export function loadEndings(): string[] {
  try {
    const raw = localStorage.getItem(ENDINGS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function rememberEnding(id: string) {
  const set = new Set(loadEndings());
  set.add(id);
  try {
    localStorage.setItem(ENDINGS_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export { SAVE_VERSION };
