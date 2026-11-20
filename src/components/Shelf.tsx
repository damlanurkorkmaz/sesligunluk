"use client";

import { NotebookCover } from "./NotebookCover";
import type { Entry } from "@/lib/entries";
import { MOODS } from "@/lib/moods";
import { MONTHS } from "@/lib/dates";
import { genitive } from "@/lib/turkish";
import { type CoverLook, lookTint, roman, themeById } from "@/lib/themes";

export interface Volume {
  key: string; // YYYY-MM
  year: number;
  month: number; // 0-11
  entries: Entry[];
}

/** Kayıtları aylara böler; en yeni ay başta. Bu ay hiç kayıt yoksa bile bu ayın cildi vardır. */
export function groupVolumes(entries: Entry[], now = new Date()): Volume[] {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = e.date.slice(0, 7);
    map.set(k, [...(map.get(k) ?? []), e]);
  }
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (!map.has(thisKey)) map.set(thisKey, []);
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, list]) => ({
      key,
      year: Number(key.slice(0, 4)),
      month: Number(key.slice(5, 7)) - 1,
      entries: [...list].sort((a, b) => a.date.localeCompare(b.date)),
    }));
}

/** Ayın ruh hali dağılımı: renkli şerit parçaları. */
export function MoodStrip({ entries, vertical = false }: { entries: Entry[]; vertical?: boolean }) {
  const counts = MOODS.map((m) => ({ ...m, n: entries.filter((e) => e.mood === m.id).length })).filter((c) => c.n > 0);
  return (
    <span className={`moodstrip ${vertical ? "moodstrip--v" : ""}`} aria-hidden="true">
      {counts.length === 0 ? <span style={{ flex: 1, background: "rgba(245,239,232,.18)" }} /> : counts.map((c) => <span key={c.id} style={{ flex: c.n, background: c.color }} />)}
    </span>
  );
}

/** Cildin kapağında isim altı yazısı: ansiklopedide cilt numarası, diğerlerinde ay. */
export function volumeSub(look: CoverLook, v: { year: number; month: number }, index: number): string {
  if (look.theme === "ansiklopedi") return `Cilt ${roman(index)}`;
  if (look.theme === "artdeco") return roman(v.year);
  return `${MONTHS[v.month]} ${v.year}`;
}

export function Shelf({
  volumes,
  onOpen,
  lookOf,
  letterReady,
  onLetter,
}: {
  volumes: Volume[];
  onOpen: (key: string) => void;
  lookOf: (v: Volume) => CoverLook;
  letterReady?: Volume | null;
  onLetter?: (key: string) => void;
}) {
  const [current, ...past] = volumes;
  const curLook = lookOf(current);
  const totalPages = volumes.reduce((a, v) => a + v.entries.length, 0);

  return (
    <div className="shelf">
      <section className="shelf-hero">
        <button className="shelf-hero-book" onClick={() => onOpen(current.key)} aria-label={`${MONTHS[current.month]} ${current.year} defterini aç`}>
          <NotebookCover title={`${MONTHS[current.month]} ${current.year}`} width={190} height={254} look={curLook} sub={volumeSub(curLook, current, volumes.length)} />
        </button>
        <div className="shelf-hero-info">
          <div className="col" style={{ gap: 4, minWidth: 0, flex: 1 }}>
            <span className="today-eyebrow">BU AYIN DEFTERİ · {current.entries.length} sayfa</span>
            <MoodStrip entries={current.entries} />
          </div>
          <button className="btn btn--ghost shelf-open" onClick={() => onOpen(current.key)}>
            Defteri aç
          </button>
        </div>
      </section>

      {letterReady && onLetter && (
        <button className="shelf-letter" onClick={() => onLetter(letterReady.key)}>
          <span className="shelf-letter-seal" aria-hidden="true">
            ✦
          </span>
          <span className="col" style={{ gap: 2, minWidth: 0, textAlign: "left" }}>
            <strong>{genitive(MONTHS[letterReady.month])} mektubu hazır</strong>
            <span className="small muted">Defterin o ayı senin için okudu.</span>
          </span>
          <span aria-hidden="true" style={{ marginLeft: "auto", color: "var(--muted)" }}>
            ›
          </span>
        </button>
      )}

      <section className="shelf-rack" aria-label="Geçmiş defterler">
        <div className="shelf-rack-head">
          <span className="shelf-rack-title">Rafın</span>
          <span className="small muted">
            {volumes.length} cilt · {totalPages} sayfa
          </span>
        </div>
        <div className="shelf-row">
          {past.length === 0 ? (
            <>
              <span className="spine spine--ghost" aria-hidden="true" />
              <span className="spine spine--ghost" aria-hidden="true" />
              <p className="shelf-empty">Ay bitince bu defter lastiğiyle kapanıp rafa kalkar, yenisi başlar.</p>
            </>
          ) : (
            past.map((v, i) => {
              const look = lookOf(v);
              return (
                <button
                  key={v.key}
                  className={`spine leather spine--${themeById(look.theme).id}`}
                  style={{ "--lt": lookTint(look) } as React.CSSProperties}
                  onClick={() => onOpen(v.key)}
                  aria-label={`${MONTHS[v.month]} ${v.year} defteri, ${v.entries.length} sayfa`}
                >
                  <MoodStrip entries={v.entries} vertical />
                  <span className="spine-title">{look.theme === "ansiklopedi" ? `${roman(volumes.length - 1 - i)} · ${MONTHS[v.month]}` : MONTHS[v.month]}</span>
                  <span className="spine-year">{String(v.year).slice(2)}</span>
                </button>
              );
            })
          )}
        </div>
        <div className="shelf-plank" aria-hidden="true" />
      </section>
    </div>
  );
}
