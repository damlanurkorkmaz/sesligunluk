"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NotebookCover } from "./NotebookCover";
import type { CoverLook } from "@/lib/themes";
import { GunlukNative } from "@/lib/native";
import { journalTitle } from "@/lib/turkish";

const OPEN_MS = 1500;

/** Kilit ekranı = kapalı defter. Kimlik doğrulanınca kapak spiralden açılır. */
export function LockScreen({ name, look, onUnlock }: { name: string; look?: CoverLook; onUnlock: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState(false);
  const tried = useRef(false);

  const unlock = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    try {
      await GunlukNative.authenticate({ reason: "Günlüğünü açmak için kimliğini doğrula" });
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      if (reduce) {
        onUnlock();
        return;
      }
      setOpening(true);
      setTimeout(onUnlock, OPEN_MS);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [onUnlock]);

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    void unlock(); // açılışta doğrulamayı kendiliğinden başlat
  }, [unlock]);

  const firstPage = <div style={{ position: "absolute", inset: 0, background: "var(--paper-sheet)" }} />;

  return (
    <main className="screen pad" style={{ alignItems: "center", justifyContent: "center", gap: 28, textAlign: "center", paddingBottom: "calc(var(--safe-bottom) + 24px)" }}>
      <div style={{ transform: opening ? "scale(1.04)" : "none", transition: "transform 1500ms cubic-bezier(0.45, 0.05, 0.25, 1)" }}>
        <NotebookCover title={journalTitle(name)} width={250} height={340} opening={opening} under={firstPage} look={look} />
      </div>
      <div className="col" style={{ gap: 6, alignItems: "center", opacity: opening ? 0 : 1, transition: "opacity 450ms ease", marginTop: 20 }}>
        <span className="small muted" role="status">
          {failed ? "Doğrulanamadı. Tekrar dene." : "Defterin kilitli."}
        </span>
        <button className="btn btn--primary" style={{ width: 240 }} onClick={unlock} disabled={busy || opening}>
          Defteri aç
        </button>
      </div>
    </main>
  );
}
