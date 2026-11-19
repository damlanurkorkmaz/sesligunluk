"use client";

import { FlameIcon, MicIcon, NextIcon } from "./Icons";
import { TabBar, type Tab } from "./TabBar";
import { AudioPlayer } from "./AudioPlayer";
import { QuestionCard } from "./QuestionCard";
import { type Entry, currentStreak } from "@/lib/entries";
import { MONTHS, addDays, dayKey, greeting, shortWeekday, weekdayLong } from "@/lib/dates";
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

/** Kayıt butonunun üstündeki küçük, renkli ses dalgası (lavanta → mercan → adaçayı). */
const HINT_WAVE: [number, string][] = [
  [8, "#B9A8C9"], [14, "#BFA4BE"], [22, "#C79CA9"], [30, "#D1968F"], [22, "#D99182"],
  [16, "#C69C88"], [26, "#B3A188"], [12, "#A6A38A"], [8, "#9AA58C"],
];

export function TodayScreen({
  entries,
  name = "",
  onRecord,
  onOpen,
  onTab,
}: {
  entries: Entry[];
  name?: string;
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
  const hour = now.getHours();
  const streakAtRisk = !today && hour >= 21 && streak > 0;
  const firstName = name.trim().split(/\s+/)[0] ?? "";

  const weekNote = today
    ? "bugünkü sayfa tamam"
    : streakAtRisk
      ? `${streak} günlük serin bu gece bitmesin`
      : `bugünle seri ${streak + 1} olur`;

  return (
    <main className="screen today">
      {/* Üst yarı: defterin deri kapağı */}
      <section className={today ? "today-cover" : "today-cover today-cover--deck"}>
        <header className="today-head">
          <div className="today-date">
            <span className="today-daynum" aria-hidden="true">{now.getDate()}</span>
            <div className="col" style={{ gap: 4, minWidth: 0 }}>
              <span className="today-month">
                {MONTHS[now.getMonth()]} · {weekdayLong(now)}
              </span>
              <h1 className="today-greet">
                {greeting(now)}
                {firstName ? `, ${firstName}` : ""}
              </h1>
            </div>
          </div>
          <span className={`today-streak ${streak > 0 ? "today-streak--on" : ""}`} aria-label={`Seri: ${streak} gün`}>
            <FlameIcon size={18} color="#C9705F" />
            <span className="today-streak-num">{streak}</span>
            <span className="today-streak-unit">gün
              <br />
              seri</span>
          </span>
        </header>

        <div className="today-week" aria-label="Bu hafta">
          <div className="today-week-head">
            <span>BU HAFTA</span>
            <span className={streakAtRisk ? "today-week-note today-week-note--risk" : "today-week-note"}>{weekNote}</span>
          </div>
          <div className="today-days">
            {week.map((d) => {
              const key = dayKey(d);
              const e = byDate.get(key);
              const m = moodInfo(e?.mood);
              const isToday = key === todayKey;
              const label = `${shortWeekday(d)}: ${m ? m.label : e ? "kayıt var" : isToday ? "henüz kayıt yok" : "kayıt yok"}`;
              return (
                <button key={key} className={`today-day ${isToday ? "today-day--today" : ""}`} onClick={() => e && onOpen(key)} disabled={!e} aria-label={label}>
                  <span
                    className={`seal ${e ? "" : isToday ? "seal--today" : "seal--empty"}`}
                    style={e ? { background: m?.color ?? "var(--lilac)" } : undefined}
                  />
                  {shortWeekday(d)}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bugünün sayfası kapağın üstüne biner */}
      <section className={today ? "today-sheet" : "today-sheet today-sheet--grow"}>
        <div className="paper" aria-hidden="true" />
        {today ? (
          <div className="today-sheet-body">
            <span className="today-eyebrow">BUGÜNÜN SAYFASI</span>
            <button className="today-written" onClick={() => onOpen(todayKey)}>
              <span className="today-written-text">{excerpt(today.transcript, 220) || "Kaydın hazır. Metni eklemek için dokun."}</span>
            </button>
            <div className="today-sheet-foot">
              <AudioPlayer compact fileName={today.fileName} durationSec={today.durationSec} waveform={today.waveform ?? []} />
              <button className="today-open" onClick={() => onOpen(todayKey)}>
                Sayfayı aç <NextIcon />
              </button>
            </div>
          </div>
        ) : (
          <div className="today-sheet-body today-sheet-body--empty">
            <span className="today-eyebrow">
              BUGÜNÜN SAYFASI <span className="today-eyebrow-soft">· henüz boş</span>
            </span>
            <QuestionCard prompts={PROMPTS} start={now.getDate()} />
            <div className="today-rec">
              <div className="today-hint-wave" aria-hidden="true">
                {HINT_WAVE.map(([h, c], i) => (
                  <i key={i} style={{ height: h, background: c }} />
                ))}
              </div>
              <button className="today-rec-btn" onClick={onRecord} aria-label="Bugünü kaydet">
                <MicIcon />
              </button>
              <span className="today-rec-label">
                Bugünü anlat <span>· {MAX_RECORD_SECONDS} sn</span>
              </span>
            </div>
          </div>
        )}
      </section>

      {today ? (
        <div className="today-after">
          <span>Bugünlük bu kadar. Yarın akşam görüşürüz.</span>
          <button className="link-btn" onClick={onRecord}>
            Yeniden kaydet
          </button>
        </div>
      ) : null}

      <TabBar active="today" onChange={onTab} />
    </main>
  );
}

/** Metnin başından, kelime ortasında kesmeden kısa bir alıntı. */
function excerpt(text: string, max = 140): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 40 ? cut.lastIndexOf(" ") : max)}…`;
}

export { PROMPTS, excerpt };
