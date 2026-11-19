"use client";

import { useState } from "react";
import { BackIcon, NextIcon } from "./Icons";
import { TabBar, type Tab } from "./TabBar";
import type { Entry } from "@/lib/entries";
import { MOODS, moodInfo } from "@/lib/moods";
import { MONTHS, WEEKDAYS_SHORT, dayKey } from "@/lib/dates";

export function CalendarScreen({ entries, onOpen, onTab }: { entries: Entry[]; onOpen: (date: string) => void; onTab: (t: Tab) => void }) {
  const now = new Date();
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const todayKey = dayKey(now);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7; // Pazartesi başlangıç
  const monthCount = entries.filter((e) => e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length;
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <main className="screen">
      <header className="pad">
        <h1 className="title">Takvim</h1>
      </header>

      <section className="card col" style={{ margin: "20px 24px 0", gap: 14 }}>
        <div className="row between">
          <button className="icon-btn" style={{ border: 0 }} onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Önceki ay">
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
          <button className="icon-btn" style={{ border: 0 }} onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Sonraki ay" disabled={isCurrentMonth}>
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
            return (
              <div key={key} className="cal-cell">
                <button
                  className="cal-day"
                  style={{ ...style, opacity: 1 }}
                  disabled={!e}
                  onClick={() => e && onOpen(key)}
                  aria-label={`${day} ${MONTHS[month]}: ${m ? m.label : e ? "kayıt var" : "kayıt yok"}`}
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
      </section>

      <div className="grow" />
      <TabBar active="calendar" onChange={onTab} />
    </main>
  );
}
