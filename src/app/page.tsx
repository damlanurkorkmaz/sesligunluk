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
import { cachedPremium, checkPremium } from "@/lib/premium";
import { clearLetter } from "@/lib/letters";
import { type CoverLook, DEFAULT_LOOK, effectiveLook, lookTint } from "@/lib/themes";
import { Paywall } from "@/components/Paywall";
import { CoverPicker } from "@/components/CoverPicker";
import { MonthLetterScreen } from "@/components/MonthLetter";
import { BackupScreen } from "@/components/BackupScreen";
import { type Entry, listEntries } from "@/lib/entries";
import { dayKey } from "@/lib/dates";

type Route =
  | { name: "loading" }
  | { name: "onboarding" }
  | { name: "today" | "settings" }
  | { name: "journal"; date?: string }
  | { name: "record" }
  | { name: "detail"; date: string; pending: Pending | null; from: "today" | "journal" }
  | { name: "paywall"; back: Route; reason?: string }
  | { name: "cover" }
  | { name: "letter"; month: string; back: Route }
  | { name: "backup" };

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
  const [premium, setPremium] = useState(false);
  const [look, setLook] = useState<CoverLook>(DEFAULT_LOOK);
  const [volumeLooks, setVolumeLooks] = useState<Record<string, CoverLook>>({});
  // Kapak seçicide Premium bir kapak seçilip satış ekranına gidilince seçim kaybolmasın
  const [coverDraft, setCoverDraft] = useState<CoverLook | null>(null);

  const refresh = useCallback(async () => setEntries(await listEntries()), []);
  const refreshSettings = useCallback(async () => {
    const st = await loadSettings();
    setName(st.name);
    setLook(st.look);
    setVolumeLooks(st.volumeLooks);
  }, []);

  /** Bu ayın defteri hangi kapaktaysa kaydet: ay bitince rafta o kapakla durur. */
  const rememberMonthLook = useCallback(async () => {
    const st = await loadSettings();
    const key = dayKey().slice(0, 7);
    if (JSON.stringify(st.volumeLooks[key]) === JSON.stringify(st.look)) return;
    const next = { ...st, volumeLooks: { ...st.volumeLooks, [key]: st.look } };
    await saveSettings(next);
    setVolumeLooks(next.volumeLooks);
  }, []);

  useEffect(() => {
    (async () => {
      const { value } = await Preferences.get({ key: ONBOARDED_KEY });
      await refresh();
      const st = await loadSettings();
      setName(st.name);
      setLook(st.look);
      setVolumeLooks(st.volumeLooks);
      setPremium(await cachedPremium());
      void checkPremium().then(setPremium);
      void rememberMonthLook();
      if (st.lockOn) setLocked(true);
      setRoute(value ? { name: "today" } : { name: "onboarding" });
    })();
  }, [refresh, rememberMonthLook]);

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

  // Seçili kapağın tonu tüm deri yüzeylere (Bugün başlığı, sayfa çerçevesi) yayılır.
  const shownLook = effectiveLook(look, premium);
  const tint = lookTint(shownLook);
  useEffect(() => {
    document.documentElement.style.setProperty("--lt", tint);
  }, [tint]);

  const openPaywall = (back: Route, reason?: string) => setRoute({ name: "paywall", back, reason });

  const prompt = PROMPTS[new Date().getDate() % PROMPTS.length];
  const goTab = (t: Tab) => {
    if (t === "today") void refreshSettings(); // Ayarlar'da isim değişmiş olabilir
    setRoute(t === "journal" ? { name: "journal" } : { name: t });
  };

  if (locked && route.name !== "loading" && route.name !== "onboarding") return <LockScreen name={name} look={shownLook} onUnlock={() => setLocked(false)} />;

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
          look={shownLook}
          volumeLooks={volumeLooks}
          premium={premium}
          onLetter={(month) => setRoute({ name: "letter", month, back: { name: "journal" } })}
          initialDate={route.date}
          onEdit={(date) => setRoute({ name: "detail", date, pending: null, from: "journal" })}
          onRecord={() => setRoute({ name: "record" })}
          onTab={goTab}
        />
      );
    case "settings":
      return (
        <SettingsScreen
          entries={entries}
          premium={premium}
          look={shownLook}
          onTab={goTab}
          onDataCleared={refresh}
          onPremium={() => openPaywall({ name: "settings" })}
          onCover={() => setRoute({ name: "cover" })}
          onPremiumChanged={setPremium}
          onTestLetter={async () => {
            const month = dayKey().slice(0, 7);
            await clearLetter(month); // her denemede yeniden yazılsın
            setRoute({ name: "letter", month, back: { name: "settings" } });
          }}
          onBackup={() => (premium ? setRoute({ name: "backup" }) : openPaywall({ name: "settings" }, "backup"))}
        />
      );
    case "paywall":
      return (
        <Paywall
          name={name}
          look={shownLook}
          reason={route.reason}
          onClose={() => setRoute(route.back)}
          onUnlocked={() => {
            setPremium(true);
            setRoute(route.back);
          }}
        />
      );
    case "cover":
      return (
        <CoverPicker
          name={name}
          premium={premium}
          initial={coverDraft ?? look}
          onBack={() => {
            setCoverDraft(null);
            setRoute({ name: "settings" });
          }}
          onLocked={(l) => {
            setCoverDraft(l);
            openPaywall({ name: "cover" }, "cover");
          }}
          onSave={async (l) => {
            setCoverDraft(null);
            const st = await loadSettings();
            await saveSettings({ ...st, look: l });
            setLook(l);
            await rememberMonthLook();
            setRoute({ name: "settings" });
          }}
        />
      );
    case "letter":
      return (
        <MonthLetterScreen
          month={route.month}
          entries={entries}
          name={name}
          premium={premium}
          onBack={() => setRoute(route.back)}
          onUnlock={() => openPaywall({ name: "letter", month: route.month, back: route.back }, "letter")}
        />
      );
    case "backup":
      return <BackupScreen entries={entries} onBack={() => setRoute({ name: "settings" })} onRestored={refresh} />;
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
