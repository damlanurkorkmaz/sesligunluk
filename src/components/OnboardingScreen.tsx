"use client";

import { useState } from "react";
import { LockIcon, MicIcon } from "./Icons";
import { GunlukNative } from "@/lib/native";
import { scheduleDailyReminder } from "@/lib/reminder";
import { APP_NAME } from "@/app.config";

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const p = await GunlukNative.requestPermissions();
      if (p.microphone !== "granted") {
        setDenied(true);
        return;
      }
      await scheduleDailyReminder(21, 0);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen pad" style={{ paddingBottom: "calc(var(--safe-bottom) + 24px)" }}>
      <div className="grow row" style={{ justifyContent: "center" }}>
        <div className="rec-halo" style={{ width: 240, height: 240 }}>
          <div className="rec-btn" style={{ width: 104, height: 104 }} aria-hidden="true">
            <MicIcon size={44} />
          </div>
        </div>
      </div>

      <div className="col" style={{ gap: 14 }}>
        <h1 className="hero">Gününü 60 saniyede anlat.</h1>
        <p className="body" style={{ margin: 0, fontSize: 17 }}>
          Yazmana gerek yok. Konuş; {APP_NAME} sesini yazıya çevirsin, kısa bir özet çıkarsın.
        </p>
      </div>

      <div className="card row" style={{ marginTop: 24, gap: 14, alignItems: "flex-start" }}>
        <div className="row" style={{ width: 40, height: 40, borderRadius: 12, background: "var(--lilac-tint)", justifyContent: "center", flexShrink: 0 }}>
          <LockIcon />
        </div>
        <div className="col" style={{ gap: 4 }}>
          <strong style={{ fontSize: 15 }}>Sesin telefonundan çıkmaz</strong>
          <span className="small muted" style={{ lineHeight: 1.45 }}>
            Kayıt, yazıya çevirme ve özet tamamen cihazında yapılır. Hesap açman gerekmez.
          </span>
        </div>
      </div>

      {denied && (
        <p className="notice" role="alert" style={{ marginTop: 16, marginBottom: 0 }}>
          Mikrofon izni olmadan kayıt yapılamıyor. Ayarlar &gt; {APP_NAME} bölümünden mikrofona izin verebilirsin.
        </p>
      )}

      <button className="btn btn--primary" style={{ marginTop: 24 }} onClick={start} disabled={busy}>
        {busy ? "Bir saniye…" : "Başlayalım"}
      </button>
      <p className="small muted" style={{ textAlign: "center", margin: "12px 0 0" }}>
        Her akşam 21:00&apos;de nazik bir hatırlatma gönderilir.
      </p>
    </main>
  );
}
