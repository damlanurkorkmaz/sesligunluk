"use client";

import { useEffect, useRef, useState } from "react";
import { BackIcon, LockIcon, PencilIcon } from "./Icons";
import { type Entry, deleteEntry, getEntry, saveEntry } from "@/lib/entries";
import { processRecording, type Step } from "@/lib/pipeline";
import { GunlukNative, type Mood } from "@/lib/native";
import { MOODS } from "@/lib/moods";
import { MONTHS, fromKey, formatClock, weekdayLong } from "@/lib/dates";
import { AudioPlayer } from "./AudioPlayer";

export interface Pending {
  fileName: string;
  durationSec: number;
  samples: number[];
}

const STEP_TEXT: Record<Step, string> = {
  transcribing: "Yazıya çevriliyor…",
  summarizing: "Özet çıkarılıyor…",
  saving: "Kaydediliyor…",
  done: "",
};

export function DetailScreen({ date, pending, onBack }: { date: string; pending: Pending | null; onBack: () => void }) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [step, setStep] = useState<Step | null>(pending ? "transcribing" : null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      if (pending) {
        const r = await processRecording(date, pending.fileName, pending.durationSec, pending.samples, setStep);
        setEntry(r.entry);
        setNotice(r.notice);
        if (!r.entry.transcript) {
          setDraft("");
          setEditing(true);
        }
      } else {
        setEntry(await getEntry(date));
      }
      setStep(null);
    })();
  }, [date, pending]);

  async function update(patch: Partial<Entry>) {
    if (!entry) return;
    setEntry(await saveEntry({ ...entry, ...patch }));
  }

  async function saveText() {
    await update({ transcript: draft.trim() });
    setEditing(false);
  }

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const old = await deleteEntry(date);
    if (old) await GunlukNative.deleteAudio({ fileName: old.fileName }).catch(() => undefined);
    onBack();
  }

  const d = fromKey(date);

  return (
    <main className="screen detail">
      {/* Deri kapak başlık: tarih ve geri */}
      <section className="today-cover detail-cover">
        <div className="detail-head">
          <button className="detail-back" onClick={onBack} aria-label="Geri" disabled={step !== null}>
            <BackIcon />
          </button>
          <div className="today-date">
            <span className="today-daynum" aria-hidden="true">{d.getDate()}</span>
            <div className="col" style={{ gap: 4, minWidth: 0 }}>
              <span className="today-month">
                {MONTHS[d.getMonth()]} · {weekdayLong(d)}
              </span>
              <span className="detail-sub">
                {d.getFullYear()}
                {entry ? ` · ${formatClock(entry.durationSec)} kayıt` : ""}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Sayfa */}
      <section className="today-sheet detail-sheet">
        <div className="paper" aria-hidden="true" />
        <div className="today-sheet-body detail-body">
          {step && (
            <div className="detail-status" role="status">
              <span className="spinner" />
              <span>{STEP_TEXT[step]}</span>
            </div>
          )}

          {notice && (
            <p className="notice" role="alert" style={{ margin: "0 0 14px" }}>
              {notice}
            </p>
          )}

          {entry && (
            <>
              <span className="today-eyebrow">GÜN NASILDI?{entry.aiGenerated && entry.mood ? " · otomatik seçildi" : ""}</span>
              <div className="detail-moods" role="radiogroup" aria-label="Ruh hali">
                {MOODS.map((m) => {
                  const on = entry.mood === m.id;
                  return (
                    <button key={m.id} role="radio" aria-checked={on} className={`detail-mood ${on ? "detail-mood--on" : ""}`} onClick={() => update({ mood: m.id as Mood })}>
                      <span className="seal" style={{ background: m.color }} />
                      {m.label}
                    </button>
                  );
                })}
              </div>

              <div className="detail-player">
                <AudioPlayer fileName={entry.fileName} durationSec={entry.durationSec} waveform={entry.waveform ?? []} />
              </div>

              <div className="row between" style={{ marginTop: 22, alignItems: "center" }}>
                <span className="today-eyebrow">SAYFA</span>
                {!editing && (
                  <button
                    className="detail-edit"
                    aria-label="Metni düzenle"
                    onClick={() => {
                      setDraft(entry.transcript);
                      setEditing(true);
                    }}
                  >
                    <PencilIcon size={16} />
                    Düzenle
                  </button>
                )}
              </div>

              {editing ? (
                <>
                  <label htmlFor="transcript" className="small muted" style={{ marginTop: 6 }}>
                    Bugünü kendi kelimelerinle yaz ya da düzelt
                  </label>
                  <textarea id="transcript" className="detail-textarea" value={draft} onChange={(e) => setDraft(e.target.value)} />
                  <button className="btn btn--primary" style={{ marginTop: 12 }} onClick={saveText}>
                    Kaydet
                  </button>
                </>
              ) : (
                <p className="detail-text">{entry.transcript || "Bu sayfada henüz yazı yok. Düzenle'ye dokunup kendin yazabilirsin."}</p>
              )}

              <div className="detail-foot">
                <span className="row small muted" style={{ gap: 6 }}>
                  <LockIcon size={14} />
                  Yazıya çevirme bu cihazda yapıldı
                </span>
                <button className="link-btn" onClick={remove} style={{ padding: "10px 0", color: confirmDelete ? "#9A3B2C" : "var(--muted)" }}>
                  {confirmDelete ? "Silmek için tekrar dokun" : "Sayfayı sil"}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
