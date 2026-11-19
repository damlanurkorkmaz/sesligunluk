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
import { LocalNotifications } from "@capacitor/local-notifications";
import { loadSettings, saveSettings } from "@/lib/settings";
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
  const [name, setName] = useState("");

  const refresh = useCallback(async () => setEntries(await listEntries()), []);
  const refreshSettings = useCallback(async () => setName((await loadSettings()).name), []);

  useEffect(() => {
    (async () => {
      const { value } = await Preferences.get({ key: ONBOARDED_KEY });
      await refresh();
      const st = await loadSettings();
      setName(st.name);
      if (st.lockOn) setLocked(true);
      setRoute(value ? { name: "today" } : { name: "onboarding" });
    })();
  }, [refresh]);

  // Hatırlatma bildirimine dokununca doğrudan Kayıt ekranı (kilitliyse kilit açılınca).
  useEffect(() => {
    let remove: (() => void) | undefined;
    LocalNotifications.addListener("localNotificationActionPerformed", async (ev) => {
      if (ev.notification.extra?.action !== "record") return;
      const { value } = await Preferences.get({ key: ONBOARDED_KEY });
      if (!value) return;
      const todayDone = (await listEntries()).some((e) => e.date === dayKey());
      setRoute(todayDone ? { name: "today" } : { name: "record" });
    })
      .then((h) => (remove = () => void h.remove()))
      .catch(() => undefined);
    return () => remove?.();
  }, []);

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
  const goTab = (t: Tab) => {
    if (t === "today") void refreshSettings(); // Ayarlar'da isim değişmiş olabilir
    setRoute(t === "journal" ? { name: "journal" } : { name: t });
  };

  if (locked && route.name !== "loading" && route.name !== "onboarding") return <LockScreen name={name} onUnlock={() => setLocked(false)} />;

  switch (route.name) {
    case "loading":
      return null;
    case "onboarding":
      return (
        <OnboardingScreen
          onDone={async (st) => {
            await saveSettings(st);
            await Preferences.set({ key: ONBOARDED_KEY, value: "1" });
            setName(st.name);
            setRoute({ name: "today" });
          }}
        />
      );
    case "today":
      return (
        <TodayScreen
          entries={entries}
          name={name}
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
          name={name}
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
