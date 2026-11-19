import { LocalNotifications } from "@capacitor/local-notifications";

const REMINDER_ID = 2100;

/** Her gün aynı saatte tek bir yerel bildirim. Sunucu gerekmez. */
export async function scheduleDailyReminder(hour = 21, minute = 0): Promise<boolean> {
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return false;
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REMINDER_ID,
          title: "Bugün nasıldı?",
          body: "60 saniyede anlat, gerisini biz hallederiz.",
          schedule: { on: { hour, minute }, allowWhileIdle: true },
        },
      ],
    });
    return true;
  } catch {
    return false; // tarayıcıda veya izin yoksa sessizce geç
  }
}
