/**
 * Defter temaları. Deri damask ve beş rengi herkese açık; diğer dokuz tarz Premium.
 * `tint`: deri yüzeylerin (Bugün başlığı, sayfa çerçevesi, raf sırtı) bu temada alacağı ton.
 * "transparent" = deri olduğu gibi (mürdüm).
 */
export type ThemeId = "damask" | "ebru" | "keten" | "kadife" | "artdeco" | "kraft" | "ansiklopedi" | "cini" | "suluboya" | "mektup";

export interface Theme {
  id: ThemeId;
  name: string;
  desc: string;
  premium: boolean;
  tint: string;
  band: string; // lastik bant / ip rengi (CSS background)
}

export interface DamaskColor {
  id: string;
  name: string;
  swatch: string;
  tint: string;
}

export const DAMASK_COLORS: DamaskColor[] = [
  { id: "murdum", name: "Mürdüm", swatch: "#3f3040", tint: "transparent" },
  { id: "gece", name: "Gece mavisi", swatch: "#2b3d63", tint: "#2b3d63" },
  { id: "kizil", name: "Kızıl kahve", swatch: "#7a3a26", tint: "#7a3a26" },
  { id: "zeytin", name: "Zeytin", swatch: "#55603f", tint: "#55603f" },
  { id: "komur", name: "Kömür", swatch: "#2a2a2c", tint: "#3a3a3c" },
];

const DARK_BAND = "linear-gradient(90deg,#1c141d,#3a2d3b 50%,#1c141d)";

export const THEMES: Theme[] = [
  { id: "damask", name: "Deri Damask", desc: "Kabartma damask deri, dikiş, metal köşeler.", premium: false, tint: "transparent", band: DARK_BAND },
  { id: "ebru", name: "Ebru", desc: "Ebru kâğıdı, deri sırt ve köşeler, isim etiketi.", premium: true, tint: "transparent", band: DARK_BAND },
  { id: "keten", name: "Adaçayı Keten", desc: "Keten kumaş, deri sırt, pirinç çerçeveli etiket.", premium: true, tint: "#55603f", band: "linear-gradient(90deg,#3d2f20,#5a4630 50%,#3d2f20)" },
  { id: "kadife", name: "Gece Kadifesi", desc: "Lacivert kadife, yaldız ay evreleri ve takımyıldız.", premium: true, tint: "#24335a", band: "linear-gradient(90deg,#0b0f1e,#1f2945 50%,#0b0f1e)" },
  { id: "artdeco", name: "Art Deco", desc: "Siyah zemin, altın basamaklı çerçeve ve yelpaze.", premium: true, tint: "#2f2b2e", band: "linear-gradient(90deg,#0d0b0d,#2a2429 50%,#0d0b0d)" },
  { id: "kraft", name: "Kraft & Bez Sırt", desc: "Kraft karton, bez sırt, kör baskı logo, jüt ip.", premium: true, tint: "#6e5232", band: "repeating-linear-gradient(170deg,#a88a5c 0 3px,#d4b986 3px 5px,#8c7048 5px 7px)" },
  { id: "ansiklopedi", name: "Ansiklopedi", desc: "Bordo bez cilt, yaldız etiket; her ay yeni bir cilt.", premium: true, tint: "#6b2531", band: "linear-gradient(90deg,#24090e,#45161e 50%,#24090e)" },
  { id: "cini", name: "Çini", desc: "Sırlı zeminde kobalt ve turkuaz geometrik yıldızlar.", premium: true, tint: "#2c4f8c", band: "linear-gradient(90deg,#16264a,#2c4f8c 50%,#16264a)" },
  { id: "suluboya", name: "Suluboya", desc: "Lila, mercan ve adaçayı suluboya lekeleri.", premium: true, tint: "transparent", band: "linear-gradient(90deg,#8d7d9c,#b9a8c9 50%,#8d7d9c)" },
  { id: "mektup", name: "Eski Mektup", desc: "Uçak postası zarfı, ses dalgalı pul, posta damgası.", premium: true, tint: "transparent", band: "linear-gradient(90deg,#2a2438,#3d3550 50%,#2a2438)" },
];

export interface CoverLook {
  theme: ThemeId;
  color: string; // yalnızca damask için
}

export const DEFAULT_LOOK: CoverLook = { theme: "damask", color: "murdum" };

export function themeById(id: string | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Premium değilse Premium temalar varsayılana düşer (seçim saklı kalır, abonelik dönünce geri gelir). */
export function effectiveLook(look: CoverLook | undefined, premium: boolean): CoverLook {
  const l = look ?? DEFAULT_LOOK;
  const t = themeById(l.theme);
  if (t.premium && !premium) return DEFAULT_LOOK;
  return { theme: t.id, color: DAMASK_COLORS.some((c) => c.id === l.color) ? l.color : "murdum" };
}

export function lookTint(look: CoverLook): string {
  if (look.theme === "damask") return DAMASK_COLORS.find((c) => c.id === look.color)?.tint ?? "transparent";
  return themeById(look.theme).tint;
}

/** YYYY-AA için defterin görünümü: o ay seçilmiş tema, yoksa varsayılan. */
export function volumeLook(map: Record<string, CoverLook> | undefined, key: string, current: CoverLook, isCurrentMonth: boolean): CoverLook {
  if (isCurrentMonth) return current;
  return map?.[key] ?? DEFAULT_LOOK;
}

/** Ay numarasını ansiklopedi cildi gibi Romen rakamına çevirir. */
export function roman(n: number): string {
  const map: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [v, s] of map) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}
