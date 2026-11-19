import UIKit
import Capacitor

/// Uygulamaya özel (yerel) eklentileri köprüye kaydeder.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(GunlukNativePlugin())
    }
}
