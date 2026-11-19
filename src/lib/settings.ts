import { Preferences } from "@capacitor/preferences";

export interface Settings {
  reminderOn: boolean;
  reminderHour: number;
  reminderMinute: number;
  lockOn: boolean;
}

export const DEFAULT_SETTINGS: Settings = { reminderOn: true, reminderHour: 21, reminderMinute: 0, lockOn: false };
const KEY = "settings.v1";

export async function loadSettings(): Promise<Settings> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(value) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await Preferences.set({ key: KEY, value: JSON.stringify(s) });
}
