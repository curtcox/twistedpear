import ExpoModulesCore
import Foundation

public final class TwistedPearMulticastModule: Module {
  private var bridge: MulticastBridge?

  public func definition() -> ModuleDefinition {
    Name("TwistedPearMulticast")

    Events("onPacket", "onNetworkChange")

    AsyncFunction("start") { () -> Bool in
      let active = self.bridge ?? MulticastBridge()
      self.bridge = active

      active.listener = BridgeListener(module: self)
      active.start()

      let interfaces = active.getInterfaces().map { iface in
        [
          "name": iface.name,
          "linkLocalAddress": iface.linkLocalAddress
        ]
      }

      self.sendEvent("onNetworkChange", ["interfaces": interfaces])
      return true
    }

    AsyncFunction("stop") { () -> Bool in
      self.bridge?.stop()
      self.bridge?.listener = nil
      self.bridge = nil
      return true
    }

    Function("getInterfaces") { () -> [[String: String]] in
      self.bridge?.getInterfaces().map { iface in
        [
          "name": iface.name,
          "linkLocalAddress": iface.linkLocalAddress
        ]
      } ?? []
    }

    AsyncFunction("joinGroup") { (ifname: String, groupAddress: String, port: Int) -> Bool in
      self.bridge?.joinGroup(ifname: ifname, groupAddress: groupAddress, port: port)
      return true
    }

    AsyncFunction("bindPort") { (ifname: String, port: Int) -> Bool in
      self.bridge?.bindPort(ifname: ifname, port: port)
      return true
    }

    AsyncFunction("send") { (ifname: String, groupAddress: String, port: Int, data: Data) -> Bool in
      self.bridge?.send(ifname: ifname, groupAddress: groupAddress, port: port, data: data)
      return true
    }

    AsyncFunction("sendUnicast") { (ifname: String, targetAddress: String, port: Int, data: Data) -> Bool in
      self.bridge?.sendUnicast(ifname: ifname, targetAddress: targetAddress, port: port, data: data)
      return true
    }
  }

  private final class BridgeListener: MulticastBridge.Listener {
    private weak var module: TwistedPearMulticastModule?

    init(module: TwistedPearMulticastModule) {
      self.module = module
    }

    func onPacket(ifname: String, data: Data, sourceAddress: String, port: Int) {
      module?.sendEvent(
        "onPacket",
        [
          "ifname": ifname,
          "data": data,
          "sourceAddress": sourceAddress,
          "port": port
        ]
      )
    }

    func onNetworkChange(interfaces: [MulticastNetworkInfo]) {
      module?.sendEvent(
        "onNetworkChange",
        [
          "interfaces": interfaces.map { iface in
            [
              "name": iface.name,
              "linkLocalAddress": iface.linkLocalAddress
            ]
          }
        ]
      )
    }
  }
}
