"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CoverScene } from "./NotebookCover";
import { BackIcon, LockIcon, MicIcon, PencilIcon } from "./Icons";
import { GunlukNative } from "@/lib/native";
import { scheduleDailyReminder } from "@/lib/reminder";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import { journalTitle } from "@/lib/turkish";
import { MONTHS } from "@/lib/dates";

type Step = "cover" | "opening" | "name" | "reminder" | "privacy";
const STEP_INDEX: Partial<Record<Step, number>> = { name: 0, reminder: 1, privacy: 2 };
const OPEN_MS = 900; // kapak 90°'yi geçip görünmez olduğu an sayfa yakınlaşmaya başlar
const ZOOM_MS = 950; // açılan defter, isim sayfasının yerine yavaşça yaklaşıp oturur

const PhoneIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="7" y="2.5" width="10" height="19" rx="2" />
    <path d="M11 18h2" />
  </svg>
);
const FaceIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <path d="M9 9v1M15 9v1M9 15c1.5 1.2 4.5 1.2 6 0" />
  </svg>
);

/** Giriş adımlarında kullanılan açık defter sayfası (Günlüğüm ile aynı görünüm). */
function OpenPage({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <div className="book open-page" style={{ height, margin: 0, flex: "none", touchAction: "auto" }}>
      <div className="book-cover" aria-hidden="true" />
      <div className="book-edges" aria-hidden="true" />
      <span className="book-ribbon" aria-hidden="true" />
      <div className="book-page">
        <div className="paper">
          <div className="paper-scroll">{children}</div>
        </div>
      </div>
      <div className="spiral" aria-hidden="true">
        {Array.from({ length: 11 }, (_, i) => (
          <span key={i} className="spiral-ring" />
        ))}
      </div>
    </div>
  );
}

function StepBar({ step, onBack, onSkip }: { step: Step; onBack: () => void; onSkip?: () => void }) {
  const idx = STEP_INDEX[step] ?? 0;
  return (
    <div className="row between">
      <button className="icon-btn" onClick={onBack} aria-label="Geri">
        <BackIcon />
      </button>
      <div className="steps" aria-label={`Adım ${idx + 1} / 3`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={i === idx ? "on" : ""} />
        ))}
      </div>
      {onSkip ? (
        <button className="link-btn" style={{ color: "var(--muted)", fontWeight: 600, fontSize: 15, width: 44 }} onClick={onSkip}>
          Atla
        </button>
      ) : (
        <span style={{ width: 44 }} />
      )}
    </div>
  );
}

const TIMES: { label: string; h: number; m: number }[] = [
  { label: "20:00", h: 20, m: 0 },
  { label: "21:00", h: 21, m: 0 },
  { label: "22:00", h: 22, m: 0 },
];

export function OnboardingScreen({ onDone }: { onDone: (s: Settings) => void }) {
  const [step, setStep] = useState<Step>("cover");
  const [name, setName] = useState("");
  const [time, setTime] = useState<{ h: number; m: number }>({ h: 21, m: 0 });
  const [custom, setCustom] = useState(false);
  const [reminderOn, setReminderOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const reduceMotion = useRef(false);
  // Kapaktan isim sayfasına kesintisiz geçiş: açılan defterin ekrandaki yeri
  const fromRect = useRef<DOMRect | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [zooming, setZooming] = useState(false);

  useEffect(() => {
    reduceMotion.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  // Kapak açılınca açılan defterin yerini ölç ve isim sayfasına geç.
  useEffect(() => {
    if (step !== "opening") return;
    const t = setTimeout(
      () => {
        fromRect.current = sceneRef.current?.querySelector(".nb-cover")?.getBoundingClientRect() ?? null;
        setStep("name");
      },
      reduceMotion.current ? 0 : OPEN_MS,
    );
    return () => clearTimeout(t);
  }, [step]);

  // İsim sayfası, açılan defterin olduğu yerden ve boyuttan başlar; yavaşça son haline yaklaşır.
  useLayoutEffect(() => {
    if (step !== "name") return;
    const from = fromRect.current;
    fromRect.current = null;
    const el = pageRef.current;
    if (!from || !el || reduceMotion.current) return;
    const to = el.getBoundingClientRect();
    const scale = from.width / to.width;
    el.style.transformOrigin = "top left";
    el.style.transition = "none";
    el.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scale})`;
    setZooming(true);
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.transition = `transform ${ZOOM_MS}ms cubic-bezier(0.33, 0.1, 0.2, 1)`;
        el.style.transform = "none";
      }),
    );
    const t = setTimeout(() => {
      el.style.transition = "";
      el.style.transform = "";
      el.style.transformOrigin = "";
      setZooming(false);
    }, ZOOM_MS + 60);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [step]);

  const today = new Date();
  const started = `${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}'de başladı`;

  function chooseReminder(on: boolean) {
    setReminderOn(on);
    setStep("privacy"); // izin penceresini beklemeden ilerle
    if (on) {
      // Bildirim izni verilmezse sessizce kapat; Ayarlar'dan sonra açılabilir.
      void scheduleDailyReminder(time.h, time.m).then((ok) => !ok && setReminderOn(false));
    }
  }

  async function finish() {
    setBusy(true);
    try {
      const p = await GunlukNative.requestPermissions().catch(() => null);
      if (p && p.microphone !== "granted" && !notice) {
        setNotice("Mikrofon izni olmadan kayıt yapılamıyor. İstersen yine de devam et; Ayarlar > Gizlilik > Mikrofon'dan sonra açabilirsin.");
        return;
      }
      onDone({ ...DEFAULT_SETTINGS, name: name.trim(), reminderOn, reminderHour: time.h, reminderMinute: time.m });
    } finally {
      setBusy(false);
    }
  }

  // ---------- 1 · Kapak ----------
  if (step === "cover" || step === "opening") {
    const firstPage = (
      <div style={{ padding: "18px 12px 0 40px" }}>
        <span className="eyebrow" style={{ fontSize: 9 }}>İlk sayfa</span>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, marginTop: 4, whiteSpace: "nowrap" }}>Bu defter kimin?</div>
      </div>
    );
    return (
      <main className="screen pad onb-cover" style={{ paddingBottom: "calc(var(--safe-bottom) + 24px)", overflow: "hidden" }}>
        <div ref={sceneRef}>
          <CoverScene title="Günlüğüm" opening={step === "opening"} under={firstPage} />
        </div>
        <div className="col onb-cover-head" style={{ gap: 12, textAlign: "center", alignItems: "center", opacity: step === "opening" ? 0 : 1, transition: "opacity 500ms ease" }}>
          <h1 className="hero" style={{ fontSize: 30 }}>
            Gününü 60 saniyede anlat.
          </h1>
        </div>
        <div className="promises" style={{ marginTop: 22, opacity: step === "opening" ? 0 : 1, transition: "opacity 500ms ease" }}>
          <div className="promise">
            <span className="promise-icon">
              <MicIcon size={20} />
            </span>
            60 saniye
            <br />
            konuş
          </div>
          <div className="promise">
            <span className="promise-icon">
              <PencilIcon />
            </span>
            Defterin
            <br />
            kendini yazsın
          </div>
          <div className="promise">
            <span className="promise-icon">
              <LockIcon />
            </span>
            Sadece
            <br />
            senin
          </div>
        </div>
        <button className="btn btn--primary" style={{ marginTop: 26, opacity: step === "opening" ? 0 : 1, transition: "opacity 500ms ease" }} onClick={() => setStep("opening")} disabled={step === "opening"}>
          Defteri aç
        </button>
      </main>
    );
  }

  // ---------- 2 · İsim ----------
  if (step === "name") {
    return (
      <main className={`screen pad ${zooming ? "onb-zooming" : ""}`} style={{ paddingBottom: "calc(var(--safe-bottom) + 24px)", overflow: "hidden" }}>
        <div className="onb-reveal">
          <StepBar step={step} onBack={() => setStep("cover")} onSkip={() => setStep("reminder")} />
        </div>
        <div style={{ marginTop: 24 }} ref={pageRef}>
          <OpenPage height={440}>
            <span className="eyebrow">İlk sayfa</span>
            <h1 style={{ margin: "6px 0 0", fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 600 }}>Bu defter kimin?</h1>
            <div className="onb-reveal onb-reveal--late">
            <label htmlFor="name" className="small muted" style={{ marginTop: 22, fontWeight: 600 }}>
              Adın
            </label>
            <input
              id="name"
              className="name-input"
              value={name}
              maxLength={30}
              autoComplete="given-name"
              autoCapitalize="words"
              enterKeyHint="next"
              placeholder="Adını yaz"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setStep("reminder")}
            />
            <div style={{ marginTop: 26, paddingTop: 14, borderTop: "1px dashed var(--line-strong)" }} aria-live="polite">
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 600 }}>{journalTitle(name)}</div>
              <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 14, color: "var(--muted)" }}>{started}</div>
            </div>
            </div>
            <div className="paper-text" style={{ minHeight: 64 }} />
          </OpenPage>
        </div>
        <p className="small muted onb-reveal onb-reveal--late" style={{ textAlign: "center", margin: "14px 4px 0", lineHeight: 1.45 }}>
          Adın sadece bu telefonda saklanır; seni adınla selamlarız.
        </p>
        <div className="grow" />
        <button className="btn btn--primary onb-reveal onb-reveal--late" onClick={() => setStep("reminder")}>
          Devam
        </button>
      </main>
    );
  }

  // ---------- 3 · Hatırlatma ----------
  if (step === "reminder") {
    const timeValue = `${String(time.h).padStart(2, "0")}:${String(time.m).padStart(2, "0")}`;
    return (
      <main className="screen pad" style={{ paddingBottom: "calc(var(--safe-bottom) + 16px)" }}>
        <StepBar step={step} onBack={() => setStep("name")} onSkip={() => chooseReminder(false)} />
        <div style={{ marginTop: 24 }}>
          <OpenPage height={custom ? 440 : 400}>
            <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>Seni ne zaman hatırlatayım?</h1>
            <p className="small muted" style={{ margin: "8px 0 0", lineHeight: 1.5 }}>
              Günün bittiği, biraz sakinleştiğin bir saat seç.
            </p>
            <div role="radiogroup" aria-label="Hatırlatma saati" style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              {TIMES.map((t) => (
                <button
                  key={t.label}
                  role="radio"
                  className="choice"
                  aria-checked={!custom && time.h === t.h && time.m === t.m}
                  onClick={() => {
                    setCustom(false);
                    setTime({ h: t.h, m: t.m });
                  }}
                >
                  {t.label}
                </button>
              ))}
              <button role="radio" className="choice" aria-checked={custom} onClick={() => setCustom(true)}>
                Başka saat
              </button>
            </div>
            {custom && (
              <input
                className="time-input"
                type="time"
                aria-label="Hatırlatma saati"
                value={timeValue}
                style={{ marginTop: 12, alignSelf: "flex-start" }}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(":").map(Number);
                  if (!Number.isNaN(h) && !Number.isNaN(m)) setTime({ h, m });
                }}
              />
            )}
            <div className="paper-text" style={{ minHeight: 64 }} />
          </OpenPage>
        </div>

        <div className="card row" style={{ marginTop: 18, gap: 12, borderRadius: 18, boxShadow: "0 6px 18px rgba(56,42,57,0.10)" }} aria-label="Bildirim önizlemesi">
          <span className="row" style={{ width: 38, height: 38, borderRadius: 9, background: "var(--aubergine)", justifyContent: "center", gap: 2, flexShrink: 0 }} aria-hidden="true">
            {[9, 16, 22, 14, 8].map((h, i) => (
              <span key={i} style={{ width: 3, height: h, borderRadius: 2, background: ["#B9A8C9", "#C99CA5", "#D99182", "#BA9B87", "#9AA58C"][i] }} />
            ))}
          </span>
          <span className="col" style={{ gap: 2, minWidth: 0, flex: 1 }}>
            <span className="row between" style={{ fontSize: 13 }}>
              <strong>Bugün nasıldı?</strong>
              <span className="muted">{timeValue}</span>
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>60 saniyede anlat, gerisini biz hallederiz.</span>
          </span>
        </div>

        <div className="grow" />
        <button className="btn btn--primary" onClick={() => chooseReminder(true)}>
          Hatırlat
        </button>
        <button className="link-btn" style={{ alignSelf: "center", color: "var(--muted)", fontWeight: 600, fontSize: 15, padding: "12px" }} onClick={() => chooseReminder(false)}>
          Şimdilik hatırlatma
        </button>
      </main>
    );
  }

  // ---------- 4 · Gizlilik ve izinler ----------
  const bullet = (icon: React.ReactNode, text: string) => (
    <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
      <span className="promise-icon" style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ fontSize: 15, lineHeight: 1.45, fontWeight: 600, paddingTop: 6 }}>{text}</span>
    </div>
  );
  return (
    <main className="screen pad" style={{ paddingBottom: "calc(var(--safe-bottom) + 24px)" }}>
      <StepBar step={step} onBack={() => setStep("reminder")} />
      <div style={{ marginTop: 24 }}>
        <OpenPage height={400}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}>Defterin sadece senin.</h1>
          <div className="col" style={{ marginTop: 20, gap: 14 }}>
            {bullet(<LockIcon size={17} />, "Sesin ve yazdıkların sunucularımıza gönderilmez.")}
            {bullet(<PhoneIcon />, "Yazıya çevirme ve özet bu telefonda yapılır.")}
            {bullet(<FaceIcon />, "İstersen Face ID ile defterini kilitlersin.")}
          </div>
          <div className="paper-text" style={{ minHeight: 64 }} />
        </OpenPage>
      </div>
      <div className="card row" style={{ marginTop: 18, gap: 12 }}>
        <span className="row" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--coral-halo-1)", justifyContent: "center", flexShrink: 0 }}>
          <MicIcon size={20} />
        </span>
        <span className="small" style={{ lineHeight: 1.45, color: "var(--ink-soft)" }}>
          Kayıt yapabilmek için mikrofon ve konuşma tanıma iznine ihtiyacımız var.
        </span>
      </div>
      {notice && (
        <p className="notice" role="alert" style={{ marginTop: 12, marginBottom: 0 }}>
          {notice}
        </p>
      )}
      <div className="grow" />
      <button className="btn btn--primary" onClick={finish} disabled={busy}>
        {notice ? "Yine de devam et" : "İzin ver ve başla"}
      </button>
    </main>
  );
}
