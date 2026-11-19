"use client";

import { BackIcon, NextIcon } from "./Icons";
import type { Entry } from "@/lib/entries";
import { MOODS, moodInfo } from "@/lib/moods";
import { MONTHS, WEEKDAYS_SHORT, dayKey } from "@/lib/dates";

/** Ay takvimi: kayıtlı günler ruh hali renginde; yalnızca kayıtlı günlere dokunulabilir. */
export function MonthGrid({
  entries,
  cursor,
  onCursor,
  onPick,
  selected,
}: {
  entries: Entry[];
  cursor: Date; // ayın 1'i
  onCursor: (d: Date) => void;
  onPick: (date: string) => void;
  selected?: string;
}) {
  const now = new Date();
  const todayKey = dayKey(now);
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7; // Pazartesi başlangıç
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthCount = entries.filter((e) => e.date.startsWith(prefix)).length;
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row between">
        <button className="icon-btn" style={{ border: 0 }} onClick={() => onCursor(new Date(year, month - 1, 1))} aria-label="Önceki ay">
          <BackIcon />
        </button>
        <div className="col" style={{ alignItems: "center" }}>
          <strong style={{ fontSize: 17, fontWeight: 800 }}>
            {MONTHS[month]} {year}
          </strong>
          <span style={{ fontSize: 13 }} className="muted">
            {monthCount} kayıt
          </span>
        </div>
        <button className="icon-btn" style={{ border: 0 }} onClick={() => onCursor(new Date(year, month + 1, 1))} aria-label="Sonraki ay" disabled={isCurrentMonth}>
          <NextIcon />
        </button>
      </div>

      <div className="cal">
        {WEEKDAYS_SHORT.map((w) => (
          <div key={w} className="cal-head">
            {w}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`b${i}`} className="cal-cell" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const key = dayKey(new Date(year, month, day));
          const e = byDate.get(key);
          const m = moodInfo(e?.mood);
          const isToday = key === todayKey;
          const future = key > todayKey;
          const style: React.CSSProperties = e
            ? { background: m?.color ?? "var(--lilac)", color: m?.ink ?? "var(--ink)", fontWeight: 700 }
            : isToday
              ? { border: "2px dashed var(--coral)", color: "var(--aubergine)", fontWeight: 800 }
              : future
                ? { color: "#7A6C7B", fontWeight: 500 }
                : { border: "1.5px solid var(--line-strong)", color: "var(--muted)" };
          if (selected === key) style.boxShadow = "0 0 0 2px var(--paper), 0 0 0 4px var(--aubergine)";
          return (
            <div key={key} className="cal-cell">
              <button
                className="cal-day"
                style={{ ...style, opacity: 1 }}
                disabled={!e}
                onClick={() => e && onPick(key)}
                aria-label={`${day} ${MONTHS[month]}: ${m ? m.label : e ? "kayıt var" : "kayıt yok"}`}
                aria-current={selected === key ? "date" : undefined}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>

      <div className="row" style={{ flexWrap: "wrap", gap: "6px 14px", borderTop: "1px solid var(--line)", paddingTop: 8 }}>
        {MOODS.map((m) => (
          <span key={m.id} className="row" style={{ gap: 6, fontSize: 13, fontWeight: 600 }}>
            <span className="mood-dot" style={{ width: 10, height: 10, background: m.color }} />
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
