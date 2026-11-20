import { Preferences } from "@capacitor/preferences";
import { type CoverLook, DEFAULT_LOOK } from "./themes";

export interface Settings {
  reminderOn: boolean;
  reminderHour: number;
  reminderMinute: number;
  lockOn: boolean;
  name: string; // defterin sahibi; boş olabilir
  look: CoverLook; // seçili kapak (Premium biterse saklanır, varsayılan gösterilir)
  volumeLooks: Record<string, CoverLook>; // YYYY-AA → o ayın defteri hangi kapakla rafa kalktı
  backupOn: boolean;
  backupAudio: boolean;
  lastBackup: string | null; // ISO tarih
}

export const DEFAULT_SETTINGS: Settings = {
  reminderOn: true,
  reminderHour: 21,
  reminderMinute: 0,
  lockOn: false,
  name: "",
  look: DEFAULT_LOOK,
  volumeLooks: {},
  backupOn: false,
  backupAudio: true,
  lastBackup: null,
};
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
