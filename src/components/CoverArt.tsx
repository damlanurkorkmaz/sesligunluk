"use client";

import { useId } from "react";
import type { ThemeId } from "@/lib/themes";

/**
 * Premium temaların kapak yüzü (damask dışındakiler). Kapağın içini doldurur;
 * spiral, bant ve gölge NotebookCover'dan gelir. Çizimler 226×302 tuval üzerinde.
 */
export function CoverArt({ theme, title, sub }: { theme: Exclude<ThemeId, "damask">; title: string; sub?: string }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (s: string) => `${raw}${s}`;
  const url = (s: string) => `url(#${id(s)})`;
  // Uzun isimler kapağa sığsın
  const fit = (base: number, maxW: number) => Math.min(base, maxW / Math.max(1, title.length * 0.52));
  const WAVE = [
    [-17, 10, "#B9A8C9"],
    [-10, 22, "#C79CA9"],
    [-3, 32, "#D99182"],
    [4, 20, "#B3A188"],
    [11, 10, "#9AA58C"],
  ] as const;

  const body = (() => {
    switch (theme) {
      case "ebru":
        return (
          <>
            <defs>
              <filter id={id("m")} x="-30%" y="-30%" width="160%" height="160%">
                <feTurbulence type="fractalNoise" baseFrequency="0.005 0.011" numOctaves={2} seed={21} result="n" />
                <feGaussianBlur in="n" stdDeviation="3" result="nb" />
                <feDisplacementMap in="SourceGraphic" in2="nb" scale="150" xChannelSelector="R" yChannelSelector="G" />
                <feGaussianBlur stdDeviation=".7" />
              </filter>
              <pattern id={id("s")} width="84" height="400" patternUnits="userSpaceOnUse">
                <rect width="84" height="400" fill="#f3ebe0" />
                <rect x="0" width="20" height="400" fill="#c3b3d2" />
                <rect x="24" width="6" height="400" fill="#4a3a4c" />
                <rect x="34" width="16" height="400" fill="#e0a495" />
                <rect x="54" width="10" height="400" fill="#a9b39b" />
              </pattern>
              <g id={id("d")}>
                <circle r="30" fill="#4a3a4c" />
                <circle r="26" fill="#f3ebe0" />
                <circle r="19" fill="#c3b3d2" />
                <circle r="15" fill="#f3ebe0" />
                <circle r="9" fill="#e0a495" />
              </g>
            </defs>
            <g filter={url("m")}>
              <rect x="-80" y="-80" width="390" height="460" fill={url("s")} transform="rotate(8 113 151)" />
              <use href={`#${id("d")}`} x="150" y="60" />
              <use href={`#${id("d")}`} x="96" y="250" />
              <use href={`#${id("d")}`} x="200" y="170" />
            </g>
            <rect x="0" y="0" width="34" height="302" fill="#352836" />
            <path d="M226 0 V40 L186 0Z M226 302 V262 L186 302Z" fill="#3f3040" />
            <rect x="58" y="122" width="140" height="62" rx="4" fill="#fbf6ec" />
            <rect x="62" y="126" width="132" height="54" rx="2" fill="none" stroke="#382A39" strokeWidth="1" />
            <rect x="65" y="129" width="126" height="48" rx="2" fill="none" stroke="#382A39" strokeOpacity=".35" strokeWidth=".8" />
            <text x="128" y="155" textAnchor="middle" fontFamily="Lora Variable, serif" fontWeight={600} fontSize={fit(17, 220)} fill="#382A39">
              {title}
            </text>
            <text x="128" y="170" textAnchor="middle" fontFamily="Lora Variable, serif" fontStyle="italic" fontSize="10" fill="#8a7680">
              {sub ?? "günlük"}
            </text>
          </>
        );
      case "keten":
        return (
          <>
            <defs>
              <pattern id={id("l")} width="3" height="3" patternUnits="userSpaceOnUse">
                <rect width="3" height="3" fill="#8e9a7c" />
                <rect width="3" height="1" fill="rgba(255,255,255,.07)" />
                <rect width="1" height="3" fill="rgba(40,50,30,.12)" />
              </pattern>
              <radialGradient id={id("r")} cx=".3" cy=".2" r=".9">
                <stop offset="0" stopColor="#fff" stopOpacity=".12" />
                <stop offset=".6" stopColor="#fff" stopOpacity="0" />
                <stop offset="1" stopColor="#000" stopOpacity=".18" />
              </radialGradient>
              <linearGradient id={id("b")} x1="0" x2="1">
                <stop offset="0" stopColor="#d9c08a" />
                <stop offset="1" stopColor="#b8975a" />
              </linearGradient>
            </defs>
            <rect width="226" height="302" fill={url("l")} />
            <rect width="226" height="302" fill={url("r")} />
            <rect width="44" height="302" fill="#5e472f" />
            <line x1="45" y1="0" x2="45" y2="302" stroke="rgba(255,240,220,.5)" strokeWidth="1.5" strokeDasharray="5 4" />
            <path d="M226 0 V46 L180 0Z M226 302 V256 L180 302Z" fill="#6b5236" />
            <rect x="70" y="76" width="122" height="54" rx="3" fill={url("b")} />
            <rect x="74" y="80" width="114" height="46" rx="2" fill="#fbf6ec" />
            <text x="131" y="108" textAnchor="middle" fontFamily="Lora Variable, serif" fontWeight={600} fontSize={fit(15, 200)} fill="#382A39">
              {title}
            </text>
          </>
        );
      case "kadife":
        return (
          <>
            <defs>
              <radialGradient id={id("bg")} cx=".35" cy=".25" r="1">
                <stop offset="0" stopColor="#2f3f6b" />
                <stop offset=".55" stopColor="#1b2442" />
                <stop offset="1" stopColor="#0f1529" />
              </radialGradient>
              <linearGradient id={id("g")} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f3dca4" />
                <stop offset=".5" stopColor="#c9a35c" />
                <stop offset="1" stopColor="#f0d695" />
              </linearGradient>
              <filter id={id("v")}>
                <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves={2} seed={5} />
                <feColorMatrix values="0 0 0 0 .8 0 0 0 0 .85 0 0 0 0 1 0 0 0 .08 0" />
              </filter>
            </defs>
            <rect width="226" height="302" fill={url("bg")} />
            <rect width="226" height="302" filter={url("v")} />
            <g fill={url("g")}>
              <circle cx="56" cy="40" r="8" />
              <path d="M84 32 a8 8 0 1 0 0 16 a6 8 0 1 1 0 -16z" />
              <circle cx="114" cy="40" r="8" fill="none" stroke={url("g")} strokeWidth="1.6" />
              <path d="M144 32 a8 8 0 1 1 0 16 a6 8 0 1 0 0 -16z" />
              <circle cx="172" cy="40" r="8" />
            </g>
            <g stroke={url("g")} strokeWidth=".8" opacity=".7" fill="none">
              <path d="M66 120 L98 104 L128 128 L166 112 L184 150" />
              <path d="M98 104 L92 70" />
            </g>
            <g fill="#f3dca4">
              <circle cx="66" cy="120" r="2.2" />
              <circle cx="98" cy="104" r="2.6" />
              <circle cx="128" cy="128" r="2" />
              <circle cx="166" cy="112" r="2.4" />
              <circle cx="184" cy="150" r="2" />
              <circle cx="92" cy="70" r="1.8" />
              <circle cx="46" cy="200" r="1" />
              <circle cx="186" cy="210" r="1.2" />
              <circle cx="156" cy="250" r=".9" />
              <circle cx="76" cy="260" r="1.1" />
            </g>
            <text x="114" y="210" textAnchor="middle" fontFamily="Lora Variable, serif" fontWeight={600} fontSize={fit(21, 210)} fill={url("g")}>
              {title}
            </text>
            <line x1="86" y1="222" x2="142" y2="222" stroke={url("g")} strokeWidth="1" />
          </>
        );
      case "artdeco":
        return (
          <>
            <defs>
              <linearGradient id={id("bg")} x1="0" y1="0" x2=".4" y2="1">
                <stop offset="0" stopColor="#252025" />
                <stop offset="1" stopColor="#141114" />
              </linearGradient>
              <linearGradient id={id("g")} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f1d79c" />
                <stop offset=".5" stopColor="#b8904c" />
                <stop offset="1" stopColor="#ead08f" />
              </linearGradient>
            </defs>
            <rect width="226" height="302" fill={url("bg")} />
            <g fill="none" stroke={url("g")}>
              <path d="M38 14 H192 V288 H38 Z" strokeWidth="1.2" />
              <path d="M44 20 H186 V282 H44 Z" strokeWidth=".6" />
              <path d="M38 34 H50 V22 M192 34 H180 V22 M38 268 H50 V280 M192 268 H180 V280" strokeWidth="1.2" />
              <g strokeWidth="1">
                <path d="M115 282 L115 196 M115 282 L76 205 M115 282 L154 205 M115 282 L54 228 M115 282 L176 228 M115 282 L46 258 M115 282 L184 258" />
                <path d="M63 282 A52 52 0 0 1 167 282 M79 282 A36 36 0 0 1 151 282 M95 282 A20 20 0 0 1 135 282" />
              </g>
              <path d="M115 40 L123 52 L115 64 L107 52 Z" strokeWidth="1" />
            </g>
            <text x="115" y="118" textAnchor="middle" fontFamily="Plus Jakarta Sans Variable, sans-serif" fontWeight={800} fontSize="11" letterSpacing="5" fill={url("g")}>
              GÜNLÜK
            </text>
            <text x="115" y="150" textAnchor="middle" fontFamily="Lora Variable, serif" fontWeight={600} fontSize={fit(21, 200)} fill={url("g")}>
              {title}
            </text>
            {sub && (
              <text x="115" y="170" textAnchor="middle" fontFamily="Plus Jakarta Sans Variable, sans-serif" fontWeight={700} fontSize="9" letterSpacing="3" fill={url("g")} opacity=".8">
                {sub}
              </text>
            )}
          </>
        );
      case "kraft":
        return (
          <>
            <defs>
              <filter id={id("k1")}>
                <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves={3} seed={9} />
                <feColorMatrix values="0 0 0 0 .32 0 0 0 0 .2 0 0 0 0 .08 0 0 0 .26 0" />
              </filter>
              <filter id={id("k2")}>
                <feTurbulence type="fractalNoise" baseFrequency=".015 .35" numOctaves={2} seed={12} />
                <feColorMatrix values="0 0 0 0 .95 0 0 0 0 .85 0 0 0 0 .7 0 0 0 .22 0" />
              </filter>
              <pattern id={id("c")} width="3" height="3" patternUnits="userSpaceOnUse">
                <rect width="3" height="3" fill="#2c2a2b" />
                <rect width="3" height="1" fill="rgba(255,255,255,.05)" />
              </pattern>
            </defs>
            <rect width="226" height="302" fill="#bf9a6c" />
            <rect width="226" height="302" filter={url("k1")} />
            <rect width="226" height="302" filter={url("k2")} />
            <rect width="40" height="302" fill={url("c")} />
            <g transform="translate(124 112)">
              <circle r="34" fill="none" stroke="rgba(255,240,215,.35)" strokeWidth="2" transform="translate(0 1.4)" />
              <circle r="34" fill="none" stroke="rgba(70,45,20,.38)" strokeWidth="2" />
              <g fill="rgba(70,45,20,.4)">
                {WAVE.map(([x, h], i) => (
                  <rect key={i} x={x} y={-h / 2} width="4" height={h} rx="2" />
                ))}
              </g>
            </g>
            <g transform="translate(70 196) rotate(-2)">
              <rect width="108" height="44" rx="2" fill="#f6efe0" stroke="rgba(60,40,20,.25)" />
              <line x1="8" y1="30" x2="100" y2="30" stroke="#d9c9ae" />
              <text x="54" y="24" textAnchor="middle" fontFamily="Courier New, monospace" fontWeight={700} fontSize={fit(13, 170)} fill="#2a2420">
                {title}
              </text>
              <text x="54" y="40" textAnchor="middle" fontFamily="Courier New, monospace" fontSize="8" fill="#6b5a48">
                {sub ?? "günlük"}
              </text>
            </g>
          </>
        );
      case "ansiklopedi":
        return (
          <>
            <defs>
              <linearGradient id={id("bg")} x1="0" x2="1">
                <stop offset="0" stopColor="#4a1a22" />
                <stop offset=".4" stopColor="#6b2531" />
                <stop offset="1" stopColor="#5a1f29" />
              </linearGradient>
              <linearGradient id={id("g")} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f2d99e" />
                <stop offset=".5" stopColor="#b8904c" />
                <stop offset="1" stopColor="#ecd294" />
              </linearGradient>
              <filter id={id("cl")}>
                <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves={2} seed={6} />
                <feColorMatrix values="0 0 0 0 1 0 0 0 0 .8 0 0 0 0 .8 0 0 0 .07 0" />
              </filter>
            </defs>
            <rect width="226" height="302" fill={url("bg")} />
            <rect width="226" height="302" filter={url("cl")} />
            <g stroke={url("g")} fill="none">
              <path d="M44 26 H194" strokeWidth="2.4" />
              <path d="M44 32 H194 M44 37 H194" strokeWidth=".8" />
              <path d="M44 276 H194" strokeWidth="2.4" />
              <path d="M44 270 H194 M44 265 H194" strokeWidth=".8" />
            </g>
            <rect x="58" y="76" width="122" height="118" rx="3" fill="#1d1416" />
            <rect x="62" y="80" width="114" height="110" rx="2" fill="none" stroke={url("g")} />
            <text x="119" y="108" textAnchor="middle" fontFamily="Plus Jakarta Sans Variable, sans-serif" fontWeight={800} fontSize="9" letterSpacing="3.5" fill={url("g")}>
              GÜNLÜK
            </text>
            <text x="119" y="136" textAnchor="middle" fontFamily="Lora Variable, serif" fontWeight={600} fontSize={fit(18, 170)} fill={url("g")}>
              {title}
            </text>
            <path d="M99 148 H139" stroke={url("g")} strokeWidth=".8" />
            {sub && (
              <text x="119" y="166" textAnchor="middle" fontFamily="Lora Variable, serif" fontSize="11" fill={url("g")}>
                {sub}
              </text>
            )}
          </>
        );
      case "cini":
        return (
          <>
            <defs>
              <pattern id={id("t")} width="52" height="52" patternUnits="userSpaceOnUse" x="6">
                <rect width="52" height="52" fill="#f4f0e6" />
                <path d="M26 6 L31 21 L46 26 L31 31 L26 46 L21 31 L6 26 L21 21Z" fill="#2c4f8c" />
                <path d="M26 15 L29 23 L37 26 L29 29 L26 37 L23 29 L15 26 L23 23Z" fill="#3fa7a5" />
                <circle cx="26" cy="26" r="3" fill="#f4f0e6" />
                <path d="M0 0 L8 0 L0 8Z M52 0 L44 0 L52 8Z M0 52 L8 52 L0 44Z M52 52 L44 52 L52 44Z" fill="#c4553f" />
                <path d="M0 26 L5 21 L5 31Z M52 26 L47 21 L47 31Z M26 0 L21 5 L31 5Z M26 52 L21 47 L31 47Z" fill="#2c4f8c" opacity=".55" />
              </pattern>
              <radialGradient id={id("gl")} cx=".3" cy=".2" r=".9">
                <stop offset="0" stopColor="#fff" stopOpacity=".35" />
                <stop offset=".5" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="226" height="302" fill={url("t")} />
            <rect width="226" height="302" fill={url("gl")} />
            <g transform="translate(118 151)">
              <path d="M-62 -26 Q-62 -34 -54 -34 H54 Q62 -34 62 -26 V26 Q62 34 54 34 H-54 Q-62 34 -62 26Z" fill="#f4f0e6" stroke="#2c4f8c" strokeWidth="2.5" />
              <path d="M-56 -22 V22 M56 -22 V22" stroke="#3fa7a5" strokeWidth="1" />
              <text y="4" textAnchor="middle" fontFamily="Lora Variable, serif" fontWeight={600} fontSize={fit(18, 190)} fill="#1f3766">
                {title}
              </text>
              <text y="20" textAnchor="middle" fontFamily="Lora Variable, serif" fontStyle="italic" fontSize="10" fill="#3a6aa8">
                {sub ?? "günlük"}
              </text>
            </g>
          </>
        );
      case "suluboya":
        return (
          <>
            <defs>
              <filter id={id("w")} x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency=".025" numOctaves={3} seed={14} result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="34" xChannelSelector="R" yChannelSelector="G" result="d" />
                <feGaussianBlur in="d" stdDeviation="2.2" />
              </filter>
              <filter id={id("p")}>
                <feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves={3} seed={3} />
                <feColorMatrix values="0 0 0 0 .5 0 0 0 0 .45 0 0 0 0 .4 0 0 0 .1 0" />
              </filter>
            </defs>
            <rect width="226" height="302" fill="#fbf7ef" />
            <g filter={url("w")}>
              <ellipse cx="86" cy="60" rx="90" ry="60" fill="#c3b3d2" opacity=".8" />
              <ellipse cx="186" cy="150" rx="80" ry="70" fill="#e5a898" opacity=".75" />
              <ellipse cx="96" cy="250" rx="100" ry="60" fill="#aab79a" opacity=".75" />
              <ellipse cx="166" cy="40" rx="50" ry="30" fill="#e5a898" opacity=".5" />
            </g>
            <rect width="226" height="302" filter={url("p")} />
            <text x="120" y="160" textAnchor="middle" fontFamily="Lora Variable, serif" fontStyle="italic" fontWeight={600} fontSize={fit(24, 210)} fill="#382A39">
              {title}
            </text>
            <text x="120" y="180" textAnchor="middle" fontFamily="Plus Jakarta Sans Variable, sans-serif" fontWeight={700} fontSize="8.5" letterSpacing="3" fill="#6E6070">
              GÜNLÜK
            </text>
          </>
        );
      case "mektup":
        return (
          <>
            <defs>
              <pattern id={id("a")} width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="7" height="28" fill="#c95f4c" />
                <rect x="14" width="7" height="28" fill="#3d3550" />
              </pattern>
              <filter id={id("o")}>
                <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves={3} seed={5} />
                <feColorMatrix values="0 0 0 0 .5 0 0 0 0 .4 0 0 0 0 .25 0 0 0 .12 0" />
              </filter>
            </defs>
            <rect width="226" height="302" fill={url("a")} />
            <rect x="12" y="12" width="202" height="278" fill="#f3ead7" />
            <rect width="226" height="302" filter={url("o")} />
            <g transform="translate(146 30) rotate(4)">
              <rect width="50" height="62" fill="#fbf6ec" stroke="#fbf6ec" strokeWidth="4" strokeDasharray="3 3" />
              <rect x="5" y="5" width="40" height="52" fill="#382A39" />
              <g transform="translate(25 28)">
                {WAVE.map(([x, h, c], i) => (
                  <rect key={i} x={x * 0.7} y={-h / 2.6} width="3" height={h / 1.3} rx="1.5" fill={c} />
                ))}
              </g>
              <text x="25" y="52" textAnchor="middle" fontFamily="Plus Jakarta Sans Variable, sans-serif" fontWeight={800} fontSize="6" fill="#FAF7F2">
                60 SN
              </text>
            </g>
            <g transform="translate(128 74)" fill="none" stroke="#3d3550" strokeOpacity=".55" strokeWidth="1.4">
              <circle r="24" />
              <circle r="18" />
            </g>
            <text x="56" y="180" fontFamily="Lora Variable, serif" fontStyle="italic" fontSize="11" fill="#6b5a48">
              Sayın
            </text>
            <text x="56" y="204" fontFamily="Lora Variable, serif" fontWeight={600} fontSize={fit(20, 200)} fill="#2a2420">
              {title}
            </text>
            <path d="M56 214 H192 M56 236 H192 M56 258 H166" stroke="#cbb994" strokeWidth="1" />
            <text x="56" y="232" fontFamily="Lora Variable, serif" fontStyle="italic" fontSize="10" fill="#6b5a48">
              kendine yazılan mektuplar
            </text>
          </>
        );
    }
  })();

  return (
    <svg className="cover-art" viewBox="0 0 226 302" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {body}
    </svg>
  );
}
