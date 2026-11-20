"use client";

import { useEffect, useState } from "react";
import { BackIcon } from "./Icons";
import type { Entry } from "@/lib/entries";
import { type Settings, loadSettings, saveSettings } from "@/lib/settings";
import { backupNow, restoreBackup } from "@/lib/backup";
import { GunlukNative } from "@/lib/native";

function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} disabled={disabled} />;
}

function when(iso: string | null): string {
  if (!iso) return "Henüz yok";
  const d = new Date(iso);
  const today = new Date();
  const hm = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Bugün ${hm}`;
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} ${hm}`;
}

/** iCloud yedeği: kullanıcının kendi iCloud Drive'ına, Premium. */
export function BackupScreen({ entries, onBack, onRestored }: { entries: Entry[]; onBack: () => void; onRestored: () => void }) {
  const [s, setS] = useState<Settings | null>(null);
  const [icloud, setIcloud] = useState<{ available: boolean; signedIn: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings().then(setS);
    void GunlukNative.icloudStatus()
      .then(setIcloud)
      .catch(() => setIcloud({ available: false, signedIn: false }));
  }, []);

  async function update(patch: Partial<Settings>) {
    const next = { ...(await loadSettings()), ...patch };
    await saveSettings(next);
    setS(next);
    return next;
  }

  async function runBackup() {
    setBusy(true);
    setNotice(null);
    const r = await backupNow();
    setBusy(false);
    if (r.ok) setS(await loadSettings());
    else setNotice("Yedeklenemedi. iCloud'a giriş yaptığından ve yerin olduğundan emin ol.");
  }

  async function runRestore() {
    setBusy(true);
    setNotice(null);
    const n = await restoreBackup();
    setBusy(false);
    if (n === null) setNotice("iCloud'da yedek bulunamadı.");
    else {
      setNotice(n === 0 ? "Defterin zaten güncel." : `${n} sayfa geri geldi.`);
      onRestored();
    }
  }

  const unavailable = icloud && !icloud.available;
  const sizeLabel = `${entries.length} sayfa`;

  return (
    <main className="screen">
      <header className="pad row" style={{ gap: 10 }}>
        <button className="icon-btn" onClick={onBack} aria-label="Geri">
          <BackIcon />
        </button>
        <h1 className="title" style={{ fontSize: 24 }}>
          Yedek
        </h1>
      </header>

      <div className="backup-hero" aria-hidden="true">
        <svg width="220" height="110" viewBox="0 0 220 110">
          <path d="M55 90 Q30 90 30 68 Q30 46 55 46 Q60 18 92 18 Q120 18 128 40 Q136 30 152 32 Q178 34 180 60 Q200 62 200 76 Q200 90 180 90 Z" fill="#fff" stroke="#D9D2C6" strokeWidth="2" />
          {s?.lastBackup && <path d="M98 66 l10 10 l20 -22" fill="none" stroke="#5E6C50" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
        <span className="backup-book leather" />
      </div>
      <div style={{ textAlign: "center", padding: "0 30px" }}>
        <div className="serif" style={{ fontSize: 22, fontWeight: 600, color: "var(--aubergine)" }}>
          {s?.lastBackup ? "Defterin güvende" : "Defterini yedekle"}
        </div>
        <p className="small muted" style={{ margin: "6px 0 0", lineHeight: 1.5 }}>
          Sayfaların ve seslerin senin iCloud&apos;una kopyalanır. Bizim sunucumuz yok; yedeği yalnızca sen ve Apple hesabın görebilir.
        </p>
      </div>

      <div className="pad col" style={{ gap: 8, marginTop: 20 }}>
        {unavailable && (
          <p className="notice" role="status" style={{ margin: 0 }}>
            {icloud!.signedIn ? "iCloud yedeği bu sürümde henüz etkin değil; bir sonraki güncellemede açılacak." : "Bu iPhone'da iCloud'a giriş yapılmamış. Ayarlar > Apple hesabın > iCloud'dan giriş yapabilirsin."}
          </p>
        )}
        <div className="settings-group">
          <div className="settings-row">
            <span>Otomatik yedekle</span>
            <Switch
              on={!!s?.backupOn}
              label="Otomatik yedekle"
              disabled={!!unavailable}
              onChange={async (v) => {
                await update({ backupOn: v });
                if (v) await runBackup();
              }}
            />
          </div>
          <div className="settings-row">
            <span>Son yedek</span>
            <span className="small" style={{ fontWeight: 700 }}>
              {s?.lastBackup && <span className="status-dot" style={{ background: "#5E6C50" }} />}
              {when(s?.lastBackup ?? null)}
            </span>
          </div>
          <div className="settings-row">
            <span>Yedeklenen</span>
            <span className="small muted">{sizeLabel}</span>
          </div>
          <div className="settings-row">
            <span>Sesleri de yedekle</span>
            <Switch on={s?.backupAudio ?? true} label="Sesleri de yedekle" onChange={(v) => void update({ backupAudio: v })} />
          </div>
        </div>
        <p className="settings-hint">Otomatik yedek, her yeni sayfadan sonra çalışır. Yeni telefonda aynı Apple hesabıyla &quot;Yedekten geri yükle&quot;ye dokun.</p>

        {notice && (
          <p className="notice" role="status" style={{ margin: "8px 0 0" }}>
            {notice}
          </p>
        )}
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <button className="btn btn--ghost" style={{ flex: 1 }} onClick={runBackup} disabled={busy || !!unavailable}>
            {busy ? "Bekle…" : "Şimdi yedekle"}
          </button>
          <button className="btn btn--ghost" style={{ flex: 1 }} onClick={runRestore} disabled={busy || !!unavailable}>
            Yedekten geri yükle
          </button>
        </div>
      </div>
      <div className="grow" />
    </main>
  );
}
