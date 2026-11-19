"use client";

import { useId } from "react";
import { waveColor } from "@/lib/moods";

const RINGS = 12;
const WAVE = [14, 26, 42, 54, 38, 24, 12];

/** Sim baskı ses dalgası: marka renk geçişi + üstten vuran ışık. */
function FoilWave({ scale = 1 }: { scale?: number }) {
  const w = Math.max(5, Math.round(7 * scale));
  return (
    <div className="nb-foil" aria-hidden="true" style={{ gap: Math.max(4, Math.round(6 * scale)) }}>
      {WAVE.map((h, i) => {
        const c = waveColor(i / (WAVE.length - 1));
        return (
          <span
            key={i}
            style={{
              width: w,
              height: Math.round(h * scale),
              borderRadius: w / 2,
              background: `linear-gradient(160deg, rgba(255,255,255,0.55) 0%, ${c} 35%, ${c} 70%, rgba(40,25,40,0.25) 100%)`,
            }}
          />
        );
      })}
    </div>
  );
}

/** Deri yüzey: kabartma doku, sırt gölgesi, dikiş, sim dalga ve kör baskı başlık. */
export function LeatherFace({ title, scale = 1 }: { title: string; scale?: number }) {
  const fid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <div className="nb-leather">
      <svg className="nb-grain" aria-hidden="true" width="100%" height="100%">
        <filter id={fid} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} seed={7} result="n" />
          <feDiffuseLighting in="n" lightingColor="#B7A6BB" surfaceScale={1.6}>
            <feDistantLight azimuth={235} elevation={55} />
          </feDiffuseLighting>
        </filter>
        <rect width="100%" height="100%" filter={`url(#${fid})`} />
      </svg>
      <span className="nb-spine-shade" />
      <span className="nb-stitch" />
      <div className="nb-face">
        <FoilWave scale={scale} />
        <span className="nb-title" style={{ fontSize: Math.round(24 * scale) }}>
          {title}
        </span>
      </div>
      <span className="nb-vignette" />
    </div>
  );
}

/**
 * Kapalı defter. `opening` true olunca kapak spiralden döner (açılır);
 * `under` kapak açıldıkça görünen ilk sayfadır.
 */
export function NotebookCover({
  title,
  width = 240,
  height = 320,
  opening = false,
  under,
}: {
  title: string;
  width?: number;
  height?: number;
  opening?: boolean;
  under?: React.ReactNode;
}) {
  const scale = width / 240;
  return (
    <div className="nb-cover" style={{ width, height }} role="img" aria-label={`${title} defteri`}>
      <div className="nb-stack" />
      <span className="nb-ribbon" />
      {under && <div className="nb-under">{under}</div>}
      <div className={`nb-hinge ${opening ? "nb-hinge--open" : ""}`}>
        <LeatherFace title={title} scale={scale} />
        <span className="nb-band" />
        <span className="nb-corner nb-corner--top" aria-hidden="true" />
        <span className="nb-corner nb-corner--bottom" aria-hidden="true" />
      </div>
      <div className="nb-rings" aria-hidden="true">
        {Array.from({ length: RINGS }, (_, i) => (
          <span key={i} className="spiral-ring" />
        ))}
      </div>
    </div>
  );
}

/** Kapağın arkasından yelpaze gibi açılan bir sayfa (içeriğe dair ipucu). */
function PeekPage({ date, weekday, stamp, ink, rotate, x, lines }: { date: string; weekday: string; stamp: string; ink: string; rotate: number; x: number; lines: number[] }) {
  return (
    <div className="nb-peek" style={{ transform: `translate(${x}px, 6px) rotate(${rotate}deg)` }} aria-hidden="true">
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="col">
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 600 }}>{date}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)" }}>{weekday}</span>
        </div>
        <span className="nb-peek-stamp" style={{ color: ink }}>
          {stamp}
        </span>
      </div>
      {lines.map((w, i) => (
        <span key={i} className="nb-peek-ink" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

const BG_WAVE = [18, 30, 46, 64, 84, 104, 92, 120, 140, 118, 96, 128, 150, 132, 108, 86, 112, 136, 120, 94, 72, 88, 66, 48, 34, 22];

/** Giriş sahnesi: soluk arka dalga, arkadan görünen iki sayfa ve kapak. */
export function CoverScene({ title, opening, under }: { title: string; opening: boolean; under?: React.ReactNode }) {
  return (
    <div className="nb-scene">
      <div className="nb-bgwave" aria-hidden="true">
        {BG_WAVE.map((h, i) => (
          <span key={i} style={{ height: h, background: waveColor(i / (BG_WAVE.length - 1)) }} />
        ))}
      </div>
      <div className={`nb-scene-book ${opening ? "nb-scene-book--opening" : ""}`}>
        <div className={`nb-peeks ${opening ? "nb-peeks--away" : ""}`}>
          <PeekPage date="12 Kasım" weekday="Perşembe" stamp="İYİ" ink="#5F6B54" rotate={14} x={38} lines={[92, 84, 70]} />
          <PeekPage date="18 Kasım" weekday="Çarşamba" stamp="HARİKA" ink="#5E6C50" rotate={6} x={22} lines={[96, 88, 92, 60]} />
        </div>
        <NotebookCover title={title} opening={opening} under={under} />
      </div>
    </div>
  );
}
