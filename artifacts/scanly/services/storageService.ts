import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  DOCUMENTS: '@scanly_documents',
  ONBOARDING: '@scanly_onboarding',
  SETTINGS: '@scanly_settings',
} as const;

export interface AppSettings {
  autoEnhance: boolean;
  saveToDevice: boolean;
  defaultFormat: 'PDF' | 'JPG';
  theme: 'light' | 'dark';
  notifications: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoEnhance: true,
  saveToDevice: true,
  defaultFormat: 'PDF',
  theme: 'light',
  notifications: true,
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {}
}

export async function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  const current = await loadSettings();
  await saveSettings({ ...current, [key]: value });
}

export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.DOCUMENTS,
      STORAGE_KEYS.SETTINGS,
    ]);
  } catch {}
}
