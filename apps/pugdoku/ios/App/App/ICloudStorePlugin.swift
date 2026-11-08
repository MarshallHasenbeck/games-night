import Capacitor
import Foundation

/// Tiny bridge to iCloud key-value storage (NSUbiquitousKeyValueStore) so Pugdoku progress follows the player between their devices.
/// The whole save is a few KB of JSON (the store allows 1 MB), so key-value storage is the right tool: no CloudKit schema, no server.
/// Nothing leaves the user's own iCloud account; if they are signed out the calls still work, they just stay on this device.
@objc(ICloudStorePlugin)
public class ICloudStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ICloudStorePlugin"
    public let jsName = "ICloudStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
    ]

    private let store = NSUbiquitousKeyValueStore.default

    public override func load() {
        NotificationCenter.default.addObserver(
            self, selector: #selector(changedExternally(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification, object: store)
        store.synchronize()
    }

    deinit { NotificationCenter.default.removeObserver(self) }

    /// Another device wrote something: tell the web layer which keys changed so it can merge.
    @objc private func changedExternally(_ note: Notification) {
        let keys = (note.userInfo?[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String]) ?? []
        notifyListeners("change", data: ["keys": keys])
    }

    /// `signedIn` = the user has an iCloud account on this device (so changes can sync).
    @objc func available(_ call: CAPPluginCall) {
        call.resolve(["signedIn": FileManager.default.ubiquityIdentityToken != nil])
    }

    @objc func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { return call.reject("key is required") }
        if let value = store.string(forKey: key) { call.resolve(["value": value]) } else { call.resolve() }
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value") else { return call.reject("key and value are required") }
        store.set(value, forKey: key)
        store.synchronize()
        call.resolve()
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { return call.reject("key is required") }
        store.removeObject(forKey: key)
        store.synchronize()
        call.resolve()
    }

    /// Ask iCloud to exchange changes now (it also does so by itself, just not on a schedule we control).
    @objc func sync(_ call: CAPPluginCall) {
        store.synchronize()
        call.resolve()
    }
}
