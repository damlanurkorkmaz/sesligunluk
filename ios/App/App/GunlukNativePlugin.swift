import Foundation
import Capacitor
import AVFoundation
import Speech
import LocalAuthentication
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
    ]

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
        request.shouldReportPartialResults = false
        if #available(iOS 16.0, *) {
            request.addsPunctuation = true
        }

        var finished = false
        recognitionTask = recognizer.recognitionTask(with: request) { result, error in
            if finished { return }
            if let error = error {
                finished = true
                call.reject("Yazıya çevrilemedi: \(error.localizedDescription)", "transcribe_failed", error)
                return
            }
            if let result = result, result.isFinal {
                finished = true
                call.resolve(["text": result.bestTranscription.formattedString])
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
