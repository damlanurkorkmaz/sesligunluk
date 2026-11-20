"use client";

import { useState } from "react";
import { BackIcon } from "./Icons";
import { NotebookCover } from "./NotebookCover";
import { type CoverLook, DAMASK_COLORS, THEMES, themeById } from "@/lib/themes";
import { tap } from "@/lib/haptics";

/** Ayarlar › Kapağın: büyük önizleme, tema rafı ve (damask için) renkler. */
export function CoverPicker({
  name,
  premium,
  initial,
  onBack,
  onSave,
  onLocked,
}: {
  name: string;
  premium: boolean;
  initial: CoverLook;
  onBack: () => void;
  onSave: (l: CoverLook) => void;
  onLocked: (l: CoverLook) => void;
}) {
  const [look, setLook] = useState<CoverLook>(initial);
  const theme = themeById(look.theme);
  const locked = theme.premium && !premium;
  const title = name.trim() || "Günlüğüm";
  const color = DAMASK_COLORS.find((c) => c.id === look.color) ?? DAMASK_COLORS[0];

  return (
    <main className="screen cover-picker">
      <header className="pad row" style={{ gap: 10 }}>
        <button className="icon-btn" onClick={onBack} aria-label="Geri">
          <BackIcon />
        </button>
        <h1 className="title" style={{ fontSize: 24 }}>
          Kapağın
        </h1>
      </header>

      <div className="cp-preview">
        <div key={`${look.theme}-${look.color}`} className="cp-preview-book">
          <NotebookCover title={title} width={176} height={236} look={look} sub={look.theme === "ansiklopedi" ? "Cilt I" : undefined} />
        </div>
        <div className="cp-preview-info">
          <strong className="serif" style={{ fontSize: 19 }}>
            {theme.id === "damask" ? `${color.name} deri` : theme.name}
          </strong>
          <span className="small muted">{theme.desc}</span>
        </div>
      </div>

      {theme.id === "damask" && (
        <div className="cp-colors" role="radiogroup" aria-label="Deri rengi">
          {DAMASK_COLORS.map((c) => (
            <button
              key={c.id}
              role="radio"
              aria-checked={look.color === c.id}
              aria-label={c.name}
              className={`cp-swatch ${look.color === c.id ? "cp-swatch--on" : ""}`}
              style={{ background: c.swatch }}
              onClick={() => {
                void tap("light");
                setLook({ theme: "damask", color: c.id });
              }}
            />
          ))}
        </div>
      )}

      <span className="eyebrow" style={{ margin: "18px 24px 10px" }}>
        Kapaklar
      </span>
      <div className="cp-rack" role="radiogroup" aria-label="Kapak teması">
        {THEMES.map((t) => {
          const on = t.id === look.theme;
          return (
            <button
              key={t.id}
              role="radio"
              aria-checked={on}
              className={`cp-item ${on ? "cp-item--on" : ""}`}
              onClick={() => {
                void tap("light");
                setLook({ theme: t.id, color: t.id === "damask" ? look.color : "murdum" });
              }}
            >
              <span className="cp-thumb">
                <span className="cp-thumb-inner">
                  <NotebookCover title={title} width={176} height={236} look={{ theme: t.id, color: t.id === "damask" ? look.color : "murdum" }} />
                </span>
                {t.premium && !premium && (
                  <span className="cp-lock" aria-label="Premium">
                    ✦
                  </span>
                )}
              </span>
              <span className="cp-name">{t.name}</span>
            </button>
          );
        })}
      </div>

      <div className="grow" />
      <div className="pad" style={{ paddingBottom: "calc(var(--safe-bottom) + 20px)" }}>
        {locked ? (
          <>
            <button className="btn btn--primary" onClick={() => onLocked(look)}>
              ✦ Premium ile kullan
            </button>
            <p className="small muted" style={{ textAlign: "center", margin: "8px 0 0" }}>
              Deri damask ve tüm renkleri herkese açık.
            </p>
          </>
        ) : (
          <button className="btn btn--primary" onClick={() => onSave(look)}>
            Bu kapağı kullan
          </button>
        )}
      </div>
    </main>
  );
}
