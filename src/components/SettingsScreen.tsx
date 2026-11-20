"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Share } from "@capacitor/share";
import { TabBar, type Tab } from "./TabBar";
import { LockIcon, PencilIcon } from "./Icons";
import { type Settings, loadSettings, saveSettings } from "@/lib/settings";
import { cancelReminder, scheduleDailyReminder } from "@/lib/reminder";
import { type Entry, deleteAllEntries } from "@/lib/entries";
import { GunlukNative, type PermissionState } from "@/lib/native";
import { fromKey, longDate } from "@/lib/dates";
import { moodInfo } from "@/lib/moods";
import { APP_NAME } from "@/app.config";

const AI_REASON: Record<string, string> = {
  deviceNotEligible: "Bu cihaz Apple Intelligence'ı desteklemiyor",
  appleIntelligenceNotEnabled: "Ayarlar > Apple Intelligence ve Siri'den açılmalı",
  modelNotReady: "Model indiriliyor, biraz sonra tekrar dene",
  locale_unsupported: "Sistem dili Türkçe olmalı",
  os_too_old: "iOS 26 veya üstü gerekiyor",
  web_mock: "Tarayıcı modu (sahte)",
};

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}

function Status({ ok, text }: { ok: boolean | null; text: string }) {
  const color = ok === null ? "var(--line-strong)" : ok ? "#5E6C50" : "#B8695A";
  return (
    <span className="small" style={{ fontWeight: 600, textAlign: "right" }}>
      <span className="status-dot" style={{ background: color }} />
      {text}
    </span>
  );
}

const permText = (p: PermissionState | undefined) => (p === "granted" ? "İzin var" : p === "denied" ? "İzin yok" : "Sorulmadı");

export function SettingsScreen({ entries, onTab, onDataCleared }: { entries: Entry[]; onTab: (t: Tab) => void; onDataCleared: () => void }) {
  const [s, setS] = useState<Settings | null>(null);
  const [bio, setBio] = useState<{ type: string; available: boolean } | null>(null);
  const [perms, setPerms] = useState<{ microphone: PermissionState; speech: PermissionState } | null>(null);
  const [ai, setAi] = useState<{ available: boolean; reason: string } | null>(null);
  const [version, setVersion] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  useEffect(() => {
    (async () => {
      setS(await loadSettings());
      setBio(await GunlukNative.biometryType().catch(() => ({ type: "none", available: false })));
      setPerms(await GunlukNative.checkPermissions().catch(() => null));
      setAi(await GunlukNative.isAIAvailable().catch(() => ({ available: false, reason: "error" })));
      const info = await App.getInfo().catch(() => null);
      setVersion(info ? `${info.version} (${info.build})` : "web");
    })();
  }, []);

  async function update(patch: Partial<Settings>) {
    if (!s) return;
    const next = { ...s, ...patch };
    setS(next);
    await saveSettings(next);
    if ("reminderOn" in patch || "reminderHour" in patch || "reminderMinute" in patch) {
      if (next.reminderOn) {
        const ok = await scheduleDailyReminder(next.reminderHour, next.reminderMinute);
        if (!ok) setMessage("Bildirim izni yok. Ayarlar > Bildirimler'den izin verebilirsin.");
      } else {
        await cancelReminder();
      }
    }
  }

  async function toggleLock(on: boolean) {
    if (on) {
      // Açmadan önce bir kez doğrula: kullanıcı kendini dışarıda bırakmasın.
      try {
        await GunlukNative.authenticate({ reason: "Kilidi açmak için kimliğini doğrula" });
      } catch {
        return;
      }
    }
    await update({ lockOn: on });
  }

  async function exportText() {
    const text = [...entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => {
        const m = moodInfo(e.mood);
        return [longDate(fromKey(e.date)), m ? `Ruh hali: ${m.label}` : "", e.summary ? `Özet: ${e.summary}` : "", "", e.transcript].filter((x, i) => x || i === 3).join("\n");
      })
      .join("\n\n———\n\n");
    try {
      await Share.share({ title: `${APP_NAME} kayıtları`, text });
    } catch {
      setMessage("Paylaşım açılamadı.");
    }
  }

  async function wipe() {
    if (!confirmWipe) {
      setConfirmWipe(true);
      return;
    }
    const files = await deleteAllEntries();
    await Promise.all(files.map((f) => GunlukNative.deleteAudio({ fileName: f }).catch(() => undefined)));
    setConfirmWipe(false);
    setMessage("Tüm kayıtlar silindi.");
    onDataCleared();
  }

  const timeValue = s ? `${String(s.reminderHour).padStart(2, "0")}:${String(s.reminderMinute).padStart(2, "0")}` : "21:00";
  const bioLabel = bio?.type === "faceID" ? "Face ID ile kilitle" : bio?.type === "touchID" ? "Touch ID ile kilitle" : "Şifreyle kilitle";

  return (
    <main className="screen">
      <header className="pad">
        <h1 className="title">Ayarlar</h1>
      </header>

      <div className="pad col" style={{ gap: 24, marginTop: 20, paddingBottom: 24 }}>
        {message && (
          <p className="notice" role="status" style={{ margin: 0 }}>
            {message}
          </p>
        )}

        <section aria-labelledby="h-you">
          <h2 id="h-you" className="eyebrow" style={{ margin: "0 4px 8px" }}>Defterin</h2>
          <div className="settings-group">
            <label className="settings-row" htmlFor="owner-name">
              <span>Adın</span>
              <span className="settings-name">
                {/* Görünmez kopya alanın genişliğini belirler: çizgi yazı kadar uzar */}
                <span className="settings-name-fit" data-value={s?.name || "İsteğe bağlı"}>
                  <input
                    id="owner-name"
                    className="settings-name-input"
                    value={s?.name ?? ""}
                    maxLength={30}
                    placeholder="İsteğe bağlı"
                    autoCapitalize="words"
                    size={1}
                    onChange={(e) => s && setS({ ...s, name: e.target.value })}
                    onBlur={(e) => update({ name: e.target.value.trim() })}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    enterKeyHint="done"
                  />
                </span>
                <PencilIcon size={15} />
              </span>
            </label>
          </div>
        </section>

        <section aria-labelledby="h-reminder">
          <h2 id="h-reminder" className="eyebrow" style={{ margin: "0 4px 8px" }}>Hatırlatma</h2>
          <div className="settings-group">
            <div className="settings-row">
              <span>Her gün hatırlat</span>
              <Switch on={!!s?.reminderOn} onChange={(v) => update({ reminderOn: v })} label="Her gün hatırlat" />
            </div>
            {s?.reminderOn && (
              <label className="settings-row" htmlFor="reminder-time">
                <span>Saat</span>
                <input
                  id="reminder-time"
                  className="time-input"
                  type="time"
                  value={timeValue}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":").map(Number);
                    if (!Number.isNaN(h) && !Number.isNaN(m)) void update({ reminderHour: h, reminderMinute: m });
                  }}
                />
              </label>
            )}
          </div>
        </section>

        <section aria-labelledby="h-privacy">
          <h2 id="h-privacy" className="eyebrow" style={{ margin: "0 4px 8px" }}>Gizlilik</h2>
          <div className="settings-group">
            <div className="settings-row">
              <span>{bioLabel}</span>
              <Switch on={!!s?.lockOn} onChange={toggleLock} label={bioLabel} />
            </div>
          </div>
          <p className="settings-hint">Uygulama her açıldığında kimliğini doğrulaman istenir.</p>
        </section>

        <section aria-labelledby="h-data">
          <h2 id="h-data" className="eyebrow" style={{ margin: "0 4px 8px" }}>Verilerin</h2>
          <div className="settings-group">
            <button className="settings-row" onClick={exportText} disabled={entries.length === 0}>
              <span>Metinleri dışa aktar</span>
              <span className="small muted">{entries.length} kayıt</span>
            </button>
            <button className="settings-row" onClick={wipe} disabled={entries.length === 0} style={{ color: "#9A3B2C", fontWeight: confirmWipe ? 800 : 500 }}>
              {confirmWipe ? "Emin misin? Silmek için tekrar dokun" : "Tüm kayıtları sil"}
            </button>
          </div>
          <p className="settings-hint">Kayıtların yalnızca bu telefonda duruyor. Silinen kayıtlar geri getirilemez.</p>
        </section>

        <section aria-labelledby="h-device">
          <h2 id="h-device" className="eyebrow" style={{ margin: "0 4px 8px" }}>Cihaz durumu</h2>
          <div className="settings-group">
            <div className="settings-row">
              <span>Mikrofon</span>
              <Status ok={perms ? perms.microphone === "granted" : null} text={permText(perms?.microphone)} />
            </div>
            <div className="settings-row">
              <span>Konuşma tanıma</span>
              <Status ok={perms ? perms.speech === "granted" : null} text={permText(perms?.speech)} />
            </div>
            <div className="settings-row" style={{ alignItems: "flex-start" }}>
              <span>Yapay zekâ özeti</span>
              <Status ok={ai ? ai.available : null} text={ai ? (ai.available ? "Hazır" : AI_REASON[ai.reason] ?? ai.reason) : "Kontrol ediliyor"} />
            </div>
          </div>
        </section>

        <section className="col" style={{ alignItems: "center", gap: 6, paddingTop: 8 }}>
          <span className="row small muted" style={{ gap: 6 }}>
            <LockIcon size={14} />
            Sesin ve metinlerin telefonundan çıkmaz
          </span>
          <span className="small muted">
            {APP_NAME} · {version}
          </span>
        </section>
      </div>

      <div className="grow" />
      <TabBar active="settings" onChange={onTab} />
    </main>
  );
}
