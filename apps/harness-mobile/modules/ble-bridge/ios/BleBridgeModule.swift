import ExpoModulesCore
import Foundation

public final class TwistedPearBleBridgeModule: Module {
  private var bridge: BleBridge?

  public func definition() -> ModuleDefinition {
    Name("TwistedPearBleBridge")

    Events("onData", "onConnect", "onDisconnect", "onError", "onPeerDiscovered")

    OnDestroy {
      self.bridge?.stop()
      self.bridge?.listener = nil
      self.bridge = nil
    }

    AsyncFunction("start") { (identityHash: Data) -> Bool in
      guard identityHash.count == BleBridgeSpec.identityBeaconSize else {
        self.sendEvent("onError", ["message": "identity hash must be 16 bytes"])
        return false
      }

      let active = self.bridge ?? BleBridge()
      self.bridge = active

      active.listener = BridgeListener(module: self)
      active.setIdentityHash(identityHash)
      active.start()
      return true
    }

    AsyncFunction("stop") { () -> Bool in
      self.bridge?.stop()
      self.bridge?.listener = nil
      self.bridge = nil
      return true
    }

    AsyncFunction("write") { (data: Data) -> Bool in
      guard let bridge = self.bridge else {
        self.sendEvent("onError", ["message": "BLE pipe is not connected"])
        return false
      }

      if !bridge.isConnected() {
        self.sendEvent("onError", ["message": "BLE pipe is not connected"])
        return false
      }

      bridge.write(data)
      return true
    }

    Function("isConnected") { () -> Bool in
      self.bridge?.isConnected() ?? false
    }

    Function("getMtu") { () -> Int in
      self.bridge?.getMtu() ?? BleBridgeSpec.defaultMtu
    }

    Function("shouldActAsCentral") { (localHash: Data, peerHash: Data) -> Bool in
      guard
        localHash.count == BleBridgeSpec.identityBeaconSize,
        peerHash.count == BleBridgeSpec.identityBeaconSize
      else {
        return false
      }

      return BleBridgeSpec.shouldActAsCentral(localHash: localHash, peerHash: peerHash)
    }
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
