"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TabBar, type Tab } from "./TabBar";
import { BackIcon, ChevronDownIcon, CloseIcon, NextIcon, PencilIcon } from "./Icons";
import { MonthGrid } from "./MonthGrid";
import { AudioPlayer } from "./AudioPlayer";
import type { Entry } from "@/lib/entries";
import { moodInfo } from "@/lib/moods";
import { MONTHS, dayKey, fromKey, shortWeekday } from "@/lib/dates";

/** Mühür mürekkebi: ruh hali renginin kâğıtta okunur (4.5:1) koyu tonu. */
export const STAMP_INK: Record<string, string> = {
  harika: "#5E6C50",
  iyi: "#5F6B54",
  normal: "#6F6253",
  yorgun: "#6E5A84",
  zor: "#6B4E6E",
};

const WEEKDAYS_LONG = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const TURN_MS = 420;
const MAX_ANGLE = 100; // sayfa omurgadan bu kadar döner, sonra görünmez olur

type Mode = { dir: "next" | "prev"; target: "start" | "commit" | "cancel" } | null;

function daysBetween(a: string, b: string) {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
}

/** Tek bir defter sayfası. */
function Page({ entry, prev, pageNo }: { entry: Entry; prev: Entry | null; pageNo: number }) {
  const d = fromKey(entry.date);
  const m = moodInfo(entry.mood);
  const gap = prev ? daysBetween(prev.date, entry.date) : 0;
  const paragraphs = (entry.transcript || "").split(/\n+/).filter(Boolean);

  return (
    <article className="paper" aria-label={`${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} sayfası`}>
      <div className="paper-scroll">
        <header className="paper-head">
          <div className="col" style={{ gap: 0 }}>
            {gap > 1 && <span className="paper-gap">{gap} gün sonra…</span>}
            <h2 className="paper-date">
              {d.getDate()} {MONTHS[d.getMonth()]}
            </h2>
            <span className="paper-weekday">
              {WEEKDAYS_LONG[d.getDay()]}, {d.getFullYear()}
            </span>
          </div>
          {m && (
            <span className="mood-stamp" style={{ color: STAMP_INK[m.id] }}>
              {m.label}
            </span>
          )}
        </header>

        {entry.tags.length > 0 && <div className="paper-tags">{entry.tags.map((t) => `#${t.replace(/\s+/g, "")}`).join("  ")}</div>}

        <div className="paper-text">
          {paragraphs.length > 0 ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p className="muted">Bu sayfada henüz yazı yok.</p>}
        </div>

        <footer className="paper-foot">
          <AudioPlayer compact fileName={entry.fileName} durationSec={entry.durationSec} waveform={entry.waveform ?? []} />
          <span className="paper-pageno">{pageNo}</span>
        </footer>
      </div>
    </article>
  );
}

const SPIRAL_RINGS = 14;

export function JournalScreen({
  entries,
  initialDate,
  onEdit,
  onRecord,
  onTab,
}: {
  entries: Entry[];
  initialDate?: string;
  onEdit: (date: string) => void;
  onRecord: () => void;
  onTab: (t: Tab) => void;
}) {
  // Defter eskiden yeniye dizilir; açılışta son sayfa (en yeni) görünür.
  const pages = useMemo(() => [...entries].sort((a, b) => a.date.localeCompare(b.date)), [entries]);
  const [idx, setIdx] = useState(() => {
    const i = initialDate ? pages.findIndex((p) => p.date === initialDate) : -1;
    return i >= 0 ? i : Math.max(0, pages.length - 1);
  });
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [sheet, setSheet] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const d = pages[idx] ? fromKey(pages[idx].date) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const stage = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; axis: "x" | "y" | null; id: number } | null>(null);
  const reduceMotion = useRef(false);
  const [w, setW] = useState(360);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 360));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    reduceMotion.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  const current = pages[idx] ?? null;

  // Tarih şeridinde seçili günü ortala.
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>("[aria-current='date']")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [idx]);

  function goTo(i: number) {
    if (i < 0 || i >= pages.length || i === idx || mode) return;
    if (Math.abs(i - idx) > 1 || reduceMotion.current) {
      setIdx(i); // uzak atlamada çevirme animasyonu yok
      return;
    }
    setDx(0);
    const dir = i > idx ? "next" : "prev";
    // Önce sayfayı başlangıç açısında yerleştir, sonraki karede döndür (yoksa geçiş oynamaz).
    setMode({ dir, target: "start" });
    requestAnimationFrame(() => requestAnimationFrame(() => setMode({ dir, target: "commit" })));
  }

  // ---- sürükleme ----
  function onPointerDown(e: React.PointerEvent) {
    if (mode) return;
    gesture.current = { x: e.clientX, y: e.clientY, axis: null, id: e.pointerId };
  }
  function onPointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const mx = e.clientX - g.x;
    const my = e.clientY - g.y;
    if (!g.axis) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      g.axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
      if (g.axis === "x") {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setDragging(true);
      }
    }
    if (g.axis !== "x") return;
    const canNext = idx < pages.length - 1;
    const canPrev = idx > 0;
    // Gidilecek sayfa yoksa hafif direnç.
    const v = (mx < 0 && !canNext) || (mx > 0 && !canPrev) ? mx * 0.15 : mx;
    setDx(v);
  }
  function onPointerUp() {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.axis !== "x") return;
    setDragging(false);
    const dir = dx < 0 ? "next" : "prev";
    const possible = dir === "next" ? idx < pages.length - 1 : idx > 0;
    if (!possible || dx === 0) {
      setDx(0);
      return;
    }
    if (reduceMotion.current && Math.abs(dx) > w * 0.2) {
      setDx(0);
      setIdx(idx + (dir === "next" ? 1 : -1));
      return;
    }
    setMode({ dir, target: Math.abs(dx) > w * 0.22 ? "commit" : "cancel" });
  }

  // Dönüş bitince sayfayı değiştir. transitionend'e güvenmiyoruz: açı değişmediyse hiç tetiklenmez.
  useEffect(() => {
    if (!mode || mode.target === "start") return;
    const t = setTimeout(() => {
      if (mode.target === "commit") setIdx((i) => i + (mode.dir === "next" ? 1 : -1));
      setMode(null);
      setDx(0);
    }, TURN_MS + 40);
    return () => clearTimeout(t);
  }, [mode]);

  // ---- katmanlar ----
  const dir: "next" | "prev" | null = mode?.dir ?? (dx < 0 && idx < pages.length - 1 ? "next" : dx > 0 && idx > 0 ? "prev" : null);
  let underIndex = idx;
  let topIndex = idx;
  let angle = 0;
  if (dir === "next") {
    underIndex = idx + 1;
    topIndex = idx;
    angle = mode ? (mode.target === "commit" ? -MAX_ANGLE : 0) : Math.max(-MAX_ANGLE, (dx / w) * 120);
  } else if (dir === "prev") {
    underIndex = idx;
    topIndex = idx - 1;
    angle = mode ? (mode.target === "commit" ? 0 : -MAX_ANGLE) : -MAX_ANGLE + Math.min(MAX_ANGLE, (dx / w) * 120);
  }
  const resist = dir === null ? dx : 0;
  const turning = dir !== null;
  const shade = turning ? Math.min(0.35, (Math.abs(angle) / MAX_ANGLE) * 0.35) : 0;

  // ---- tarih şeridi: seçili sayfanın ayındaki günler ----
  const stripMonth = current ? fromKey(current.date) : new Date();
  const sy = stripMonth.getFullYear();
  const sm = stripMonth.getMonth();
  const todayKey = dayKey();
  const byDate = new Map(pages.map((p, i) => [p.date, i]));
  const stripDays = Array.from({ length: new Date(sy, sm + 1, 0).getDate() }, (_, i) => new Date(sy, sm, i + 1)).filter((d) => dayKey(d) <= todayKey);

  if (pages.length === 0) {
    return (
      <main className="screen">
        <header className="pad">
          <h1 className="title">Günlüğüm</h1>
        </header>
        <div className="grow col pad" style={{ alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center" }}>
          <div className="paper" style={{ position: "relative", width: 220, height: 260, transform: "rotate(-3deg)" }} aria-hidden="true" />
          <strong style={{ fontSize: 20, fontWeight: 800 }}>Defterin seni bekliyor</strong>
          <span className="muted" style={{ maxWidth: 280 }}>
            İlk kaydını yaptığında burada bir defter sayfası olarak görünecek.
          </span>
          <button className="btn btn--primary" style={{ maxWidth: 260 }} onClick={onRecord}>
            İlk kaydını yap
          </button>
        </div>
        <TabBar active="journal" onChange={onTab} />
      </main>
    );
  }

  return (
    <main className="screen" style={{ height: "100dvh", overflow: "hidden" }}>
      <header className="pad row between">
        <h1 className="title">Günlüğüm</h1>
        <span className="row" style={{ gap: 8 }}>
          <button className="icon-btn" onClick={() => current && onEdit(current.date)} aria-label="Bu sayfayı düzenle" disabled={!!mode}>
            <PencilIcon />
          </button>
          <button
          className="pill"
          style={{ fontSize: 14 }}
          onClick={() => {
            setCursor(new Date(sy, sm, 1));
            setSheet(true);
          }}
          aria-haspopup="dialog"
        >
          {MONTHS[sm]} {sy}
          <ChevronDownIcon />
          </button>
        </span>
      </header>

      <nav className="date-strip" ref={strip} aria-label="Gün seç">
        {stripDays.map((d) => {
          const key = dayKey(d);
          const i = byDate.get(key);
          const e = i !== undefined ? pages[i] : null;
          const m = moodInfo(e?.mood);
          const sel = i === idx;
          return (
            <button
              key={key}
              className={`date-chip ${sel ? "date-chip--on" : ""}`}
              disabled={i === undefined}
              onClick={() => i !== undefined && goTo(i)}
              aria-current={sel ? "date" : undefined}
              aria-label={`${d.getDate()} ${MONTHS[sm]}${e ? "" : ", kayıt yok"}`}
            >
              <span className="date-chip-wd">{shortWeekday(d)}</span>
              <span className="date-chip-d">{d.getDate()}</span>
              <span className="mood-dot" style={{ width: 6, height: 6, background: e ? m?.color ?? "var(--lilac)" : "transparent" }} />
            </button>
          );
        })}
      </nav>

      <div
        ref={stage}
        className="book"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="book-cover" aria-hidden="true" />
        <div className="book-edges" aria-hidden="true" />
        <span className="book-ribbon" aria-hidden="true" />
        {/* Alttaki sayfa */}
        <div className="book-page" style={{ transform: `translateX(${resist}px)`, transition: dragging ? "none" : "transform 300ms ease" }}>
          <Page entry={pages[underIndex]} prev={pages[underIndex - 1] ?? null} pageNo={underIndex + 1} />
        </div>

        {/* Dönen sayfa */}
        {turning && pages[topIndex] && (
          <div
            className="book-page book-page--turning"
            style={{
              transform: `perspective(2400px) rotateY(${angle}deg)`,
              transition: (dragging && !mode) || mode?.target === "start" ? "none" : `transform ${TURN_MS}ms cubic-bezier(.2,.7,.2,1)`,
            }}
          >
            <Page entry={pages[topIndex]} prev={pages[topIndex - 1] ?? null} pageNo={topIndex + 1} />
            <div className="book-shade" style={{ opacity: shade }} aria-hidden="true" />
          </div>
        )}

        {/* Spiral teller sayfaların üstünde durur; sayfa bunların etrafında döner */}
        <div className="spiral" aria-hidden="true">
          {Array.from({ length: SPIRAL_RINGS }, (_, i) => (
            <span key={i} className="spiral-ring" />
          ))}
        </div>
      </div>

      <div className="pad row between" style={{ padding: "10px 24px 12px" }}>
        <button className="icon-btn" onClick={() => goTo(idx - 1)} disabled={idx === 0} aria-label="Önceki sayfa">
          <BackIcon />
        </button>
        <span className="small muted" style={{ fontWeight: 600 }} aria-live="polite">
          {idx + 1} / {pages.length}
        </span>
        <button className="icon-btn" onClick={() => goTo(idx + 1)} disabled={idx === pages.length - 1} aria-label="Sonraki sayfa">
          <NextIcon />
        </button>
      </div>

      <TabBar active="journal" onChange={onTab} />

      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Tarih seç" onClick={(e) => e.stopPropagation()}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 17, fontWeight: 800 }}>Tarihe git</strong>
              <button className="icon-btn" onClick={() => setSheet(false)} aria-label="Kapat">
                <CloseIcon />
              </button>
            </div>
            <MonthGrid
              entries={entries}
              cursor={cursor}
              onCursor={setCursor}
              selected={current?.date}
              onPick={(date) => {
                const i = byDate.get(date);
                if (i !== undefined) setIdx(i);
                setSheet(false);
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
