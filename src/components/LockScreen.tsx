"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaceIdIcon } from "./Icons";
import { GunlukNative } from "@/lib/native";
import { APP_NAME } from "@/app.config";

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const tried = useRef(false);

  const unlock = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    try {
      await GunlukNative.authenticate({ reason: "Günlüğünü açmak için kimliğini doğrula" });
      onUnlock();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [onUnlock]);

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    // Açılışta doğrulamayı kendiliğinden başlat.
    void unlock();
  }, [unlock]);

  return (
    <main className="screen screen--dark pad" style={{ alignItems: "center", justifyContent: "center", gap: 20, textAlign: "center" }}>
      <FaceIdIcon color="var(--lilac)" size={56} />
      <h1 className="title">{APP_NAME} kilitli</h1>
      <p style={{ margin: 0, color: "var(--on-dark-muted)" }}>{failed ? "Doğrulanamadı. Tekrar dene." : "Devam etmek için kimliğini doğrula."}</p>
      <button className="btn btn--primary" style={{ maxWidth: 260 }} onClick={unlock} disabled={busy}>
        Kilidi aç
      </button>
    </main>
  );
}
