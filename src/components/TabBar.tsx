import { CalendarIcon, GearIcon, SunIcon } from "./Icons";

export type Tab = "today" | "calendar" | "settings";

const TABS: { id: Tab; label: string; Icon: () => React.ReactElement }[] = [
  { id: "today", label: "Bugün", Icon: () => <SunIcon /> },
  { id: "calendar", label: "Takvim", Icon: () => <CalendarIcon /> },
  { id: "settings", label: "Ayarlar", Icon: () => <GearIcon /> },
];

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Ana menü">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} className={`tab ${active === id ? "tab--active" : ""}`} onClick={() => onChange(id)} aria-current={active === id ? "page" : undefined}>
          <Icon />
          {label}
        </button>
      ))}
    </nav>
  );
}
