import { Preferences } from "@capacitor/preferences";
import type { Mood } from "./native";
import { addDays, dayKey } from "./dates";

export interface Entry {
  date: string; // YYYY-MM-DD, günde tek kayıt
  fileName: string; // ses dosyası adı (Application Support/recordings)
  durationSec: number;
  transcript: string;
  summary: string;
  mood: Mood | null;
  tags: string[];
  aiGenerated: boolean;
  waveform?: number[]; // oynatıcıda gösterilen 0..1 seviyeler (kayıt sırasında örneklenir)
  createdAt: string;
  updatedAt: string;
}

/**
 * MVP depolama: Preferences içinde JSON. Kayıt sayısı küçük (yılda ~365) olduğu için yeterli.
 * Arama ve iCloud yedeği gelince @capacitor-community/sqlite'a taşınacak; arayüz aynı kalır.
 */
const KEY = "entries.v1";

async function readAll(): Promise<Record<string, Entry>> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, Entry>;
  } catch {
    return {};
  }
}

async function writeAll(all: Record<string, Entry>) {
  await Preferences.set({ key: KEY, value: JSON.stringify(all) });
}

export async function listEntries(): Promise<Entry[]> {
  const all = await readAll();
  return Object.values(all).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getEntry(date: string): Promise<Entry | null> {
  const all = await readAll();
  return all[date] ?? null;
}

export async function saveEntry(entry: Entry): Promise<Entry> {
  const all = await readAll();
  const saved = { ...entry, updatedAt: new Date().toISOString() };
  all[entry.date] = saved;
  await writeAll(all);
  return saved;
}

export async function deleteEntry(date: string): Promise<Entry | null> {
  const all = await readAll();
  const old = all[date] ?? null;
  delete all[date];
  await writeAll(all);
  return old;
}

/** Bugün kayıt yoksa seri dünden geriye sayılır; bugün kaydedilince bir artar. */
export function currentStreak(entries: Entry[], today: Date = new Date()): number {
  const days = new Set(entries.map((e) => e.date));
  let cursor = days.has(dayKey(today)) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(dayKey(cursor))) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

/** Tüm kayıtları siler; ses dosyalarını silmek çağıranın işi (fileName listesi döner). */
export async function deleteAllEntries(): Promise<string[]> {
  const all = await readAll();
  await Preferences.remove({ key: KEY });
  return Object.values(all).map((e) => e.fileName);
}
