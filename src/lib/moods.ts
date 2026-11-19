import type { Mood } from "./native";

/** Ruh hali skalası: marka/aksiyon renginden (mercan) bağımsızdır. inner-voice-design skill'i ile aynı. */
export const MOODS: { id: Mood; label: string; color: string; ink: string }[] = [
  { id: "harika", label: "Harika", color: "#5E6C50", ink: "#FFFFFF" },
  { id: "iyi", label: "İyi", color: "#9AA58C", ink: "#382A39" },
  { id: "normal", label: "Normal", color: "#DDD2C6", ink: "#382A39" },
  { id: "yorgun", label: "Yorgun", color: "#B9A8C9", ink: "#382A39" },
  { id: "zor", label: "Zor", color: "#6B4E6E", ink: "#FFFFFF" },
];

export const moodInfo = (id: Mood | null | undefined) => MOODS.find((m) => m.id === id) ?? null;

/** Ses dalgası geçişi: lavanta → mercan → adaçayı. t: 0..1 */
const STOPS = [
  [185, 168, 201],
  [217, 145, 130],
  [154, 165, 140],
];
export function waveColor(t: number): string {
  const x = Math.max(0, Math.min(1, t));
  const seg = x < 0.5 ? 0 : 1;
  const u = x < 0.5 ? x * 2 : (x - 0.5) * 2;
  const a = STOPS[seg];
  const b = STOPS[seg + 1];
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * u));
  return `rgb(${c.join(",")})`;
}
