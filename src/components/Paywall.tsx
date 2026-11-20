"use client";

import { useEffect, useState } from "react";
import { CloseIcon } from "./Icons";
import { NotebookCover } from "./NotebookCover";
import type { StoreProduct } from "@/lib/native";
import { type PlanKey, buy, loadPlans, perMonth, restore } from "@/lib/premium";
import { type CoverLook, DEFAULT_LOOK } from "@/lib/themes";
import { tap } from "@/lib/haptics";

const TERMS_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
const PRIVACY_URL = "https://damlanurkorkmaz.github.io/sesligunluk/gizlilik.html";

const HEADLINES: Record<string, string> = {
  letter: "Mektubun hazır, mührü aç",
  cover: "Defterine yeni bir kapak",
  backup: "Defterin hiç kaybolmasın",
};

/** Satış ekranı: üstte kullanıcının kendi defteri ve Premium kapaklar, üç fayda, üç plan. */
export function Paywall({
  name,
  look = DEFAULT_LOOK,
  reason,
  onClose,
  onUnlocked,
}: {
  name: string;
  look?: CoverLook;
  reason?: string;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const [plans, setPlans] = useState<Record<PlanKey, StoreProduct> | null>(null);
  const [plan, setPlan] = useState<PlanKey>("yearly");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void loadPlans().then(setPlans);
  }, []);

  const yearly = plans?.yearly;
  const trialDays = yearly?.eligibleForTrial ? yearly.trialDays : undefined;
  const saving = plans ? Math.round((1 - plans.yearly.priceValue / (plans.monthly.priceValue * 12)) * 100) : 58;

  async function purchase() {
    setBusy(true);
    setNotice(null);
    const r = await buy(plan);
    setBusy(false);
    if (r === "purchased") {
      void tap("heavy");
      onUnlocked();
    } else if (r === "pending") setNotice("Satın alma onay bekliyor. Onaylanınca Premium kendiliğinden açılır.");
    else if (r === "failed") setNotice("Satın alma tamamlanamadı. Biraz sonra tekrar dene.");
  }

  async function doRestore() {
    setBusy(true);
    const ok = await restore();
    setBusy(false);
    if (ok) onUnlocked();
    else setNotice("Bu Apple hesabında geri yüklenecek bir satın alma bulunamadı.");
  }

  const cta = plan === "yearly" && trialDays ? `${trialDays} gün ücretsiz dene` : plan === "lifetime" ? "Bir kez al, hep senin" : "Premium'a geç";

  return (
    <main className="screen paywall">
      <section className="today-cover pw-head">
        <button className="pw-close" onClick={onClose} aria-label="Kapat">
          <CloseIcon />
        </button>
        <div className="pw-fan" aria-hidden="true">
          <span className="pw-fan-l">
            <NotebookCover title="" width={110} height={148} look={{ theme: "kadife", color: "murdum" }} />
          </span>
          <span className="pw-fan-r">
            <NotebookCover title="" width={110} height={148} look={{ theme: "ebru", color: "murdum" }} />
          </span>
          <span className="pw-fan-c">
            <NotebookCover title={name.trim().split(/\s+/)[0] || "Günlüğüm"} width={124} height={166} look={look} />
          </span>
        </div>
        <span className="pw-badge">✦ PREMIUM</span>
      </section>

      <div className="pw-body">
        <h1 className="pw-title">{HEADLINES[reason ?? ""] ?? "Defterin seni daha iyi tanısın"}</h1>
        <ul className="pw-benefits">
          <li>
            <span className="pw-ico" style={{ background: "#F1EBF3" }}>
              ✉︎
            </span>
            <span>
              <b>Ayın mektubu</b>
              <small>Ay sonunda defterin sana bir mektup yazar.</small>
            </span>
          </li>
          <li>
            <span className="pw-ico" style={{ background: "#EEF1EA" }}>
              ☁︎
            </span>
            <span>
              <b>iCloud yedeği</b>
              <small>Telefon değişse de defterin kaybolmaz.</small>
            </span>
          </li>
          <li>
            <span className="pw-ico" style={{ background: "#F6EAE6" }}>
              ❖
            </span>
            <span>
              <b>9 özel kapak</b>
              <small>Ebru, kadife, ansiklopedi, çini ve dahası.</small>
            </span>
          </li>
        </ul>

        <div className="pw-plans" role="radiogroup" aria-label="Plan">
          <button role="radio" aria-checked={plan === "yearly"} className={`pw-plan pw-plan--wide ${plan === "yearly" ? "pw-plan--on" : ""}`} onClick={() => setPlan("yearly")}>
            <span className="pw-radio" />
            <span className="col" style={{ flex: 1, gap: 2, textAlign: "left" }}>
              <b>Yıllık</b>
              <small>{trialDays ? `${trialDays} gün ücretsiz, sonra ${yearly?.price}/yıl` : `${yearly?.price ?? "499,99 TL"}/yıl`}</small>
            </span>
            <span className="col" style={{ alignItems: "flex-end", gap: 2 }}>
              <b>{yearly ? perMonth(yearly) : "41,67 TL"}</b>
              <small>aylık</small>
            </span>
            {saving > 0 && <span className="pw-save">%{saving} AVANTAJLI</span>}
          </button>
          <div className="row" style={{ gap: 8 }}>
            <button role="radio" aria-checked={plan === "monthly"} className={`pw-plan ${plan === "monthly" ? "pw-plan--on" : ""}`} onClick={() => setPlan("monthly")}>
              <span className="pw-radio" />
              <span className="col" style={{ gap: 2, textAlign: "left" }}>
                <b>Aylık</b>
                <small>{plans?.monthly.price ?? "99,99 TL"}</small>
              </span>
            </button>
            <button role="radio" aria-checked={plan === "lifetime"} className={`pw-plan ${plan === "lifetime" ? "pw-plan--on" : ""}`} onClick={() => setPlan("lifetime")}>
              <span className="pw-radio" />
              <span className="col" style={{ gap: 2, textAlign: "left" }}>
                <b>Ömür boyu</b>
                <small>{plans?.lifetime.price ?? "1.299,99 TL"}</small>
              </span>
            </button>
          </div>
        </div>

        {notice && (
          <p className="notice" role="status" style={{ margin: "12px 0 0" }}>
            {notice}
          </p>
        )}

        <button className="btn btn--primary" style={{ marginTop: 14 }} onClick={purchase} disabled={busy || !plans}>
          {busy ? "Bekle…" : cta}
        </button>
        <p className="pw-fine">
          {plan === "lifetime" ? "Tek seferlik ödeme, abonelik yok." : plan === "yearly" && trialDays ? "Deneme bitmeden iptal edersen ücret alınmaz. İstediğin zaman iptal et." : "İstediğin zaman iptal et."}
          <br />
          <button className="pw-link" onClick={doRestore} disabled={busy}>
            Satın alımları geri yükle
          </button>{" "}
          ·{" "}
          <a className="pw-link" href={TERMS_URL} target="_blank" rel="noreferrer">
            Koşullar
          </a>{" "}
          ·{" "}
          <a className="pw-link" href={PRIVACY_URL} target="_blank" rel="noreferrer">
            Gizlilik
          </a>
        </p>
      </div>
    </main>
  );
}
