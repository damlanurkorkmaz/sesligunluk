type P = { size?: number; color?: string };
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const MicIcon = ({ size = 48, color = "currentColor" }: P) => (
  <svg {...base(size)} stroke={color} strokeWidth={1.8}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </svg>
);
export const CloseIcon = ({ size = 20, color = "currentColor" }: P) => (
  <svg {...base(size)} stroke={color}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const BackIcon = ({ size = 20, color = "currentColor" }: P) => (
  <svg {...base(size)} stroke={color}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const NextIcon = ({ size = 20, color = "currentColor" }: P) => (
  <svg {...base(size)} stroke={color}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);
export const FlameIcon = ({ size = 16, color = "#B8695A" }: P) => (
  <svg {...base(size)} stroke={color}>
    <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z" />
  </svg>
);
export const LockIcon = ({ size = 20, color = "currentColor" }: P) => (
  <svg {...base(size)} stroke={color}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
export const SparkIcon = ({ size = 16, color = "currentColor" }: P) => (
  <svg {...base(size)} stroke={color}>
    <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
  </svg>
);
export const SunIcon = ({ size = 24 }: P) => (
  <svg {...base(size)} stroke="currentColor">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
export const CalendarIcon = ({ size = 24 }: P) => (
  <svg {...base(size)} stroke="currentColor">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </svg>
);
export const RestartIcon = ({ size = 22, color = "currentColor" }: P) => (
  <svg {...base(size)} stroke={color}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);
export const GearIcon = ({ size = 24 }: P) => (
  <svg {...base(size)} stroke="currentColor">
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);
export const FaceIdIcon = ({ size = 44, color = "currentColor" }: P) => (
  <svg {...base(size)} stroke={color} strokeWidth={1.6}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <path d="M9 9v1M15 9v1M12 9v4h-1M9 16c1.5 1.2 4.5 1.2 6 0" />
  </svg>
);
export const BookIcon = ({ size = 24 }: P) => (
  <svg {...base(size)} stroke="currentColor">
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
  </svg>
);
export const ChevronDownIcon = ({ size = 16, color = "currentColor" }: P) => (
  <svg {...base(size)} stroke={color} strokeWidth={2.4}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
