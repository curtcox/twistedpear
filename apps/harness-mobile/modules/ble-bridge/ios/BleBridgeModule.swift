import ExpoModulesCore
import Foundation

public final class TwistedPearBleBridgeModule: Module {
  private var bridge: BleBridge?

  public func definition() -> ModuleDefinition {
    Name("TwistedPearBleBridge")

    Events("onData", "onConnect", "onDisconnect", "onError", "onPeerDiscovered")

    OnDestroy {
      self.stopBridge()
    }

    AsyncFunction("start") { (identityHash: Data) -> Bool in
      self.startBridge(identityHash: identityHash)
    }

    AsyncFunction("stop") { () -> Bool in
      self.stopBridge()
      return true
    }

    AsyncFunction("write") { (data: Data) -> Bool in
      self.writeBridge(data)
    }

    Function("isConnected") { () -> Bool in
      self.bridge?.isConnected() ?? false
    }

    Function("getMtu") { () -> Int in
      self.bridge?.getMtu() ?? BleBridgeSpec.defaultMtu
    }

    Function("shouldActAsCentral") { (localHash: Data, peerHash: Data) -> Bool in
      Self.shouldActAsCentral(localHash: localHash, peerHash: peerHash)
    }
  }

  private func startBridge(identityHash: Data) -> Bool {
    guard identityHash.count == BleBridgeSpec.identityBeaconSize else {
      sendEvent("onError", ["message": "identity hash must be 16 bytes"])
      return false
    }

    let active = bridge ?? BleBridge()
    bridge = active

    active.listener = BridgeListener(module: self)
    active.setIdentityHash(identityHash)
    active.start()
    return true
  }

  private func stopBridge() {
    bridge?.stop()
    bridge?.listener = nil
    bridge = nil
  }

  private func writeBridge(_ data: Data) -> Bool {
    guard let bridge, bridge.isConnected() else {
      sendEvent("onError", ["message": "BLE pipe is not connected"])
      return false
    }

    bridge.write(data)
    return true
  }

  private static func shouldActAsCentral(localHash: Data, peerHash: Data) -> Bool {
    guard
      localHash.count == BleBridgeSpec.identityBeaconSize,
      peerHash.count == BleBridgeSpec.identityBeaconSize
    else {
      return false
    }

    return BleBridgeSpec.shouldActAsCentral(localHash: localHash, peerHash: peerHash)
  }

  private final class BridgeListener: BleBridge.Listener {
    private weak var module: TwistedPearBleBridgeModule?

    init(module: TwistedPearBleBridgeModule) {
      self.module = module
    }

    func onData(_ data: Data) {
      module?.sendEvent("onData", ["data": data])
    }

    func onConnect() {
      module?.sendEvent("onConnect", ["mtu": module?.bridge?.getMtu() ?? BleBridgeSpec.defaultMtu])
    }

    func onDisconnect() {
      module?.sendEvent("onDisconnect", [:])
    }

    func onError(_ message: String) {
      module?.sendEvent("onError", ["message": message])
    }

    func onPeerDiscovered(peerIdentityHash: Data, deviceAddress: String) {
      module?.sendEvent(
        "onPeerDiscovered",
        [
          "peerIdentityHash": peerIdentityHash,
          "deviceAddress": deviceAddress
        ]
      )
    }
  }
}
