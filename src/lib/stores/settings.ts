import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'runebook-settings';

export type ThemeType = 'dark' | 'light' | 'auto';
export type StorageType = 'localStorage' | 'pluresdb';

export interface AppSettings {
  fontFamily: string;
  fontSize: number;
  theme: ThemeType;
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  storageType: StorageType;
}

const DEFAULTS: AppSettings = {
  fontFamily: 'JetBrains Mono',
  fontSize: 14,
  theme: 'dark',
  showGrid: true,
  gridSize: 24,
  snapToGrid: false,
  storageType: 'localStorage',
};

export const FONT_FAMILIES = [
  { value: 'JetBrains Mono', label: 'JetBrains Mono' },
  { value: 'Cascadia Code',  label: 'Cascadia Code'  },
  { value: 'Fira Code',      label: 'Fira Code'      },
  { value: 'system',         label: 'System Mono'    },
];

const FONT_STACKS: Record<string, string> = {
  'JetBrains Mono': "'JetBrains Mono', ui-monospace, monospace",
  'Cascadia Code':  "'Cascadia Code', ui-monospace, monospace",
  'Fira Code':      "'Fira Code', ui-monospace, monospace",
  system:           "ui-monospace, 'Courier New', monospace",
};

function loadFromStorage(): AppSettings {
  if (!browser) return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

function saveToStorage(s: AppSettings): void {
  if (!browser) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function applySettings(s: AppSettings): void {
  if (!browser) return;
  const root = document.documentElement;
  root.style.setProperty('--canvas-font-size', `${s.fontSize}px`);
  root.style.setProperty('--font-mono', FONT_STACKS[s.fontFamily] ?? FONT_STACKS['JetBrains Mono']);
}

function createSettingsStore() {
  const { subscribe, set, update } = writable<AppSettings>(loadFromStorage());

  return {
    subscribe,
    /** Update one or more settings keys */
    patch(patch: Partial<AppSettings>): void {
      update(s => {
        const next = { ...s, ...patch };
        saveToStorage(next);
        applySettings(next);
        return next;
      });
    },
    /** Apply persisted settings to CSS vars on app boot */
    init(): void {
      update(s => { applySettings(s); return s; });
    },
  };
}

export const settingsStore = createSettingsStore();
