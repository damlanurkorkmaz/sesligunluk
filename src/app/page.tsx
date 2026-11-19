"use client";

import { useCallback, useEffect, useState } from "react";
import { Preferences } from "@capacitor/preferences";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { TodayScreen, PROMPTS } from "@/components/TodayScreen";
import { RecordScreen } from "@/components/RecordScreen";
import { DetailScreen, type Pending } from "@/components/DetailScreen";
import { JournalScreen } from "@/components/JournalScreen";
import type { Tab } from "@/components/TabBar";
import { SettingsScreen } from "@/components/SettingsScreen";
import { LockScreen } from "@/components/LockScreen";
import { App as CapApp } from "@capacitor/app";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { type Entry, listEntries } from "@/lib/entries";
import { dayKey } from "@/lib/dates";

type Route =
  | { name: "loading" }
  | { name: "onboarding" }
  | { name: "today" | "settings" }
  | { name: "journal"; date?: string }
  | { name: "record" }
  | { name: "detail"; date: string; pending: Pending | null; from: "today" | "journal" };

const ONBOARDED_KEY = "onboarded.v1";

/**
 * Tek sayfalık uygulama: Capacitor içinde sayfa yenilemeden ekranlar arasında geçiş.
 * Ekranlar: Karşılama → Bugün ⇄ Günlüğüm ⇄ Ayarlar; Bugün → Kayıt → Detay; Günlüğüm → Detay (düzenleme).
 */
export default function App() {
  const [route, setRoute] = useState<Route>({ name: "loading" });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [locked, setLocked] = useState(false);

  const refresh = useCallback(async () => setEntries(await listEntries()), []);

  useEffect(() => {
    (async () => {
      const { value } = await Preferences.get({ key: ONBOARDED_KEY });
      await refresh();
      if ((await loadSettings()).lockOn) setLocked(true);
      setRoute(value ? { name: "today" } : { name: "onboarding" });
    })();
  }, [refresh]);

  // Uygulama arka plandan dönünce kilit açıksa tekrar kilitle.
  useEffect(() => {
    let remove: (() => void) | undefined;
    CapApp.addListener("appStateChange", async ({ isActive }) => {
      if (!isActive && (await loadSettings()).lockOn) setLocked(true);
    })
      .then((h) => (remove = () => void h.remove()))
      .catch(() => undefined);
    return () => remove?.();
  }, []);

  const prompt = PROMPTS[new Date().getDate() % PROMPTS.length];
  const goTab = (t: Tab) => setRoute(t === "journal" ? { name: "journal" } : { name: t });

  if (locked && route.name !== "loading") return <LockScreen onUnlock={() => setLocked(false)} />;

  switch (route.name) {
    case "loading":
      return null;
    case "onboarding":
      return (
        <OnboardingScreen
          onDone={async () => {
            await Preferences.set({ key: ONBOARDED_KEY, value: "1" });
            await saveSettings(DEFAULT_SETTINGS);
            setRoute({ name: "today" });
          }}
        />
      );
    case "today":
      return (
        <TodayScreen
          entries={entries}
          onRecord={() => setRoute({ name: "record" })}
          onOpen={(date) => setRoute({ name: "detail", date, pending: null, from: "today" })}
          onTab={goTab}
        />
      );
    case "journal":
      return (
        <JournalScreen
          key={route.date ?? "latest"}
          entries={entries}
          initialDate={route.date}
          onEdit={(date) => setRoute({ name: "detail", date, pending: null, from: "journal" })}
          onRecord={() => setRoute({ name: "record" })}
          onTab={goTab}
        />
      );
    case "settings":
      return <SettingsScreen entries={entries} onTab={goTab} onDataCleared={refresh} />;
    case "record":
      return (
        <RecordScreen
          prompt={prompt}
          onCancel={() => setRoute({ name: "today" })}
          onDone={(fileName, durationSec, samples) => setRoute({ name: "detail", date: dayKey(), pending: { fileName, durationSec, samples }, from: "today" })}
        />
      );
    case "detail":
      return (
        <DetailScreen
          key={`${route.date}-${route.pending?.fileName ?? "view"}`}
          date={route.date}
          pending={route.pending}
          onBack={async () => {
            await refresh();
            setRoute(route.from === "journal" ? { name: "journal", date: route.date } : { name: "today" });
          }}
        />
      );
  }
}
