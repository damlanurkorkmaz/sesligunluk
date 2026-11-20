import { Preferences } from "@capacitor/preferences";
import { type Entry, listEntries } from "./entries";
import { GunlukNative } from "./native";
import { loadSettings, saveSettings } from "./settings";
import { cachedPremium } from "./premium";

const ENTRIES_KEY = "entries.v1";

/** Tüm sayfaları (ve istenirse sesleri) kullanıcının iCloud Drive'ına kopyalar. */
export async function backupNow(): Promise<{ ok: boolean }> {
  try {
    const st = await loadSettings();
    const entries = await listEntries();
    const json = JSON.stringify({ version: 1, entries });
    const audioFiles = st.backupAudio ? entries.map((e) => e.fileName).filter(Boolean) : [];
    const r = await GunlukNative.backupToICloud({ json, audioFiles });
    await saveSettings({ ...st, lastBackup: r.date });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Yeni sayfadan sonra çağrılır: Premium ve otomatik yedek açıksa sessizce yedekler. */
export async function autoBackup(): Promise<void> {
  const st = await loadSettings();
  if (!st.backupOn || !(await cachedPremium())) return;
  await backupNow();
}

/** Yedekteki sayfaları birleştirir (cihazdaki daha yeni sürüm korunur). Kaç sayfa eklendiğini döner; yedek yoksa null. */
export async function restoreBackup(): Promise<number | null> {
  try {
    const { json } = await GunlukNative.restoreFromICloud();
    if (!json) return null;
    const parsed = JSON.parse(json) as { entries?: Entry[] };
    const incoming = parsed.entries ?? [];
    const { value } = await Preferences.get({ key: ENTRIES_KEY });
    const local = (value ? JSON.parse(value) : {}) as Record<string, Entry>;
    let added = 0;
    for (const e of incoming) {
      const cur = local[e.date];
      if (!cur || (e.updatedAt ?? 0) > (cur.updatedAt ?? 0)) {
        if (!cur) added++;
        local[e.date] = e;
      }
    }
    await Preferences.set({ key: ENTRIES_KEY, value: JSON.stringify(local) });
    return added;
  } catch {
    return null;
  }
}
