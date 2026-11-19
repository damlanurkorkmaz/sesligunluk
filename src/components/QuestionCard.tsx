"use client";

import { useEffect, useState } from "react";
import { waveColor } from "@/lib/moods";

type Phase = "back" | "front" | "leaving" | "drawing";
const LEAVE_MS = 420;
const WAVE = [6, 11, 17, 22, 15, 10, 6];

/**
 * "Aklına bir şey gelmezse" soru kartı: deri sırtlı bir desteden kart çekilir,
 * dokununca döner ve soru görünür; "başka kart" eskisini kenara atıp yenisini çeker.
 */
export function QuestionCard({ prompts, start }: { prompts: string[]; start: number }) {
  const [ix, setIx] = useState(start % prompts.length);
  const [phase, setPhase] = useState<Phase>("back");
  const [draw, setDraw] = useState(0);

  useEffect(() => {
    if (phase === "leaving") {
      const t = setTimeout(() => {
        setIx((i) => (i + 1) % prompts.length);
        setDraw((n) => n + 1);
        setPhase("drawing");
      }, LEAVE_MS);
      return () => clearTimeout(t);
    }
    if (phase === "drawing") {
      const t = setTimeout(() => setPhase("front"), 90);
      return () => clearTimeout(t);
    }
  }, [phase, prompts.length]);

  const faceUp = phase === "front" || phase === "leaving";

  return (
    <div className="qdeck-wrap">
      <div className="qdeck">
        <span className="qcard-stack qcard-back qcard-stack--2" aria-hidden="true" />
        <span className="qcard-stack qcard-back qcard-stack--1" aria-hidden="true" />
        <button
          key={draw}
          className={`qcard qcard--${phase}`}
          onClick={() => phase === "back" && setPhase("front")}
          aria-label={faceUp ? prompts[ix] : "Bir soru kartı çek"}
          aria-live="polite"
        >
          <span className="qcard-face qcard-back">
            <span className="qcard-frame" />
            <span className="qcard-wave" aria-hidden="true">
              {WAVE.map((h, i) => (
                <i key={i} style={{ height: h, background: waveColor(i / (WAVE.length - 1)) }} />
              ))}
            </span>
            <span className="qcard-cta">Bir kart çek</span>
          </span>
          <span className="qcard-face qcard-front">
            <span className="qcard-label">Bugünün sorusu</span>
            <span className="qcard-q">“{prompts[ix]}”</span>
          </span>
        </button>
      </div>
      <button className="today-shuffle qdeck-again" onClick={() => setPhase("leaving")} disabled={!faceUp} style={{ visibility: faceUp ? "visible" : "hidden" }}>
        ↻ başka kart çek
      </button>
    </div>
  );
}
