"use client";

import { useEffect, useMemo, useState } from "react";
import { Share } from "@capacitor/share";
import { BackIcon } from "./Icons";
import type { Entry } from "@/lib/entries";
import { type Letter, computeInsights, ensureLetter, firstSentence } from "@/lib/letters";
import { MONTHS } from "@/lib/dates";
import { accusative, genitive } from "@/lib/turkish";

/** Ay bitince defterin yazdığı mektup ve ayın içgörüleri. Premium değilse mühürlü. */
export function MonthLetterScreen({
  month,
  entries,
  name,
  premium,
  onBack,
  onUnlock,
}: {
  month: string; // YYYY-AA
  entries: Entry[];
  name: string;
  premium: boolean;
  onBack: () => void;
  onUnlock: () => void;
}) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const ins = useMemo(() => computeInsights(entries, month), [entries, month]);
  const m = Number(month.slice(5, 7)) - 1;
  const monthName = MONTHS[m];
  const total = ins.moods.reduce((a, b) => a + b.n, 0);

  useEffect(() => {
    let alive = true;
    void ensureLetter(name, month, entries).then((l) => alive && setLetter(l));
    return () => {
      alive = false;
    };
  }, [name, month, entries]);

  const parts = letter ? firstSentence(letter.text) : null;

  async function share() {
    if (!letter) return;
    const top = ins.topics
      .slice(0, 3)
      .map((t) => t.tag)
      .join(", ");
    await Share.share({
      title: `${genitive(monthName)} mektubu`,
      text: `${letter.text}\n\n— Defterim\n${ins.count} sayfa${top ? ` · en çok: ${top}` : ""}\n\nGün Notu ile yazıldı.`,
    }).catch(() => undefined);
  }

  return (
    <main className="screen letter-screen">
      <section className="today-cover letter-head">
        <div className="row between">
          <button className="detail-back" onClick={onBack} aria-label="Geri">
            <BackIcon />
          </button>
          {premium && <span className="pw-badge pw-badge--sm">✦ PREMIUM</span>}
        </div>
        <span className="today-month" style={{ marginTop: 14, display: "block" }}>
          {monthName} defteri kapandı · {ins.count} sayfa
        </span>
        <h1 className="letter-title">{genitive(monthName)} mektubu</h1>
      </section>

      <section className="today-sheet letter-sheet">
        <div className="paper" aria-hidden="true" />
        <div className="today-sheet-body">
          {!letter ? (
            <div className="detail-status" role="status">
              <span className="spinner" />
              <span>Defterin {genitive(monthName)} sayfalarını okuyor…</span>
            </div>
          ) : (
            <div className="letter-text">
              {premium ? (
                <>
                  {letter.text.split("\n").map((l, i) => (
                    <p key={i}>{l}</p>
                  ))}
                  <p className="letter-sign">— Defterin</p>
                </>
              ) : (
                <>
                  {parts!.head.split("\n").map((l, i) => (
                    <p key={i}>{l}</p>
                  ))}
                  <p className="letter-blur" aria-hidden="true">
                    {parts!.rest || "Bu ay sana dair fark ettiklerimi yazdım; mührü açınca okuyabilirsin."}
                  </p>
                </>
              )}
            </div>
          )}

          <div className={premium ? "" : "letter-blur-block"} aria-hidden={!premium}>
            <span className="today-eyebrow" style={{ display: "block", marginTop: 22 }}>
              AYIN HALİ
            </span>
            <div className="moodstrip" style={{ height: 10, marginTop: 8 }}>
              {total === 0 ? <span style={{ flex: 1, background: "var(--line)" }} /> : ins.moods.filter((x) => x.n > 0).map((x) => <span key={x.id} style={{ flex: x.n, background: x.color }} />)}
            </div>
            <p className="small muted" style={{ margin: "6px 0 0" }}>
              {ins.topMood ? (
                <>
                  En sık: <b style={{ color: "var(--aubergine)" }}>{ins.topMood}</b>
                </>
              ) : (
                "Ruh hali mührü basılmamış"
              )}
              {ins.compare === "brighter" && " · önceki aydan daha aydınlık"}
              {ins.compare === "heavier" && " · önceki aydan biraz daha ağır"}
            </p>

            {ins.topics.length > 0 && (
              <>
                <span className="today-eyebrow" style={{ display: "block", marginTop: 18 }}>
                  EN ÇOK BAHSETTİKLERİN
                </span>
                <div className="letter-chips">
                  {ins.topics.map((t) => (
                    <span key={t.tag} className="letter-chip">
                      {t.tag} · {t.n}
                    </span>
                  ))}
                </div>
              </>
            )}

            <div className="row" style={{ gap: 8, marginTop: 16 }}>
              {ins.goodTopic && (
                <div className="letter-card">
                  <span className="today-eyebrow" style={{ fontSize: 9.5 }}>
                    İYİ GÜNLERİNDE
                  </span>
                  <span className="serif" style={{ fontSize: 15, marginTop: 4 }}>
                    {ins.goodTopic} hep vardı
                  </span>
                </div>
              )}
              <div className="letter-card">
                <span className="today-eyebrow" style={{ fontSize: 9.5 }}>
                  EN UZUN SERİ
                </span>
                <span className="serif" style={{ fontSize: 26, marginTop: 2 }}>
                  {ins.longestStreak} <small style={{ fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--muted)" }}>gün</small>
                </span>
              </div>
            </div>

            {premium && letter && (
              <button className="btn btn--ghost" style={{ marginTop: 16 }} onClick={share}>
                Mektubu paylaş
              </button>
            )}
          </div>
        </div>

        {!premium && letter && (
          <div className="letter-seal-card">
            <span className="letter-seal" aria-hidden="true">
              ✦
            </span>
            <strong className="serif" style={{ fontSize: 20 }}>
              Mektubun hazır
            </strong>
            <p className="small muted" style={{ margin: "6px 0 0", lineHeight: 1.45 }}>
              Defterin {accusative(monthName)} senin için okudu. Mührü açmak için Premium&apos;a geç.
            </p>
            <button className="btn btn--primary" style={{ marginTop: 14, height: 50 }} onClick={onUnlock}>
              Mührü aç
            </button>
            <span className="small muted" style={{ marginTop: 8 }}>
              Mektup sadece bu telefonda yazıldı.
            </span>
          </div>
        )}
      </section>
    </main>
  );
}
