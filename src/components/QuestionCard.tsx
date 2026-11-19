"use client";

import { useState } from "react";
import { CloseIcon } from "./Icons";

/**
 * Soru kartları sayfanın sağ üst köşesinin altına sıkıştırılmış durur; uçları
 * deri kapağın üstüne taşar. "Bir kart çek"e dokununca en üstteki kart oradan
 * çıkıp sayfanın üstüne gelir ve dönerek soruyu gösterir.
 */
export function QuestionCard({ prompts, start }: { prompts: string[]; start: number }) {
  const [ix, setIx] = useState(start % prompts.length);
  const [drawn, setDrawn] = useState(false);
  const [n, setN] = useState(0);

  function draw() {
    if (drawn) {
      setIx((i) => (i + 1) % prompts.length);
    }
    setN((k) => k + 1);
    setDrawn(true);
  }

  return (
    <>
      <button className={`qtuck ${drawn ? "qtuck--drawn" : ""}`} onClick={draw} aria-label="Anlatacak bir şey yok mu? Bir soru kartı çek">
        <span className="qtuck-card qtuck-card--3" aria-hidden="true" />
        <span className="qtuck-card qtuck-card--2" aria-hidden="true" />
        <span className="qtuck-card qtuck-card--1">
          <span className="qtuck-kicker">Anlatacak bir şey yok mu?</span>
          <span className="qtuck-cta">Bir kart çek ↑</span>
        </span>
      </button>

      {drawn ? (
        <div className="qdrawn">
          <div key={n} className="qdrawn-card" role="note" aria-live="polite">
            <span className="qdrawn-face qdrawn-back" aria-hidden="true">
              <span className="qtuck-cta">Bir kart çek</span>
            </span>
            <span className="qdrawn-face qdrawn-front">
              <span className="qcard-label">Bugünün sorusu</span>
              <span className="qcard-q">“{prompts[ix]}”</span>
            </span>
          </div>
          <div className="qdrawn-actions">
            <button className="today-shuffle" onClick={draw}>
              ↻ başka kart çek
            </button>
            <button className="today-shuffle" onClick={() => setDrawn(false)} aria-label="Kartı geri koy">
              <CloseIcon size={14} /> geri koy
            </button>
          </div>
        </div>
      ) : (
        <div className="today-blank" aria-hidden="true" />
      )}
    </>
  );
}
