import Foundation
import Capacitor
import AVFoundation
import Speech
import LocalAuthentication
import StoreKit
#if canImport(FoundationModels)
import FoundationModels
#endif

/// Uygulamanın tüm yerel işi bu eklentide: ses kaydı, cihaz içi yazıya çevirme ve cihaz içi özet.
/// Hiçbir veri cihazdan çıkmaz.
@objc(GunlukNativePlugin)
public class GunlukNativePlugin: CAPPlugin, CAPBridgedPlugin, AVAudioRecorderDelegate {
    public let identifier = "GunlukNativePlugin"
    public let jsName = "GunlukNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLevel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "transcribe", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAIAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "summarize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteAudio", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAudioPath", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "biometryType", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getEntitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "monthLetter", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "icloudStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "backupToICloud", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restoreFromICloud", returnType: CAPPluginReturnPromise),
    ]

    private var transactionListener: Task<Void, Never>?

    override public func load() {
        // Yenilemeler, iadeler ve başka cihazdaki satın almalar burada gelir; doğrulanmış olanları kapat.
        transactionListener = Task.detached {
            for await result in Transaction.updates {
                if case .verified(let transaction) = result {
                    await transaction.finish()
                }
            }
        }
    }

    private var recorder: AVAudioRecorder?
    private var currentFileName: String?
    private var lastDuration: Double = 0
    private var recognitionTask: SFSpeechRecognitionTask?

    // MARK: - Dosya yolları

    /// Ses dosyaları Application Support/recordings altında. JS tarafı yalnızca dosya adını saklar,
    /// çünkü uygulama güncellendiğinde konteyner yolu değişebilir.
    private func recordingsDirectory() throws -> URL {
        let base = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        let dir = base.appendingPathComponent("recordings", isDirectory: true)
        if !FileManager.default.fileExists(atPath: dir.path) {
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        }
        return dir
    }

    private func fileURL(_ name: String) throws -> URL {
        // Yol enjeksiyonunu önle: yalnızca düz dosya adı kabul edilir.
        let clean = (name as NSString).lastPathComponent
        return try recordingsDirectory().appendingPathComponent(clean)
    }

    // MARK: - İzinler

    private func micStatus() -> String {
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted: return "granted"
        case .denied: return "denied"
        default: return "prompt"
        }
    }

    private func speechStatus() -> String {
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized: return "granted"
        case .denied, .restricted: return "denied"
        default: return "prompt"
        }
    }

    @objc override public func checkPermissions(_ call: CAPPluginCall) {
        call.resolve(["microphone": micStatus(), "speech": speechStatus()])
    }

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        AVAudioSession.sharedInstance().requestRecordPermission { _ in
            SFSpeechRecognizer.requestAuthorization { _ in
                DispatchQueue.main.async {
                    call.resolve(["microphone": self.micStatus(), "speech": self.speechStatus()])
                }
            }
        }
    }

    // MARK: - Kayıt

    @objc func startRecording(_ call: CAPPluginCall) {
        let maxSeconds = call.getDouble("maxSeconds") ?? 60
        DispatchQueue.main.async {
            do {
                self.recorder?.stop()
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(.playAndRecord, mode: .spokenAudio, options: [.defaultToSpeaker, .allowBluetooth])
                try session.setActive(true)

                let name = "\(UUID().uuidString).m4a"
                let url = try self.fileURL(name)
                let settings: [String: Any] = [
                    AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                    AVSampleRateKey: 44100,
                    AVNumberOfChannelsKey: 1,
                    AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
                ]
                let rec = try AVAudioRecorder(url: url, settings: settings)
                rec.delegate = self
                rec.isMeteringEnabled = true
                guard rec.record(forDuration: maxSeconds) else {
                    call.reject("Kayıt başlatılamadı", "record_failed")
                    return
                }
                self.recorder = rec
                self.currentFileName = name
                self.lastDuration = 0
                call.resolve(["fileName": name])
            } catch {
                call.reject("Kayıt başlatılamadı: \(error.localizedDescription)", "record_failed", error)
            }
        }
    }

    /// 0...1 arası anlık ses seviyesi; ses dalgası çizimi için JS tarafından ~10 kez/sn çağrılır.
    @objc func getLevel(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let rec = self.recorder, rec.isRecording else {
                call.resolve(["level": 0, "isRecording": false, "elapsed": self.lastDuration])
                return
            }
            rec.updateMeters()
            let db = Double(rec.averagePower(forChannel: 0)) // -160...0
            let level = max(0, min(1, (db + 50) / 50))
            call.resolve(["level": level, "isRecording": true, "elapsed": rec.currentTime])
        }
    }

    @objc func stopRecording(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let name = self.currentFileName else {
                call.reject("Aktif kayıt yok", "no_recording")
                return
            }
            if let rec = self.recorder, rec.isRecording {
                self.lastDuration = rec.currentTime
                rec.stop()
            }
            self.recorder = nil
            self.currentFileName = nil
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            call.resolve(["fileName": name, "durationSec": self.lastDuration])
        }
    }

    @objc func cancelRecording(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.recorder?.stop()
            self.recorder?.deleteRecording()
            self.recorder = nil
            self.currentFileName = nil
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            call.resolve()
        }
    }

    /// Süre dolup kayıt kendiliğinden bittiğinde süreyi sakla; JS getLevel ile isRecording=false görür.
    public func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        if lastDuration == 0 {
            let asset = AVURLAsset(url: recorder.url)
            lastDuration = CMTimeGetSeconds(asset.duration)
        }
    }

    @objc func deleteAudio(_ call: CAPPluginCall) {
        guard let name = call.getString("fileName") else {
            call.reject("fileName gerekli", "bad_args")
            return
        }
        do {
            let url = try fileURL(name)
            if FileManager.default.fileExists(atPath: url.path) {
                try FileManager.default.removeItem(at: url)
            }
            call.resolve()
        } catch {
            call.reject("Silinemedi", "delete_failed", error)
        }
    }

    /// Oynatma için dosyanın tam yolu. JS tarafı Capacitor.convertFileSrc ile WebView'e verir.
    @objc func getAudioPath(_ call: CAPPluginCall) {
        guard let name = call.getString("fileName") else {
            call.reject("fileName gerekli", "bad_args")
            return
        }
        do {
            let url = try fileURL(name)
            guard FileManager.default.fileExists(atPath: url.path) else {
                call.reject("Dosya bulunamadı", "file_missing")
                return
            }
            // Sessiz modda da kayıt duyulsun diye oynatma kategorisine geç.
            try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio)
            try? AVAudioSession.sharedInstance().setActive(true)
            call.resolve(["path": url.path])
        } catch {
            call.reject("Dosya bulunamadı", "file_missing", error)
        }
    }

    // MARK: - Face ID / Touch ID kilidi

    @objc func biometryType(_ call: CAPPluginCall) {
        let ctx = LAContext()
        var err: NSError?
        let can = ctx.canEvaluatePolicy(.deviceOwnerAuthentication, error: &err)
        var type = "none"
        switch ctx.biometryType {
        case .faceID: type = "faceID"
        case .touchID: type = "touchID"
        default: type = can ? "passcode" : "none"
        }
        call.resolve(["type": type, "available": can])
    }

    /// Biyometri başarısız olursa cihaz şifresine düşer (deviceOwnerAuthentication).
    @objc func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Günlüğünü açmak için kimliğini doğrula"
        let ctx = LAContext()
        ctx.localizedCancelTitle = "Vazgeç"
        ctx.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
            DispatchQueue.main.async {
                if success {
                    call.resolve(["success": true])
                } else {
                    call.reject(error?.localizedDescription ?? "Doğrulanamadı", "auth_failed")
                }
            }
        }
    }

    // MARK: - Yazıya çevirme (cihaz içi, tr-TR)

    @objc func transcribe(_ call: CAPPluginCall) {
        guard let name = call.getString("fileName") else {
            call.reject("fileName gerekli", "bad_args")
            return
        }
        let locale = Locale(identifier: call.getString("locale") ?? "tr-TR")
        guard let recognizer = SFSpeechRecognizer(locale: locale) else {
            call.reject("Bu dil desteklenmiyor", "locale_unsupported")
            return
        }
        guard recognizer.supportsOnDeviceRecognition else {
            // Gizlilik vaadi gereği sunucuya düşmüyoruz.
            call.reject("Cihaz içi Türkçe tanıma bu cihazda yok", "on_device_unavailable")
            return
        }
        let url: URL
        do { url = try fileURL(name) } catch {
            call.reject("Dosya bulunamadı", "file_missing", error)
            return
        }
        let request = SFSpeechURLRecognitionRequest(url: url)
        request.requiresOnDeviceRecognition = true
        // Ara sonuçları da alıyoruz: cihaz içi tanıma, konuşmadaki 1–2 saniyelik
        // duraklamalarda kaydı parçalara bölüyor ve yeni parçaya geçince önceki
        // metni sonuçtan siliyor (iOS 17/18'de bilinen davranış). Sadece son sonucu
        // alırsak uzun kayıtlarda yalnızca son parça kalıyor. Bu yüzden her parçayı
        // bitince biriktirip sonunda birleştiriyoruz.
        request.shouldReportPartialResults = true
        request.taskHint = .dictation
        if #available(iOS 16.0, *) {
            request.addsPunctuation = true
        }

        var finished = false
        var committed: [String] = []
        var current = ""
        var currentSegments = 0

        func commitCurrent() {
            let t = current.trimmingCharacters(in: .whitespacesAndNewlines)
            if !t.isEmpty && committed.last != t {
                committed.append(t)
            }
            current = ""
            currentSegments = 0
        }

        func fullText() -> String {
            var parts = committed
            let tail = current.trimmingCharacters(in: .whitespacesAndNewlines)
            if !tail.isEmpty && parts.last != tail { parts.append(tail) }
            return parts.joined(separator: " ")
        }

        recognitionTask = recognizer.recognitionTask(with: request) { result, error in
            if finished { return }
            if let result = result {
                let text = result.bestTranscription.formattedString
                let segments = result.bestTranscription.segments.count
                // Sonuç birden çok kısaldıysa tanıyıcı yeni parçaya geçip öncekini silmiştir.
                if currentSegments >= 3 && segments < currentSegments / 2 {
                    commitCurrent()
                }
                if !text.isEmpty {
                    current = text
                    currentSegments = segments
                }
                // Metadata yalnızca bir konuşma parçası tamamlandığında gelir.
                if result.speechRecognitionMetadata != nil {
                    commitCurrent()
                }
                if result.isFinal {
                    finished = true
                    commitCurrent()
                    call.resolve(["text": fullText()])
                    return
                }
            }
            if let error = error {
                finished = true
                // Kayıt sessizlikle bitince "konuşma algılanmadı" hatası gelebiliyor;
                // o ana kadar biriken metin varsa onu kullan.
                let text = fullText()
                if !text.isEmpty {
                    call.resolve(["text": text])
                } else {
                    call.reject("Yazıya çevrilemedi: \(error.localizedDescription)", "transcribe_failed", error)
                }
            }
        }
    }

    // MARK: - Özet (Apple Foundation Models, cihaz içi)

    @objc func isAIAvailable(_ call: CAPPluginCall) {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            let model = SystemLanguageModel.default
            switch model.availability {
            case .available:
                let localeOK = model.supportsLocale(Locale(identifier: "tr_TR"))
                call.resolve(["available": localeOK, "reason": localeOK ? "" : "locale_unsupported"])
            case .unavailable(let reason):
                call.resolve(["available": false, "reason": String(describing: reason)])
            }
            return
        }
        #endif
        call.resolve(["available": false, "reason": "os_too_old"])
    }

    @objc func summarize(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("text gerekli", "bad_args")
            return
        }
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            Task {
                do {
                    let result = try await DaySummarizer.summarize(text)
                    call.resolve(["summary": result.summary, "mood": result.mood, "tags": result.tags])
                } catch {
                    call.reject("Özet çıkarılamadı: \(error.localizedDescription)", "summarize_failed", error)
                }
            }
            return
        }
        #endif
        call.reject("Bu cihazda yapay zekâ özeti yok", "ai_unavailable")
    }
}

#if canImport(FoundationModels)
@available(iOS 26.0, *)
@Generable
struct DaySummary {
    @Guide(description: "Günün en fazla 2 cümlelik Türkçe özeti. Kullanıcıya 'sen' diye hitap et, geçmiş zaman kullan.")
    var summary: String

    @Guide(description: "Günün genel ruh hali", .anyOf(["harika", "iyi", "normal", "yorgun", "zor"]))
    var mood: String

    @Guide(description: "Günde geçen konulardan kısa, küçük harfli Türkçe etiketler (ör. iş, arkadaşlar, spor)", .maximumCount(3))
    var tags: [String]
}

@available(iOS 26.0, *)
enum DaySummarizer {
    static func summarize(_ transcript: String) async throws -> DaySummary {
        let session = LanguageModelSession(instructions: """
        Sen kişisel bir sesli günlüğün yardımcısısın. Kullanıcının o gün anlattıklarını okursun.
        Yalnızca metinde geçenleri kullan, yorum ekleme, tavsiye verme, teşhis koyma.
        Her zaman Türkçe yaz.
        """)
        let response = try await session.respond(
            to: "Bugünkü günlük kaydım:\n\(transcript)",
            generating: DaySummary.self
        )
        return response.content
    }
}
#endif


// MARK: - Premium (StoreKit 2, sunucusuz)

extension GunlukNativePlugin {
    static let productIds: [String] = [
        "com.damlanur.sesligunluk.premium.yearly",
        "com.damlanur.sesligunluk.premium.monthly",
        "com.damlanur.sesligunluk.premium.lifetime",
    ]

    static func days(_ period: Product.SubscriptionPeriod) -> Int {
        switch period.unit {
        case .day: return period.value
        case .week: return period.value * 7
        case .month: return period.value * 30
        case .year: return period.value * 365
        @unknown default: return period.value
        }
    }

    static func activeProductIds() async -> [String] {
        var ids: [String] = []
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result, transaction.revocationDate == nil {
                ids.append(transaction.productID)
            }
        }
        return ids
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        Task {
            do {
                let products = try await Product.products(for: Self.productIds)
                var list: [[String: Any]] = []
                for product in products {
                    var item: [String: Any] = [
                        "id": product.id,
                        "price": product.displayPrice,
                        "priceValue": NSDecimalNumber(decimal: product.price).doubleValue,
                    ]
                    if let sub = product.subscription {
                        switch sub.subscriptionPeriod.unit {
                        case .year: item["period"] = "year"
                        case .month: item["period"] = "month"
                        default: item["period"] = "other"
                        }
                        if let intro = sub.introductoryOffer, intro.paymentMode == .freeTrial {
                            item["trialDays"] = Self.days(intro.period)
                        }
                        item["eligibleForTrial"] = await sub.isEligibleForIntroOffer
                    } else {
                        item["period"] = "lifetime"
                    }
                    list.append(item)
                }
                call.resolve(["products": list])
            } catch {
                call.reject("Ürünler alınamadı: \(error.localizedDescription)", "store_failed", error)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId gerekli", "bad_args")
            return
        }
        Task {
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    call.reject("Ürün bulunamadı", "not_found")
                    return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        call.resolve(["status": "purchased", "active": await Self.activeProductIds()])
                    case .unverified:
                        call.reject("Satın alma doğrulanamadı", "unverified")
                    }
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                case .pending:
                    call.resolve(["status": "pending"])
                @unknown default:
                    call.resolve(["status": "unknown"])
                }
            } catch {
                call.reject("Satın alınamadı: \(error.localizedDescription)", "purchase_failed", error)
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            try? await AppStore.sync()
            call.resolve(["active": await Self.activeProductIds()])
        }
    }

    @objc func getEntitlements(_ call: CAPPluginCall) {
        Task {
            call.resolve(["active": await Self.activeProductIds()])
        }
    }
}

// MARK: - Ayın mektubu (cihaz içi yapay zekâ)

extension GunlukNativePlugin {
    @objc func monthLetter(_ call: CAPPluginCall) {
        let name = call.getString("name") ?? ""
        let month = call.getString("month") ?? ""
        let notes = call.getArray("notes", String.self) ?? []
        guard !notes.isEmpty else {
            call.reject("notes gerekli", "bad_args")
            return
        }
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            Task {
                do {
                    // Cihaz içi modelin bağlamı sınırlı: notları kısaltıp toplamı ~3500 karakterde tut.
                    var joined = ""
                    for (i, note) in notes.enumerated() {
                        let line = "\(i + 1). \(note.prefix(240))\n"
                        if joined.count + line.count > 3500 { break }
                        joined += line
                    }
                    let session = LanguageModelSession(instructions: """
                    Sen kişisel bir sesli günlüğün kendisisin ve ay sonunda sahibine kısa bir mektup yazıyorsun.
                    Yalnızca notlarda geçenleri kullan; uydurma, tavsiye verme, teşhis koyma, yargılama.
                    Sıcak, sade ve samimi ol; "sen" diye hitap et. Türkçe yaz.
                    Mektup 3 ila 5 cümle olsun, ilk satır "Sevgili <ad>," ile başlasın. İmza ekleme.
                    """)
                    let prompt = "Ad: \(name.isEmpty ? "dostum" : name)\nAy: \(month)\nBu ayın günlük notları:\n\(joined)"
                    let response = try await session.respond(to: prompt)
                    call.resolve(["text": response.content])
                } catch {
                    call.reject("Mektup yazılamadı: \(error.localizedDescription)", "letter_failed", error)
                }
            }
            return
        }
        #endif
        call.reject("Bu cihazda yapay zekâ yok", "ai_unavailable")
    }
}

// MARK: - iCloud yedeği (kullanıcının kendi iCloud Drive'ı)

extension GunlukNativePlugin {
    /// iCloud yetkisi (entitlement) yoksa ya da kullanıcı iCloud'a girmemişse nil döner.
    private func backupFolder() -> URL? {
        guard let container = FileManager.default.url(forUbiquityContainerIdentifier: nil) else { return nil }
        let dir = container.appendingPathComponent("Documents/GunNotu", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    @objc func icloudStatus(_ call: CAPPluginCall) {
        DispatchQueue.global(qos: .userInitiated).async {
            let signedIn = FileManager.default.ubiquityIdentityToken != nil
            let available = signedIn && self.backupFolder() != nil
            call.resolve(["available": available, "signedIn": signedIn])
        }
    }

    @objc func backupToICloud(_ call: CAPPluginCall) {
        let json = call.getString("json") ?? "{}"
        let audioFiles = call.getArray("audioFiles", String.self) ?? []
        DispatchQueue.global(qos: .utility).async {
            guard let dir = self.backupFolder() else {
                call.reject("iCloud kullanılamıyor", "icloud_unavailable")
                return
            }
            do {
                var bytes = 0
                let data = Data(json.utf8)
                try data.write(to: dir.appendingPathComponent("entries.json"), options: .atomic)
                bytes += data.count
                let audioDir = dir.appendingPathComponent("recordings", isDirectory: true)
                try FileManager.default.createDirectory(at: audioDir, withIntermediateDirectories: true)
                for name in audioFiles {
                    guard let src = try? self.fileURL(name), FileManager.default.fileExists(atPath: src.path) else { continue }
                    let dst = audioDir.appendingPathComponent(name)
                    if FileManager.default.fileExists(atPath: dst.path) { continue } // ses dosyaları değişmez
                    try FileManager.default.copyItem(at: src, to: dst)
                    bytes += ((try? FileManager.default.attributesOfItem(atPath: src.path)[.size]) as? Int) ?? 0
                }
                let date = ISO8601DateFormatter().string(from: Date())
                call.resolve(["date": date, "bytes": bytes])
            } catch {
                call.reject("Yedeklenemedi: \(error.localizedDescription)", "backup_failed", error)
            }
        }
    }

    @objc func restoreFromICloud(_ call: CAPPluginCall) {
        DispatchQueue.global(qos: .userInitiated).async {
            guard let dir = self.backupFolder() else {
                call.reject("iCloud kullanılamıyor", "icloud_unavailable")
                return
            }
            let file = dir.appendingPathComponent("entries.json")
            // Dosya henüz bu cihaza inmemiş olabilir: indirmeyi başlat ve kısa süre bekle.
            try? FileManager.default.startDownloadingUbiquitousItem(at: file)
            var waited = 0
            while !FileManager.default.fileExists(atPath: file.path) && waited < 20 {
                Thread.sleep(forTimeInterval: 0.5)
                waited += 1
            }
            guard let data = try? Data(contentsOf: file), let json = String(data: data, encoding: .utf8) else {
                call.resolve(["json": NSNull(), "date": NSNull()])
                return
            }
            let audioDir = dir.appendingPathComponent("recordings", isDirectory: true)
            if let names = try? FileManager.default.contentsOfDirectory(atPath: audioDir.path) {
                for name in names where name.hasSuffix(".m4a") {
                    guard let dst = try? self.fileURL(name), !FileManager.default.fileExists(atPath: dst.path) else { continue }
                    let src = audioDir.appendingPathComponent(name)
                    try? FileManager.default.startDownloadingUbiquitousItem(at: src)
                    try? FileManager.default.copyItem(at: src, to: dst)
                }
            }
            let modified = (try? FileManager.default.attributesOfItem(atPath: file.path)[.modificationDate]) as? Date
            call.resolve(["json": json, "date": modified.map { ISO8601DateFormatter().string(from: $0) } ?? NSNull()])
        }
    }
}
