import { GunlukNative } from "./native";
import { type Entry, getEntry, saveEntry } from "./entries";

export type Step = "transcribing" | "summarizing" | "saving" | "done";

export interface ProcessResult {
  entry: Entry;
  /** Kullanıcıya gösterilecek açıklama (ör. cihaz içi tanıma yok). */
  notice: string | null;
}

export const WAVE_BARS = 48;

/** Kayıt boyunca alınan seviyeleri sabit sayıda çubuğa indirger (her dilimin tepe değeri). */
export function downsample(samples: number[], bars: number): number[] {
  if (samples.length === 0) return [];
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    const a = Math.floor((i * samples.length) / bars);
    const b = Math.max(a + 1, Math.floor(((i + 1) * samples.length) / bars));
    const slice = samples.slice(a, b);
    out.push(Math.round(Math.max(...slice) * 100) / 100);
  }
  return out;
}

const TRANSCRIBE_HELP: Record<string, string> = {
  on_device_unavailable:
    "Bu cihazda Türkçe cihaz içi konuşma tanıma etkin değil. Ayarlar > Genel > Klavye'den Türkçe klavye ekleyip Dikte'yi açmak genelde çözer. Sesin kaydedildi; metni elle yazabilirsin.",
  locale_unsupported: "Türkçe konuşma tanıma bu cihazda desteklenmiyor. Sesin kaydedildi; metni elle yazabilirsin.",
};

/** Kayıttan sonra: yazıya çevir → (destek varsa) özetle → kaydet. Her adım başarısız olsa da kayıt korunur. */
export async function processRecording(
  date: string,
  fileName: string,
  durationSec: number,
  samples: number[],
  onStep: (s: Step) => void,
): Promise<ProcessResult> {
  let transcript = "";
  let summary = "";
  let mood: Entry["mood"] = null;
  let tags: string[] = [];
  let aiGenerated = false;
  let notice: string | null = null;

  onStep("transcribing");
  try {
    const r = await GunlukNative.transcribe({ fileName, locale: "tr-TR" });
    transcript = r.text.trim();
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code ?? "";
    notice = TRANSCRIBE_HELP[code] ?? "Kayıt yazıya çevrilemedi. Sesin kaydedildi; metni elle yazabilirsin.";
  }

  if (transcript) {
    const ai = await GunlukNative.isAIAvailable().catch(() => ({ available: false, reason: "error" }));
    if (ai.available) {
      onStep("summarizing");
      try {
        const s = await GunlukNative.summarize({ text: transcript });
        summary = s.summary;
        mood = s.mood;
        tags = s.tags.slice(0, 3);
        aiGenerated = true;
      } catch {
        notice = "Özet çıkarılamadı. Ruh halini kendin seçebilirsin.";
      }
    }
  }

  onStep("saving");
  const previous = await getEntry(date);
  const now = new Date().toISOString();
  const entry = await saveEntry({
    date,
    fileName,
    durationSec,
    transcript,
    summary,
    mood,
    tags,
    aiGenerated,
    waveform: downsample(samples, WAVE_BARS),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  });
  // Aynı gün yeniden kaydedildiyse eski sesi sil.
  if (previous && previous.fileName !== fileName) {
    await GunlukNative.deleteAudio({ fileName: previous.fileName }).catch(() => undefined);
  }
  onStep("done");
  return { entry, notice };
}
