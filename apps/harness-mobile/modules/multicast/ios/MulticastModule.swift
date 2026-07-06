import ExpoModulesCore
import Foundation
import Network

public final class TwistedPearMulticastModule: Module {
  private var interfaces: [[String: String]] = []

  public func definition() -> ModuleDefinition {
    Name("TwistedPearMulticast")

    Events("onPacket", "onNetworkChange")

    AsyncFunction("start") { () -> Bool in
      self.refreshInterfaces()
      self.sendEvent("onNetworkChange", ["interfaces": self.interfaces])
      return true
    }

    AsyncFunction("stop") { () -> Bool in
      self.interfaces = []
      return true
    }

    Function("getInterfaces") { () -> [[String: String]] in
      self.refreshInterfaces()
      return self.interfaces
    }

    AsyncFunction("joinGroup") { (_ ifname: String, _ groupAddress: String, _ port: Int) -> Bool in
      return true
    }

    AsyncFunction("bindPort") { (_ ifname: String, _ port: Int) -> Bool in
      return true
    }

    AsyncFunction("send") { (_ ifname: String, _ groupAddress: String, _ port: Int, _ data: Data) -> Bool in
      return true
    }

    AsyncFunction("sendUnicast") { (_ ifname: String, _ targetAddress: String, _ port: Int, _ data: Data) -> Bool in
      return true
    }
  }

  private func refreshInterfaces() {
    var next: [[String: String]] = []
    var addresses: UnsafeMutablePointer<ifaddrs>?

    guard getifaddrs(&addresses) == 0, let first = addresses else {
      interfaces = []
      return
    }

    defer { freeifaddrs(addresses) }

    var cursor: UnsafeMutablePointer<ifaddrs>? = first
    while let entry = cursor?.pointee {
      defer { cursor = entry.ifa_next }
      guard entry.ifa_addr.pointee.sa_family == UInt8(AF_INET6), let cName = entry.ifa_name else {
        continue
      }

      let name = String(cString: cName)
      if name == "lo0" {
        continue
      }

      var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
      let result = getnameinfo(
        entry.ifa_addr,
        socklen_t(entry.ifa_addr.pointee.sa_len),
        &host,
        socklen_t(host.count),
        nil,
        0,
        NI_NUMERICHOST
      )

      if result == 0 {
        let address = String(cString: host)
        if address.hasPrefix("fe80:") {
          next.append(["name": name, "linkLocalAddress": address.components(separatedBy: "%").first ?? address])
        }
      }
    }

    interfaces = next
  }
}
