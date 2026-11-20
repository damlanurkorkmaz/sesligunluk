import { Preferences } from "@capacitor/preferences";
import { GunlukNative, type StoreProduct } from "./native";

/**
 * Premium: Apple StoreKit 2 ile, sunucusuz. Ürünler App Store Connect'te tanımlanır:
 * yıllık ve aylık otomatik yenilenen abonelik (aynı abonelik grubunda), ömür boyu tek seferlik.
 */
export const PRODUCTS = {
  yearly: "com.damlanur.sesligunluk.premium.yearly",
  monthly: "com.damlanur.sesligunluk.premium.monthly",
  lifetime: "com.damlanur.sesligunluk.premium.lifetime",
} as const;
export type PlanKey = keyof typeof PRODUCTS;

const CACHE_KEY = "premium.v1";
const TEST_KEY = "premium.test.v1";

/**
 * Test araçları (Premium'u test et, mektubu şimdi yaz). App Store incelemesi de sandbox'ta
 * çalıştığı için yayın sürümünde KAPALI olmalı. Tekrar denemek için true yap.
 */
export const TEST_TOOLS_ENABLED = false;

/** TestFlight sürümü mü? (App Store sürümünde her zaman false) */
export async function isTestBuild(): Promise<boolean> {
  if (!TEST_TOOLS_ENABLED) return false;
  try {
    return (await GunlukNative.isTestBuild()).test;
  } catch {
    return false;
  }
}

/** Test anahtarı: yalnızca TestFlight'ta işe yarar; App Store sürümünde yok sayılır. */
export async function testPremiumOn(): Promise<boolean> {
  if ((await Preferences.get({ key: TEST_KEY })).value !== "1") return false;
  return isTestBuild();
}

export async function setTestPremium(on: boolean): Promise<void> {
  await Preferences.set({ key: TEST_KEY, value: on ? "1" : "0" });
}

/** App Store'a ulaşılamazsa (ör. çevrimdışı) gösterilecek fiyatlar. */
const FALLBACK: Record<PlanKey, StoreProduct> = {
  yearly: { id: PRODUCTS.yearly, price: "499,99 TL", priceValue: 499.99, period: "year", trialDays: 14, eligibleForTrial: true },
  monthly: { id: PRODUCTS.monthly, price: "99,99 TL", priceValue: 99.99, period: "month" },
  lifetime: { id: PRODUCTS.lifetime, price: "1.299,99 TL", priceValue: 1299.99, period: "lifetime" },
};

function hasPremium(active: string[]): boolean {
  const ids = Object.values(PRODUCTS) as string[];
  return active.some((a) => ids.includes(a));
}

async function cache(v: boolean) {
  await Preferences.set({ key: CACHE_KEY, value: v ? "1" : "0" });
}

/** Önce önbellek (hızlı açılış), sonra App Store'dan gerçek durum. */
export async function cachedPremium(): Promise<boolean> {
  return (await Preferences.get({ key: CACHE_KEY })).value === "1";
}

export async function checkPremium(): Promise<boolean> {
  if (await testPremiumOn()) return true;
  try {
    const { active } = await GunlukNative.getEntitlements();
    const v = hasPremium(active);
    await cache(v);
    return v;
  } catch {
    return cachedPremium();
  }
}

export async function loadPlans(): Promise<Record<PlanKey, StoreProduct>> {
  try {
    const { products } = await GunlukNative.getProducts();
    const by = (id: string) => products.find((p) => p.id === id);
    return {
      yearly: by(PRODUCTS.yearly) ?? FALLBACK.yearly,
      monthly: by(PRODUCTS.monthly) ?? FALLBACK.monthly,
      lifetime: by(PRODUCTS.lifetime) ?? FALLBACK.lifetime,
    };
  } catch {
    return FALLBACK;
  }
}

export type BuyResult = "purchased" | "cancelled" | "pending" | "failed";

export async function buy(plan: PlanKey): Promise<BuyResult> {
  try {
    const r = await GunlukNative.purchase({ productId: PRODUCTS[plan] });
    if (r.status === "purchased") {
      await cache(true);
      return "purchased";
    }
    return r.status === "unknown" ? "failed" : r.status;
  } catch {
    return "failed";
  }
}

export async function restore(): Promise<boolean> {
  try {
    const { active } = await GunlukNative.restorePurchases();
    const v = hasPremium(active);
    await cache(v);
    return v;
  } catch {
    return cachedPremium();
  }
}

/** Yıllık planın aylık karşılığı, ör. "41,67 TL". */
export function perMonth(p: StoreProduct): string {
  const v = p.priceValue / 12;
  const cur = p.price.replace(/[\d.,\s]/g, "").trim() || "TL";
  return `${v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;
}
