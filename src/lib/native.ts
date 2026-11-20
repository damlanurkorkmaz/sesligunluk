import { registerPlugin, WebPlugin } from "@capacitor/core";

export type PermissionState = "granted" | "denied" | "prompt";
export type Mood = "harika" | "iyi" | "normal" | "yorgun" | "zor";

export interface GunlukNativePlugin {
  checkPermissions(): Promise<{ microphone: PermissionState; speech: PermissionState }>;
  requestPermissions(): Promise<{ microphone: PermissionState; speech: PermissionState }>;
  startRecording(opts: { maxSeconds: number }): Promise<{ fileName: string }>;
  stopRecording(): Promise<{ fileName: string; durationSec: number }>;
  cancelRecording(): Promise<void>;
  getLevel(): Promise<{ level: number; isRecording: boolean; elapsed: number }>;
  transcribe(opts: { fileName: string; locale?: string }): Promise<{ text: string }>;
  isAIAvailable(): Promise<{ available: boolean; reason: string }>;
  summarize(opts: { text: string }): Promise<{ summary: string; mood: Mood; tags: string[] }>;
  deleteAudio(opts: { fileName: string }): Promise<void>;
  getAudioPath(opts: { fileName: string }): Promise<{ path: string }>;
  biometryType(): Promise<{ type: "faceID" | "touchID" | "passcode" | "none"; available: boolean }>;
  authenticate(opts: { reason?: string }): Promise<{ success: boolean }>;
  // Premium (StoreKit 2)
  getProducts(): Promise<{ products: StoreProduct[] }>;
  purchase(opts: { productId: string }): Promise<{ status: "purchased" | "cancelled" | "pending" | "unknown"; active?: string[] }>;
  restorePurchases(): Promise<{ active: string[] }>;
  getEntitlements(): Promise<{ active: string[] }>;
  isTestBuild(): Promise<{ test: boolean }>;
  // Ayın mektubu (cihaz içi yapay zekâ)
  monthLetter(opts: { name: string; month: string; notes: string[] }): Promise<{ text: string }>;
  // iCloud yedeği
  icloudStatus(): Promise<{ available: boolean; signedIn: boolean }>;
  backupToICloud(opts: { json: string; audioFiles: string[] }): Promise<{ date: string; bytes: number }>;
  restoreFromICloud(): Promise<{ json: string | null; date: string | null }>;
}

export interface StoreProduct {
  id: string;
  price: string; // yerelleştirilmiş, ör. "499,99 TL"
  priceValue: number;
  period: "year" | "month" | "lifetime" | "other";
  trialDays?: number;
  eligibleForTrial?: boolean;
}

/**
 * Tarayıcıda (`npm run dev`) arayüzü denemek için sahte uygulama.
 * Gerçek iPhone'da ios/App/App/GunlukNativePlugin.swift çalışır.
 */
class GunlukNativeWeb extends WebPlugin {
  private startedAt = 0;
  private maxSeconds = 60;
  private fileName: string | null = null;

  async checkPermissions() {
    return { microphone: "granted" as const, speech: "granted" as const };
  }
  async requestPermissions() {
    return this.checkPermissions();
  }
  async startRecording({ maxSeconds }: { maxSeconds: number }) {
    this.startedAt = Date.now();
    this.maxSeconds = maxSeconds;
    this.fileName = `web-${this.startedAt}.m4a`;
    return { fileName: this.fileName };
  }
  private elapsed() {
    return Math.min(this.maxSeconds, (Date.now() - this.startedAt) / 1000);
  }
  async getLevel() {
    const isRecording = this.fileName !== null && this.elapsed() < this.maxSeconds;
    const t = Date.now() / 180;
    const level = isRecording ? Math.max(0.05, Math.abs(Math.sin(t) * Math.cos(t / 3)) * 0.9) : 0;
    return { level, isRecording, elapsed: this.elapsed() };
  }
  async stopRecording() {
    const fileName = this.fileName ?? "web.m4a";
    const durationSec = this.elapsed();
    this.fileName = null;
    return { fileName, durationSec };
  }
  async cancelRecording() {
    this.fileName = null;
  }
  async transcribe() {
    await new Promise((r) => setTimeout(r, 800));
    return {
      text: "Bugün sabah erkenden ofise gittim, öğlene kadar sunuma hazırlandım. Sunum sandığımdan çok daha iyi geçti. Akşam Elif'le sahilde yürüdük, hava serindi ama çok iyi geldi.",
    };
  }
  async isAIAvailable() {
    return { available: true, reason: "web_mock" };
  }
  async summarize() {
    await new Promise((r) => setTimeout(r, 800));
    return {
      summary: "Sunum beklediğinden iyi geçti ve içini rahatlattı. Akşam Elif'le sahilde yürümek günü güzel kapattı.",
      mood: "iyi" as Mood,
      tags: ["iş", "arkadaşlar", "yürüyüş"],
    };
  }
  async deleteAudio() {}
  async getAudioPath(): Promise<{ path: string }> {
    // Tarayıcıda gerçek ses dosyası yok; oynatıcı devre dışı görünür.
    return { path: "" };
  }
  async biometryType() {
    return { type: "faceID" as const, available: true };
  }
  async authenticate() {
    await new Promise((r) => setTimeout(r, 900)); // Face ID'nin süresini taklit et
    return { success: true };
  }

  // ---- Premium taklidi: tarayıcıda localStorage'daki "mock.premium" ile ----
  async getProducts() {
    const p = (id: string, price: string, priceValue: number, period: StoreProduct["period"], trialDays?: number): StoreProduct => ({ id, price, priceValue, period, trialDays, eligibleForTrial: !!trialDays });
    return {
      products: [
        p("com.damlanur.sesligunluk.premium.yearly", "499,99 TL", 499.99, "year", 14),
        p("com.damlanur.sesligunluk.premium.monthly", "99,99 TL", 99.99, "month"),
        p("com.damlanur.sesligunluk.premium.lifetime", "1.299,99 TL", 1299.99, "lifetime"),
      ],
    };
  }
  private active(): string[] {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem("mock.premium") : null;
    return v ? [v] : [];
  }
  async purchase({ productId }: { productId: string }) {
    await new Promise((r) => setTimeout(r, 600));
    localStorage.setItem("mock.premium", productId);
    return { status: "purchased" as const, active: this.active() };
  }
  async restorePurchases() {
    return { active: this.active() };
  }
  async getEntitlements() {
    return { active: this.active() };
  }
  async isTestBuild() {
    return { test: true }; // tarayıcıda deneme
  }
  async monthLetter({ name }: { name: string; month: string; notes: string[] }) {
    await new Promise((r) => setTimeout(r, 900));
    return {
      text: `Sevgili ${name || "dostum"},\nBu ay bana sık sık Elif'ten ve akşam yürüyüşlerinden bahsettin. Yoğun günlerin oldu ama her seferinde ertesi gün daha hafif konuştun. Kendine ayırdığın o kısa yürüyüşler, ayın en sakin anları gibiydi.`,
    };
  }
  async icloudStatus() {
    return { available: true, signedIn: true };
  }
  async backupToICloud({ json }: { json: string; audioFiles: string[] }) {
    await new Promise((r) => setTimeout(r, 700));
    localStorage.setItem("mock.icloud", json);
    return { date: new Date().toISOString(), bytes: json.length };
  }
  async restoreFromICloud() {
    return { json: localStorage.getItem("mock.icloud"), date: null };
  }
}

export const GunlukNative = registerPlugin<GunlukNativePlugin>("GunlukNative", {
  web: () => new GunlukNativeWeb(),
});
