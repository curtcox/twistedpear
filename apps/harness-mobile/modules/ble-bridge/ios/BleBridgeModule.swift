import CoreBluetooth
import ExpoModulesCore
import Foundation

public final class TwistedPearBleBridgeModule: Module {
  private var connected = false
  private var mtu = 185

  public func definition() -> ModuleDefinition {
    Name("TwistedPearBleBridge")

    Events("onData", "onConnect", "onDisconnect", "onError", "onPeerDiscovered")

    AsyncFunction("start") { (_ identityHash: Data) -> Bool in
      guard identityHash.count == 16 else {
        self.sendEvent("onError", ["message": "identity hash must be 16 bytes"])
        return false
      }

      self.connected = false
      return true
    }

    AsyncFunction("stop") { () -> Bool in
      self.connected = false
      self.sendEvent("onDisconnect", [:])
      return true
    }

    AsyncFunction("write") { (_ data: Data) -> Bool in
      if !self.connected {
        self.sendEvent("onError", ["message": "BLE pipe is not connected"])
        return false
      }

      return true
    }

    Function("isConnected") { () -> Bool in
      return self.connected
    }

    Function("getMtu") { () -> Int in
      return self.mtu
    }

    Function("shouldActAsCentral") { (_ localHash: Data, _ peerHash: Data) -> Bool in
      return localHash.lexicographicallyPrecedes(peerHash)
    }
  }
}
