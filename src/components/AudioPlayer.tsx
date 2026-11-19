"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { GunlukNative } from "@/lib/native";
import { waveColor } from "@/lib/moods";
import { formatClock } from "@/lib/dates";
import { WAVE_BARS } from "@/lib/pipeline";

const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5z" />
  </svg>
);
const PauseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

/** Eski kayıtlarda dalga verisi yoksa sabit, sakin bir desen göster. */
const FALLBACK = Array.from({ length: WAVE_BARS }, (_, i) => 0.25 + 0.2 * Math.abs(Math.sin(i * 0.7)));

export function AudioPlayer({ fileName, durationSec, waveform, compact = false }: { fileName: string; durationSec: number; waveform: number[]; compact?: boolean }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    let alive = true;
    GunlukNative.getAudioPath({ fileName })
      .then(({ path }) => {
        if (!alive) return;
        if (!path) setUnavailable(true);
        else setSrc(Capacitor.convertFileSrc(path));
      })
      .catch(() => alive && setUnavailable(true));
    return () => {
      alive = false;
    };
  }, [fileName]);

  // Ekrandan çıkınca çalmayı durdur.
  useEffect(() => {
    const el = audio.current;
    return () => el?.pause();
  }, [src]);

  async function toggle() {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      try {
        await el.play();
      } catch {
        setUnavailable(true);
      }
    } else {
      el.pause();
    }
  }

  const bars = waveform.length ? waveform : FALLBACK;
  const total = durationSec || 1;
  const progress = Math.min(1, position / total);

  const audioEl = src && (
    <audio
      ref={audio}
      src={src}
      preload="metadata"
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onEnded={() => {
        setPlaying(false);
        setPosition(0);
      }}
      onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
    />
  );

  if (compact) {
    return (
      <span className="row" style={{ gap: 8 }}>
        <span className="small muted" style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {unavailable ? "" : formatClock(playing || position > 0 ? position : durationSec)}
        </span>
        <button
          onClick={toggle}
          disabled={!src}
          aria-label={playing ? "Duraklat" : "Bu günün kaydını dinle"}
          style={{ width: 40, height: 40, borderRadius: "50%", border: 0, background: "var(--coral)", color: "var(--aubergine)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        {audioEl}
      </span>
    );
  }

  return (
    <div className="card row" style={{ gap: 12, padding: "12px 14px" }}>
      <button
        onClick={toggle}
        disabled={!src}
        aria-label={playing ? "Duraklat" : "Kaydı dinle"}
        style={{ flexShrink: 0, width: 44, height: 44, borderRadius: "50%", border: 0, background: "var(--coral)", color: "var(--aubergine)", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className="grow wave" aria-hidden="true" style={{ height: 32, gap: 1, minWidth: 0 }}>
        {bars.map((lv, i) => {
          const t = i / (bars.length - 1);
          const played = t <= progress && (playing || position > 0);
          return (
            <span
              key={i}
              style={{
                flex: "1 1 0",
                minWidth: 1.5,
                maxWidth: 3,
                height: Math.max(4, lv * 32),
                background: waveColor(t),
                opacity: played || (!playing && position === 0) ? 1 : 0.35,
              }}
            />
          );
        })}
      </div>

      <span className="small muted" style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: 34, textAlign: "right" }}>
        {unavailable ? "—" : formatClock(playing || position > 0 ? position : durationSec)}
      </span>

      {audioEl}
    </div>
  );
}
