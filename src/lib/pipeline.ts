import { GunlukNative } from "./native";
import { type Entry, getEntry, saveEntry } from "./entries";

export type Step = "transcribing" | "summarizing" | "saving" | "done";

export interface ProcessResult {
  entry: Entry;
  /** Kullanıcıya gösterilecek açıklama (ör. cihaz içi tanıma yok). */
  notice: string | null;
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
