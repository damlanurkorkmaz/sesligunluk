"use client";

import { useCallback, useEffect, useState } from "react";
import { Preferences } from "@capacitor/preferences";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { TodayScreen, PROMPTS } from "@/components/TodayScreen";
import { RecordScreen } from "@/components/RecordScreen";
import { DetailScreen, type Pending } from "@/components/DetailScreen";
import { CalendarScreen } from "@/components/CalendarScreen";
import { type Entry, listEntries } from "@/lib/entries";
import { dayKey } from "@/lib/dates";

type Route =
  | { name: "loading" }
  | { name: "onboarding" }
  | { name: "today" | "calendar" }
  | { name: "record" }
  | { name: "detail"; date: string; pending: Pending | null; from: "today" | "calendar" };

const ONBOARDED_KEY = "onboarded.v1";

/**
 * Tek sayfalık uygulama: Capacitor içinde sayfa yenilemeden ekranlar arasında geçiş.
 * Ekranlar: Karşılama → Bugün ⇄ Takvim, Bugün → Kayıt → Detay.
 */
export default function App() {
  const [route, setRoute] = useState<Route>({ name: "loading" });
  const [entries, setEntries] = useState<Entry[]>([]);

  const refresh = useCallback(async () => setEntries(await listEntries()), []);

  useEffect(() => {
    (async () => {
      const { value } = await Preferences.get({ key: ONBOARDED_KEY });
      await refresh();
      setRoute(value ? { name: "today" } : { name: "onboarding" });
    })();
  }, [refresh]);

  const prompt = PROMPTS[new Date().getDate() % PROMPTS.length];

  switch (route.name) {
    case "loading":
      return null;
    case "onboarding":
      return (
        <OnboardingScreen
          onDone={async () => {
            await Preferences.set({ key: ONBOARDED_KEY, value: "1" });
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
          onTab={(t) => setRoute({ name: t })}
        />
      );
    case "calendar":
      return <CalendarScreen entries={entries} onOpen={(date) => setRoute({ name: "detail", date, pending: null, from: "calendar" })} onTab={(t) => setRoute({ name: t })} />;
    case "record":
      return (
        <RecordScreen
          prompt={prompt}
          onCancel={() => setRoute({ name: "today" })}
          onDone={(fileName, durationSec) => setRoute({ name: "detail", date: dayKey(), pending: { fileName, durationSec }, from: "today" })}
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
            setRoute({ name: route.from });
          }}
        />
      );
  }
}
