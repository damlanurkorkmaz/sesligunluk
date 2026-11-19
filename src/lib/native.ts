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
}

export const GunlukNative = registerPlugin<GunlukNativePlugin>("GunlukNative", {
  web: () => new GunlukNativeWeb(),
});
