import { Preferences } from "@capacitor/preferences";
import type { Entry } from "./entries";
import { GunlukNative, type Mood } from "./native";
import { MONTHS, addDays, fromKey } from "./dates";
import { MOODS } from "./moods";

/** Ayın mektubu ve içgörüleri. Her şey cihazda hesaplanır; mektubu cihazdaki yapay zekâ yazar. */

const KEY = "letters.v1";
const SCORE: Record<Mood, number> = { harika: 2, iyi: 1, normal: 0, yorgun: -1, zor: -2 };

export interface MonthInsights {
  count: number;
  moods: { id: Mood; label: string; color: string; n: number }[];
  topMood: string | null; // en sık ruh hali (küçük harf)
  topics: { tag: string; n: number }[]; // en çok bahsedilenler
  goodTopic: string | null; // iyi/harika günlerin en sık konusu
  longestStreak: number;
  compare: "brighter" | "heavier" | "same" | null; // önceki aya göre
}

function monthEntries(entries: Entry[], monthKey: string) {
  return entries.filter((e) => e.date.startsWith(monthKey)).sort((a, b) => a.date.localeCompare(b.date));
}

function avgScore(list: Entry[]): number | null {
  const s = list.filter((e) => e.mood).map((e) => SCORE[e.mood as Mood]);
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : null;
}

function prevMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function computeInsights(entries: Entry[], monthKey: string): MonthInsights {
  const list = monthEntries(entries, monthKey);
  const moods = MOODS.map((m) => ({ id: m.id, label: m.label, color: m.color, n: list.filter((e) => e.mood === m.id).length }));
  const topMoodEntry = [...moods].sort((a, b) => b.n - a.n)[0];

  const count = new Map<string, number>();
  const good = new Map<string, number>();
  const display = new Map<string, string>(); // küçük harfli anahtar → ilk görülen yazım (Elif, iş)
  for (const e of list) {
    for (const raw of e.tags) {
      const t = raw.trim().toLocaleLowerCase("tr-TR");
      if (!t) continue;
      if (!display.has(t)) display.set(t, raw.trim());
      count.set(t, (count.get(t) ?? 0) + 1);
      if (e.mood === "harika" || e.mood === "iyi") good.set(t, (good.get(t) ?? 0) + 1);
    }
  }
  const topics = [...count.entries()]
    .map(([tag, n]) => ({ tag: display.get(tag) ?? tag, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  const goodTop = [...good.entries()].sort((a, b) => b[1] - a[1])[0];

  // Ay içindeki en uzun ardışık gün serisi
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const e of list) {
    run = prev && addDays(fromKey(prev), 1).getTime() === fromKey(e.date).getTime() ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = e.date;
  }

  const now = avgScore(list);
  const before = avgScore(monthEntries(entries, prevMonthKey(monthKey)));
  const compare = now === null || before === null ? null : now - before > 0.25 ? "brighter" : before - now > 0.25 ? "heavier" : "same";

  return {
    count: list.length,
    moods,
    topMood: topMoodEntry && topMoodEntry.n > 0 ? topMoodEntry.label.toLocaleLowerCase("tr-TR") : null,
    topics,
    goodTopic: goodTop && goodTop[1] >= 2 ? (display.get(goodTop[0]) ?? goodTop[0]) : null,
    longestStreak: longest,
    compare,
  };
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export interface Letter {
  text: string;
  ai: boolean;
  createdAt: number;
}

async function loadAll(): Promise<Record<string, Letter>> {
  const { value } = await Preferences.get({ key: KEY });
  try {
    return value ? (JSON.parse(value) as Record<string, Letter>) : {};
  } catch {
    return {};
  }
}

/** Test için: saklanan mektubu sil, bir sonraki açılışta yeniden yazılsın. */
export async function clearLetter(monthKey: string): Promise<void> {
  const all = await loadAll();
  delete all[monthKey];
  await Preferences.set({ key: KEY, value: JSON.stringify(all) });
}

export async function getLetter(monthKey: string): Promise<Letter | null> {
  return (await loadAll())[monthKey] ?? null;
}

/** Yapay zekâ yoksa içgörülerden kurulan sade mektup. Uydurma bilgi içermez. */
function templateLetter(name: string, monthKey: string, ins: MonthInsights): string {
  const [, m] = monthKey.split("-").map(Number);
  const parts = [`Sevgili ${name.trim() || "dostum"},`];
  parts.push(`${MONTHS[m - 1]} boyunca benimle ${ins.count} kez konuştun.`);
  if (ins.topics.length >= 2) parts.push(`En çok ${ins.topics[0].tag} ve ${ins.topics[1].tag} üzerine konuştun.`);
  else if (ins.topics.length === 1) parts.push(`En çok ${ins.topics[0].tag} üzerine konuştun.`);
  if (ins.topMood) parts.push(`Günlerinin çoğu ${ins.topMood} geçti.`);
  if (ins.goodTopic) parts.push(`İyi günlerinde ${ins.goodTopic} hep yanındaydı.`);
  if (ins.longestStreak >= 3) parts.push(`${ins.longestStreak} gün aralıksız yazdın; bu küçük bir şey değil.`);
  return parts.join(" ");
}

/** Kayıtlıysa onu, değilse yeni mektup yazar ve saklar. */
export async function ensureLetter(name: string, monthKey: string, entries: Entry[]): Promise<Letter> {
  const existing = await getLetter(monthKey);
  if (existing) return existing;
  const list = monthEntries(entries, monthKey);
  const ins = computeInsights(entries, monthKey);
  let letter: Letter;
  try {
    const notes = list.map((e) => (e.summary?.trim() || e.transcript.trim()).slice(0, 240)).filter(Boolean);
    const { text } = await GunlukNative.monthLetter({ name, month: monthLabel(monthKey), notes });
    letter = { text: text.trim(), ai: true, createdAt: Date.now() };
  } catch {
    letter = { text: templateLetter(name, monthKey, ins), ai: false, createdAt: Date.now() };
  }
  const all = await loadAll();
  all[monthKey] = letter;
  await Preferences.set({ key: KEY, value: JSON.stringify(all) });
  return letter;
}

/** Mektubun ilk cümlesi (kilitli görünümde açık kalan kısım). */
export function firstSentence(text: string): { head: string; rest: string } {
  const lines = text.split(/\n/);
  const greeting = lines[0].trim().endsWith(",") ? lines.shift() + "\n" : "";
  const body = lines.join(" ").trim();
  const m = body.match(/^(.+?[.!?])(\s|$)/);
  const head = m ? m[1] : body.slice(0, 60);
  return { head: greeting + head, rest: body.slice(head.length).trim() };
}
