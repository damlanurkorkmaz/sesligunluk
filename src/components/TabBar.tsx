import { CalendarIcon, SunIcon } from "./Icons";

export type Tab = "today" | "calendar";

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Ana menü">
      <button className={`tab ${active === "today" ? "tab--active" : ""}`} onClick={() => onChange("today")} aria-current={active === "today" ? "page" : undefined}>
        <SunIcon />
        Bugün
      </button>
      <button className={`tab ${active === "calendar" ? "tab--active" : ""}`} onClick={() => onChange("calendar")} aria-current={active === "calendar" ? "page" : undefined}>
        <CalendarIcon />
        Takvim
      </button>
    </nav>
  );
}
