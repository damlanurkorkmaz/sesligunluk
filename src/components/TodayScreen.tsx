"use client";

import { FlameIcon, MicIcon, NextIcon } from "./Icons";
import { TabBar, type Tab } from "./TabBar";
import { type Entry, currentStreak } from "@/lib/entries";
import { addDays, dayKey, greeting, longDate, shortWeekday } from "@/lib/dates";
import { moodInfo } from "@/lib/moods";
import { MAX_RECORD_SECONDS } from "@/app.config";

const PROMPTS = [
  "Bugün seni en çok ne şaşırttı?",
  "Bugün neye minnettarsın?",
  "Bugün seni ne yordu?",
  "Bugün kiminle güldün?",
  "Yarın neyi farklı yapmak isterdin?",
  "Bugünün en sessiz anı neydi?",
  "Bugün kendinle ilgili ne fark ettin?",
];

export function TodayScreen({
  entries,
  onRecord,
  onOpen,
  onTab,
}: {
  entries: Entry[];
  onRecord: () => void;
  onOpen: (date: string) => void;
  onTab: (t: Tab) => void;
}) {
  const now = new Date();
  const todayKey = dayKey(now);
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const today = byDate.get(todayKey) ?? null;
  const streak = currentStreak(entries, now);
  const week = Array.from({ length: 7 }, (_, i) => addDays(now, i - 6));
  const prompt = PROMPTS[now.getDate() % PROMPTS.length];

  return (
    <main className="screen">
      <header className="pad row between" style={{ alignItems: "flex-start" }}>
        <div className="col" style={{ gap: 4 }}>
          <span className="small muted" style={{ fontWeight: 600 }}>{longDate(now)}</span>
          <h1 className="title">{greeting(now)}</h1>
        </div>
        <span className="pill" aria-label={`Seri: ${streak} gün`}>
          <FlameIcon />
          {streak} gün
        </span>
      </header>

      <section className="card col" style={{ margin: "24px 24px 0", gap: 14 }} aria-label="Bu hafta">
        <div className="row between" style={{ alignItems: "baseline" }}>
          <strong style={{ fontSize: 15 }}>Bu hafta</strong>
          <span style={{ fontSize: 13 }} className="muted">
            {today ? "Bugünkü kayıt tamam" : `Bugünkü kayıtla seri ${streak + 1} olur`}
          </span>
        </div>
        <div className="week">
          {week.map((d) => {
            const key = dayKey(d);
            const e = byDate.get(key);
            const m = moodInfo(e?.mood);
            const isToday = key === todayKey;
            const label = `${shortWeekday(d)}: ${m ? m.label : e ? "kayıt var" : isToday ? "henüz kayıt yok" : "kayıt yok"}`;
            return (
              <button key={key} className={`week-day ${isToday ? "week-day--today" : ""}`} onClick={() => e && onOpen(key)} disabled={!e} aria-label={label} style={{ opacity: 1 }}>
                {e ? (
                  <span className="mood-dot" style={{ width: 34, height: 34, background: m?.color ?? "var(--lilac)" }} />
                ) : isToday ? (
                  <span className="today-ring" />
                ) : (
                  <span className="empty-ring" />
                )}
                {shortWeekday(d)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grow col" style={{ alignItems: "center", justifyContent: "center", gap: 18, padding: "24px 24px" }}>
        {today ? (
          <button className="card col" onClick={() => onOpen(todayKey)} style={{ width: "100%", gap: 10, textAlign: "left" }}>
            <span className="row between" style={{ width: "100%" }}>
              <span className="eyebrow">Bugünkü kaydın</span>
              <NextIcon />
            </span>
            <span style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5 }}>
              {today.summary || today.transcript.slice(0, 140) || "Kaydın hazır. Metni eklemek için dokun."}
            </span>
            {moodInfo(today.mood) && (
              <span className="row" style={{ gap: 8, fontSize: 14, fontWeight: 700 }}>
                <span className="mood-dot" style={{ width: 12, height: 12, background: moodInfo(today.mood)!.color }} />
                {moodInfo(today.mood)!.label}
              </span>
            )}
          </button>
        ) : (
          <>
            <div className="rec-halo">
              <button className="rec-btn" onClick={onRecord} aria-label="Bugünü kaydet">
                <MicIcon />
              </button>
            </div>
            <div className="col" style={{ alignItems: "center", gap: 4 }}>
              <strong style={{ fontSize: 20, fontWeight: 800 }}>Bugünü kaydet</strong>
              <span className="small muted">En fazla {MAX_RECORD_SECONDS} saniye</span>
            </div>
          </>
        )}
      </section>

      {today ? (
        <div className="pad" style={{ marginBottom: 20 }}>
          <button className="btn btn--ghost" onClick={onRecord}>
            Yeniden kaydet
          </button>
        </div>
      ) : (
        <aside className="card--lilac col" style={{ margin: "0 24px 20px", padding: "14px 16px", borderRadius: 16, gap: 2 }}>
          <span className="eyebrow">Aklına bir şey gelmezse</span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{prompt}</span>
        </aside>
      )}

      <TabBar active="today" onChange={onTab} />
    </main>
  );
}

export { PROMPTS };
