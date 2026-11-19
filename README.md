# Gün Notu

Günde 60 saniyelik, Türkçe, tamamen cihazda çalışan sesli günlük. Ses kaydedilir, iPhone'un kendi konuşma tanımasıyla yazıya çevrilir ve Apple'ın cihaz içi modeliyle (Foundation Models) kısa bir özet ve ruh hali çıkarılır. Sunucu yok, ses telefondan çıkmaz.

> "Gün Notu" geçici çalışma adıdır; depo adı `sesligunluk`. Bundle ID (`com.damlanur.sesligunluk`) isimden bağımsızdır ve değişmez. Ad değişirse: `src/app.config.ts`, `capacitor.config.ts` (appId, appName), `ios/App/App/Info.plist` (CFBundleDisplayName).

## Teknoloji

| Katman | Ne |
| --- | --- |
| Arayüz | Next.js 16 (statik export, tek sayfa), React 19 |
| Yerel kabuk | Capacitor 8, iOS, Swift Package Manager |
| Yerel eklenti | `ios/App/App/GunlukNativePlugin.swift` (kayıt, yazıya çevirme, özet) |
| Saklama | `@capacitor/preferences` (JSON); ileride SQLite |
| Derleme | Codemagic → TestFlight (`codemagic.yaml`) |
| Font | Plus Jakarta Sans (arayüz), Lora (defter yazısı); ikisi de yerel, `@fontsource-variable` |

## Geliştirme

```bash
npm install
npm run dev          # http://localhost:3000 — tarayıcıda sahte eklentiyle çalışır
npm run build        # out/ klasörüne statik çıktı
npx cap sync ios     # out/ klasörünü iOS projesine kopyalar
```

Tarayıcıda kayıt, yazıya çevirme ve özet **sahtedir** (`src/lib/native.ts` içindeki `GunlukNativeWeb`). Gerçek davranış yalnızca iPhone'da görülür.

## Yerel eklenti: GunlukNative

| Metot | Açıklama |
| --- | --- |
| `requestPermissions()` | Mikrofon + konuşma tanıma izni |
| `startRecording({ maxSeconds })` | AAC/m4a kayıt, `Application Support/recordings` |
| `getLevel()` | 0–1 ses seviyesi, ses dalgası için ~10 kez/sn |
| `stopRecording()` / `cancelRecording()` | Kaydı bitir / sil |
| `transcribe({ fileName })` | `SFSpeechURLRecognitionRequest`, tr-TR, `requiresOnDeviceRecognition = true` |
| `isAIAvailable()` | Foundation Models hazır mı, Türkçe destekleniyor mu |
| `summarize({ text })` | `@Generable DaySummary` → özet, ruh hali, en fazla 3 etiket |
| `deleteAudio({ fileName })` | Ses dosyasını sil |
| `getAudioPath({ fileName })` | Oynatma için tam yol (`Capacitor.convertFileSrc` ile kullanılır) |
| `biometryType()` / `authenticate()` | Face ID / Touch ID, olmazsa cihaz şifresi |

Eklenti `MainViewController.swift` içinde köprüye kaydedilir. Uygulama iOS 17+ çalışır; Foundation Models iOS 26+ ve Apple Intelligence destekli cihazlarda (iPhone 15 Pro ve sonrası) devreye girer, `-weak_framework FoundationModels` ile eski sürümlerde çökmez.

## Derleme (Codemagic)

1. App Store Connect'te `com.damlanur.sesligunluk` Bundle ID ile uygulamayı oluştur.
2. Codemagic > Integrations'a App Store Connect API anahtarını **GunNotuASC** adıyla ekle.
3. `codemagic.yaml` içindeki `APP_STORE_APPLE_ID` değerini doldur.
4. `main` dalına her push TestFlight'a yeni bir build gönderir.

Xcode 26 (iOS 26 SDK) gerekir; yaml `xcode: latest` kullanır.

## İlk hafta testi (yol haritası: Doğrulama)

TestFlight build'ini iPhone 15 Pro veya sonrasında, sistem dili Türkçe iken dene:

- [ ] Mikrofon ve konuşma tanıma izinleri doğru metinlerle soruluyor
- [ ] 60 sn dolunca kayıt kendiliğinden bitiyor
- [ ] Türkçe yazıya çevirme cihaz içinde çalışıyor (uçak modunda da dene)
- [ ] Özet Türkçe, 2 cümleyi geçmiyor, uydurma bilgi içermiyor
- [ ] Ruh hali seçimi makul (5 farklı günle dene)
- [ ] Apple Intelligence kapalıyken özet olmadan sorunsuz çalışıyor

Özet kalitesi yetersizse plan B: yapay zekâ yalnızca etiket önerir, ruh halini kullanıcı seçer.

## Henüz yok

Ay sonu kartı, Premium/RevenueCat ve 7 gün sonra özet kilidi, karanlık mod, SQLite + arama, iCloud yedeği, uygulama ikonu ve adı.

## Ekranlar

Giriş (deri kapak → kapak açılır → isim → hatırlatma saati → gizlilik ve izinler; yalnızca ilk açılışta), Bugün (saate ve duruma göre: isimle selam, sabah dünün kartı, geç saatte seri uyarısı, kayıt yapılmışsa günün sayfası), Kayıt, Kayıt detayı (ses oynatıcı dahil), Günlüğüm (defter görünümü: tarih şeridi, kaydırarak sayfa çevirme, ay seçici), Ayarlar (ad, hatırlatma saati, Face ID kilidi, metinleri dışa aktarma, tüm verileri silme, cihaz durumu), Kilit (kapalı defter kapağı; Face ID sonrası kapak açılır). Akşam hatırlatmasına dokununca doğrudan Kayıt ekranı açılır.
