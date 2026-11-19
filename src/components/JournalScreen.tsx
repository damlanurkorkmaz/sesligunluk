"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TabBar, type Tab } from "./TabBar";
import { BackIcon, CalendarIcon, CloseIcon, MicIcon, NextIcon, PencilIcon } from "./Icons";
import { MonthGrid } from "./MonthGrid";
import { AudioPlayer } from "./AudioPlayer";
import { LeatherFace, NotebookCover } from "./NotebookCover";
import { MoodStrip, Shelf, groupVolumes } from "./Shelf";
import { journalTitle } from "@/lib/turkish";
import type { Entry } from "@/lib/entries";
import { moodInfo } from "@/lib/moods";
import { MONTHS, dayKey, fromKey, shortWeekday } from "@/lib/dates";
import { MAX_RECORD_SECONDS } from "@/app.config";

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

/** Kapağın iç yüzü: ex-libris etiketi gibi defterin künyesi. */
function CoverInside({ name, year, month, entries }: { name: string; year: number; month: number; entries: Entry[] }) {
  const first = entries[0] ? fromKey(entries[0].date) : null;
  return (
    <article className="paper paper--endpaper" aria-label="Defterin kapağının iç yüzü">
      <div className="exlibris">
        <span className="exlibris-kicker">Bu defter</span>
        <strong className="exlibris-name">{journalTitle(name)}</strong>
        <span className="exlibris-rule" aria-hidden="true" />
        <span className="exlibris-month">
          {MONTHS[month]} {year}
        </span>
        <span className="exlibris-meta">
          {first ? `${first.getDate()} ${MONTHS[first.getMonth()]}'da başladı · ${entries.length} sayfa` : "Henüz boş"}
        </span>
        <MoodStrip entries={entries} />
      </div>
      <span className="endpaper-hint" aria-hidden="true">
        sayfaları çevir →
      </span>
    </article>
  );
}

/** Bugünün henüz yazılmamış sayfası (yalnızca bu ayın defterinin sonunda). */
function TodayBlank({ onRecord }: { onRecord: () => void }) {
  const d = new Date();
  return (
    <article className="paper" aria-label="Bugünün boş sayfası">
      <div className="paper-scroll today-blank-page">
        <header className="paper-head">
          <div className="col" style={{ gap: 0 }}>
            <h2 className="paper-date">
              {d.getDate()} {MONTHS[d.getMonth()]}
            </h2>
            <span className="paper-weekday">
              {WEEKDAYS_LONG[d.getDay()]}, {d.getFullYear()}
            </span>
          </div>
        </header>
        <div className="today-blank-lines" aria-hidden="true" />
        <div className="today-blank-cta">
          <span className="paper-weekday">Bu sayfa henüz boş.</span>
          <button className="today-rec-btn" style={{ width: 64, height: 64 }} onClick={onRecord} aria-label="Bugünü kaydet">
            <MicIcon size={30} />
          </button>
          <span className="today-rec-label" style={{ marginTop: 0 }}>
            Bugünü anlat <span>· {MAX_RECORD_SECONDS} sn</span>
          </span>
        </div>
      </div>
    </article>
  );
}

const SPIRAL_RINGS = 14;

type Item = { kind: "cover" } | { kind: "entry"; entry: Entry; n: number } | { kind: "today" };

export function JournalScreen({
  entries,
  name = "",
  initialDate,
  onEdit,
  onRecord,
  onTab,
}: {
  entries: Entry[];
  name?: string;
  initialDate?: string;
  onEdit: (date: string) => void;
  onRecord: () => void;
  onTab: (t: Tab) => void;
}) {
  const volumes = useMemo(() => groupVolumes(entries), [entries]);
  // Sekmeden gelince raf; bir sayfadan geri dönünce doğrudan o ayın defteri.
  const [volumeKey, setVolumeKey] = useState<string | null>(initialDate ? initialDate.slice(0, 7) : null);
  const [openedFromShelf, setOpenedFromShelf] = useState(false);

  if (entries.length === 0) {
    return (
      <main className="screen">
        <header className="pad">
          <h1 className="title">Günlüğüm</h1>
        </header>
        <div className="grow col pad" style={{ alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center" }}>
          <div className="journal-empty-book" aria-hidden="true">
            <NotebookCover title={journalTitle(name)} width={200} height={268} />
          </div>
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

  const volume = volumeKey ? volumes.find((v) => v.key === volumeKey) : null;

  if (!volume) {
    return (
      <main className="screen">
        <header className="pad">
          <h1 className="title">Günlüğüm</h1>
        </header>
        <Shelf
          volumes={volumes}
          onOpen={(k) => {
            setOpenedFromShelf(true);
            setVolumeKey(k);
          }}
        />
        <TabBar active="journal" onChange={onTab} />
      </main>
    );
  }

  return (
    <VolumeView
      key={volume.key}
      volume={volume}
      allEntries={entries}
      name={name}
      initialDate={initialDate}
      animateOpen={openedFromShelf}
      onShelf={() => setVolumeKey(null)}
      onJump={(date) => {
        setOpenedFromShelf(false);
        setVolumeKey(date.slice(0, 7));
      }}
      onEdit={onEdit}
      onRecord={onRecord}
      onTab={onTab}
    />
  );
}

function VolumeView({
  volume,
  allEntries,
  name,
  initialDate,
  animateOpen,
  onShelf,
  onJump,
  onEdit,
  onRecord,
  onTab,
}: {
  volume: ReturnType<typeof groupVolumes>[number];
  allEntries: Entry[];
  name: string;
  initialDate?: string;
  animateOpen: boolean;
  onShelf: () => void;
  onJump: (date: string) => void;
  onEdit: (date: string) => void;
  onRecord: () => void;
  onTab: (t: Tab) => void;
}) {
  const todayKey = dayKey();
  const isCurrent = todayKey.startsWith(volume.key);
  // Defter: kapağın iç yüzü, eskiden yeniye sayfalar, bu aysa sonunda bugünün boş sayfası.
  const pages = useMemo<Item[]>(() => {
    const list: Item[] = [{ kind: "cover" }, ...volume.entries.map((entry, i) => ({ kind: "entry" as const, entry, n: i + 1 }))];
    if (isCurrent && !volume.entries.some((e) => e.date === todayKey)) list.push({ kind: "today" });
    return list;
  }, [volume, isCurrent, todayKey]);
  const entryAt = (i: number) => {
    const it = pages[i];
    return it && it.kind === "entry" ? it.entry : null;
  };
  const [idx, setIdx] = useState(() => {
    const i = initialDate ? pages.findIndex((p) => p.kind === "entry" && p.entry.date === initialDate) : -1;
    if (i >= 0) return i;
    // Açılışta en yeni yazılı sayfa (yoksa kapak)
    let last = 0;
    pages.forEach((p, j) => p.kind === "entry" && (last = j));
    return last;
  });
  const [opening, setOpening] = useState(animateOpen);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [sheet, setSheet] = useState(false);
  const [cursor, setCursor] = useState(() => new Date(volume.year, volume.month, 1));

  useEffect(() => {
    if (!opening) return;
    const t = setTimeout(() => setOpening(false), 1300);
    return () => clearTimeout(t);
  }, [opening]);

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

  const current = entryAt(idx);

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
  const sy = volume.year;
  const sm = volume.month;
  const byDate = new Map<string, number>();
  pages.forEach((p, i) => p.kind === "entry" && byDate.set(p.entry.date, i));
  const stripDays = Array.from({ length: new Date(sy, sm + 1, 0).getDate() }, (_, i) => new Date(sy, sm, i + 1)).filter((d) => dayKey(d) <= todayKey);

  function renderItem(i: number) {
    const it = pages[i];
    if (!it) return null;
    if (it.kind === "cover") return <CoverInside name={name} year={sy} month={sm} entries={volume.entries} />;
    if (it.kind === "today") return <TodayBlank onRecord={onRecord} />;
    const prev = i > 0 ? entryAt(i - 1) : null;
    return <Page entry={it.entry} prev={prev} pageNo={it.n} />;
  }

  const it = pages[idx];
  const pageLabel = !it ? "" : it.kind === "cover" ? "Kapak" : it.kind === "today" ? "Bugün" : `${it.n} / ${volume.entries.length}`;

  return (
    <main className="screen" style={{ height: "100dvh", overflow: "hidden" }}>
      <header className="pad row between vol-head">
        <span className="row" style={{ gap: 6, minWidth: 0 }}>
          <button className="icon-btn" onClick={onShelf} aria-label="Rafa dön" disabled={!!mode}>
            <BackIcon />
          </button>
          <h1 className="title vol-title">
            {MONTHS[sm]} <span>{sy}</span>
          </h1>
        </span>
        <span className="row" style={{ gap: 8 }}>
          <button className="icon-btn" onClick={() => current && onEdit(current.date)} aria-label="Bu sayfayı düzenle" disabled={!!mode || !current}>
            <PencilIcon />
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              setCursor(new Date(sy, sm, 1));
              setSheet(true);
            }}
            aria-haspopup="dialog"
            aria-label="Tarihe git"
          >
            <CalendarIcon />
          </button>
        </span>
      </header>

      <nav className="date-strip" ref={strip} aria-label="Gün seç">
        {stripDays.map((d) => {
          const key = dayKey(d);
          const i = byDate.get(key);
          const e = i !== undefined ? entryAt(i) : null;
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
          {renderItem(underIndex)}
        </div>

        {/* Dönen sayfa */}
        {turning && pages[topIndex] !== undefined && (
          <div
            className="book-page book-page--turning"
            style={{
              transform: `perspective(2400px) rotateY(${angle}deg)`,
              transition: (dragging && !mode) || mode?.target === "start" ? "none" : `transform ${TURN_MS}ms cubic-bezier(.2,.7,.2,1)`,
            }}
          >
            {renderItem(topIndex)}
            <div className="book-shade" style={{ opacity: shade }} aria-hidden="true" />
          </div>
        )}

        {/* Raftan açılınca kapak omurgadan dönerek açılır */}
        {opening && (
          <div className="vol-opener" aria-hidden="true">
            <LeatherFace title={`${MONTHS[sm]} ${sy}`} scale={1.1} />
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
          {pageLabel}
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
              entries={allEntries}
              cursor={cursor}
              onCursor={setCursor}
              selected={current?.date}
              onPick={(date) => {
                setSheet(false);
                const i = byDate.get(date);
                if (i !== undefined) setIdx(i);
                else onJump(date); // başka ayın defteri
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
