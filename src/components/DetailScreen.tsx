"use client";

import { useEffect, useRef, useState } from "react";
import { BackIcon, LockIcon, SparkIcon } from "./Icons";
import { type Entry, deleteEntry, getEntry, saveEntry } from "@/lib/entries";
import { processRecording, type Step } from "@/lib/pipeline";
import { GunlukNative, type Mood } from "@/lib/native";
import { MOODS } from "@/lib/moods";
import { fromKey, longDate, formatClock } from "@/lib/dates";

export interface Pending {
  fileName: string;
  durationSec: number;
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
        const r = await processRecording(date, pending.fileName, pending.durationSec, setStep);
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
    <main className="screen pad" style={{ gap: 18, paddingBottom: "calc(var(--safe-bottom) + 32px)" }}>
      <header className="row between">
        <button className="icon-btn" onClick={onBack} aria-label="Geri" disabled={step !== null}>
          <BackIcon />
        </button>
        <div className="col" style={{ alignItems: "center" }}>
          <strong style={{ fontSize: 17, fontWeight: 800 }}>{longDate(d).split(",")[0]}</strong>
          <span style={{ fontSize: 13 }} className="muted">
            {longDate(d).split(", ")[1]}
            {entry ? ` · ${formatClock(entry.durationSec)}` : ""}
          </span>
        </div>
        <span style={{ width: 44 }} />
      </header>

      {step && (
        <div className="card row" style={{ gap: 12 }} role="status">
          <span className="spinner" />
          <span style={{ fontWeight: 600 }}>{STEP_TEXT[step]}</span>
        </div>
      )}

      {notice && (
        <p className="notice" role="alert" style={{ margin: 0 }}>
          {notice}
        </p>
      )}

      {entry && (
        <>
          <section className="col" style={{ gap: 10 }} aria-label="Ruh hali">
            <span className="eyebrow">Bugün nasıldı?{entry.aiGenerated && entry.mood ? " · otomatik seçildi" : ""}</span>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }} role="radiogroup">
              {MOODS.map((m) => {
                const on = entry.mood === m.id;
                return (
                  <button
                    key={m.id}
                    role="radio"
                    aria-checked={on}
                    onClick={() => update({ mood: m.id as Mood })}
                    className="row"
                    style={{
                      gap: 8,
                      height: 40,
                      padding: "0 14px",
                      borderRadius: 999,
                      fontSize: 14,
                      fontWeight: 700,
                      background: on ? m.color : "var(--surface)",
                      color: on ? m.ink : "var(--ink)",
                      border: on ? `1.5px solid ${m.color}` : "1px solid var(--line)",
                    }}
                  >
                    {!on && <span className="mood-dot" style={{ width: 10, height: 10, background: m.color }} />}
                    {m.label}
                  </button>
                );
              })}
            </div>
            {entry.tags.length > 0 && (
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                {entry.tags.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </section>

          {entry.summary && (
            <section className="card card--lilac col" style={{ gap: 8, padding: 18 }}>
              <span className="row eyebrow" style={{ gap: 8, color: "var(--aubergine)" }}>
                <SparkIcon />
                Özet
              </span>
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, fontWeight: 600 }}>{entry.summary}</p>
            </section>
          )}

          <section className="col" style={{ gap: 10 }}>
            <div className="row between">
              <strong style={{ fontSize: 15, fontWeight: 800 }}>Metin</strong>
              {!editing && (
                <button
                  className="link-btn"
                  onClick={() => {
                    setDraft(entry.transcript);
                    setEditing(true);
                  }}
                >
                  Düzenle
                </button>
              )}
            </div>
            {editing ? (
              <>
                <label htmlFor="transcript" className="small muted">
                  Bugünü kendi kelimelerinle yaz ya da düzelt
                </label>
                <textarea id="transcript" className="textarea" value={draft} onChange={(e) => setDraft(e.target.value)} />
                <button className="btn btn--primary" onClick={saveText}>
                  Kaydet
                </button>
              </>
            ) : (
              <p className="body" style={{ margin: 0 }}>
                {entry.transcript || "Metin yok."}
              </p>
            )}
          </section>

          <div className="row small muted" style={{ gap: 8 }}>
            <LockIcon size={14} />
            Yazıya çevirme ve özet bu cihazda yapıldı
          </div>

          <button className="link-btn" onClick={remove} style={{ alignSelf: "flex-start", padding: "10px 0", color: confirmDelete ? "#9A3B2C" : "var(--muted)" }}>
            {confirmDelete ? "Silmek için tekrar dokun" : "Kaydı sil"}
          </button>
        </>
      )}
    </main>
  );
}
