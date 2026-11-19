"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon, RestartIcon } from "./Icons";
import { GunlukNative } from "@/lib/native";
import { waveColor } from "@/lib/moods";
import { formatClock } from "@/lib/dates";
import { tap } from "@/lib/haptics";
import { MAX_RECORD_SECONDS } from "@/app.config";

const BARS = 40;
const MIN_SECONDS = 2;

export function RecordScreen({
  prompt,
  onDone,
  onCancel,
}: {
  prompt: string;
  onDone: (fileName: string, durationSec: number) => void;
  onCancel: () => void;
}) {
  const [levels, setLevels] = useState<number[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const active = useRef(false);
  const finishingRef = useRef(false);

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    active.current = false;
    try {
      const r = await GunlukNative.stopRecording();
      await tap("heavy");
      if (r.durationSec < MIN_SECONDS) {
        await GunlukNative.deleteAudio({ fileName: r.fileName });
        setError("Kayıt çok kısa oldu. Tekrar dener misin?");
        finishingRef.current = false;
        setFinishing(false);
        return;
      }
      onDone(r.fileName, r.durationSec);
    } catch {
      setError("Kayıt durdurulamadı.");
      finishingRef.current = false;
      setFinishing(false);
    }
  }, [onDone]);

  const start = useCallback(async () => {
    setError(null);
    setLevels([]);
    setElapsed(0);
    try {
      await GunlukNative.startRecording({ maxSeconds: MAX_RECORD_SECONDS });
      active.current = true;
      await tap("medium");
    } catch {
      setError("Kayıt başlatılamadı. Mikrofon iznini kontrol et.");
    }
  }, []);

  useEffect(() => {
    // Bileşen açılınca kayda başla; mount sırasında yerel kaydı başlatmak bilinçli bir yan etki.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void start();
    const timer = setInterval(async () => {
      if (!active.current) return;
      const r = await GunlukNative.getLevel().catch(() => null);
      if (!r || !active.current) return;
      setElapsed(r.elapsed);
      setLevels((prev) => [...prev.slice(-(BARS - 1)), r.level]);
      if (!r.isRecording) void finish(); // süre doldu
    }, 100);
    return () => {
      clearInterval(timer);
      if (active.current) {
        active.current = false;
        void GunlukNative.cancelRecording();
      }
    };
  }, [start, finish]);

  async function restart() {
    active.current = false;
    await GunlukNative.cancelRecording().catch(() => undefined);
    await start();
  }

  async function cancel() {
    active.current = false;
    await GunlukNative.cancelRecording().catch(() => undefined);
    onCancel();
  }

  const remaining = Math.max(0, MAX_RECORD_SECONDS - elapsed);
  const padded = [...Array(Math.max(0, BARS - levels.length)).fill(-1), ...levels];

  return (
    <main className="screen screen--dark pad" style={{ paddingBottom: "calc(var(--safe-bottom) + 32px)" }}>
      <div className="row between">
        <button className="icon-btn" onClick={cancel} aria-label="Kaydı iptal et">
          <CloseIcon />
        </button>
        <span className="pill" style={{ background: "rgba(245,239,232,0.1)", border: 0, fontSize: 14 }}>
          <span className="mood-dot" style={{ width: 8, height: 8, background: "var(--coral)" }} />
          {finishing ? "Kaydediliyor" : "Dinliyorum"}
        </span>
        <span style={{ width: 44 }} />
      </div>

      <div className="col" style={{ alignItems: "center", gap: 6, marginTop: 64 }}>
        <div style={{ fontSize: 80, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }} aria-live="off">
          {formatClock(elapsed)}
        </div>
        <div style={{ fontSize: 15, color: "var(--on-dark-muted)" }}>{Math.ceil(remaining)} saniye kaldı</div>
      </div>

      <div className="wave" aria-hidden="true" style={{ height: 120, marginTop: 48 }}>
        {padded.map((lv, i) => (
          <span
            key={i}
            style={{
              height: lv < 0 ? 6 : Math.max(6, lv * 120),
              background: lv < 0 ? "rgba(245,239,232,0.18)" : waveColor(i / (BARS - 1)),
            }}
          />
        ))}
      </div>

      <div className="col" style={{ marginTop: 40, padding: 16, borderRadius: 16, background: "rgba(185,168,201,0.16)", gap: 4 }}>
        <span className="eyebrow" style={{ color: "var(--lilac)" }}>Bugünün sorusu</span>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{prompt}</span>
      </div>

      {error && (
        <p role="alert" style={{ marginTop: 16, color: "var(--on-dark)", fontSize: 15 }}>
          {error}
        </p>
      )}

      <div className="grow" />

      <div className="row between" style={{ padding: "0 24px" }}>
        <div className="col" style={{ alignItems: "center", gap: 8, width: 72 }}>
          <button className="icon-btn" style={{ width: 56, height: 56 }} onClick={restart} aria-label="Baştan al" disabled={finishing}>
            <RestartIcon />
          </button>
          <span style={{ fontSize: 13, color: "var(--on-dark-muted)" }}>Baştan al</span>
        </div>
        <div className="col" style={{ alignItems: "center", gap: 8 }}>
          <button
            onClick={() => void finish()}
            disabled={finishing}
            aria-label="Kaydı bitir"
            style={{ width: 88, height: 88, borderRadius: "50%", border: "4px solid rgba(217,145,130,0.35)", background: "var(--coral)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <span style={{ width: 28, height: 28, borderRadius: 6, background: "var(--aubergine)" }} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Bitir</span>
        </div>
        <div style={{ width: 72 }} />
      </div>
    </main>
  );
}
