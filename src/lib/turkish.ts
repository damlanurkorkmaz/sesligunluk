/**
 * Özel isme Türkçe ilgi (tamlayan) eki ekler: Damla'nın, Elif'in, Burcu'nun, Özgür'ün.
 * Son ünlüye göre büyük ünlü uyumu; ünlüyle biten isimlerde kaynaştırma "n".
 */
export function genitive(name: string): string {
  const n = name.trim();
  if (!n) return "";
  const lower = n.toLocaleLowerCase("tr");
  const vowels = "aeıioöuü";
  let last = "";
  for (let i = lower.length - 1; i >= 0; i--) {
    if (vowels.includes(lower[i])) {
      last = lower[i];
      break;
    }
  }
  const suffix = { a: "ın", ı: "ın", e: "in", i: "in", o: "un", u: "un", ö: "ün", ü: "ün" }[last] ?? "in";
  const endsWithVowel = vowels.includes(lower[lower.length - 1]);
  return `${n}'${endsWithVowel ? "n" : ""}${suffix}`;
}

/** "Damla" → "Damla'nın günlüğü"; isim yoksa "Günlüğüm". */
export function journalTitle(name: string | undefined): string {
  return name?.trim() ? `${genitive(name)} günlüğü` : "Günlüğüm";
}

/** Özel isme belirtme (-i) hâli eki: Kasım'ı, Ekim'i, Ağustos'u, Eylül'ü. */
export function accusative(name: string): string {
  const n = name.trim();
  if (!n) return "";
  const lower = n.toLocaleLowerCase("tr");
  const vowels = "aeıioöuü";
  let last = "";
  for (let i = lower.length - 1; i >= 0; i--) {
    if (vowels.includes(lower[i])) {
      last = lower[i];
      break;
    }
  }
  const suffix = { a: "ı", ı: "ı", e: "i", i: "i", o: "u", u: "u", ö: "ü", ü: "ü" }[last] ?? "i";
  return `${n}'${vowels.includes(lower[lower.length - 1]) ? "y" : ""}${suffix}`;
}
