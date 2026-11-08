import UIKit
import Capacitor

/// The web view's controller. Local (in-app) Capacitor plugins have to be registered by hand.
class PugViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(ICloudStorePlugin())
    }
}
