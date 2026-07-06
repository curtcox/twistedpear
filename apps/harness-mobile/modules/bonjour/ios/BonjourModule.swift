import ExpoModulesCore
import Foundation
import Network

public final class TwistedPearBonjourModule: Module {
  private var interfaces: [[String: String]] = []
  private var browser: NWBrowser?
  private var services: [String: NetService] = [:]

  public func definition() -> ModuleDefinition {
    Name("TwistedPearBonjour")

    Events("onServiceFound", "onServiceLost", "onNetworkChange")

    AsyncFunction("start") { (_ serviceType: String) -> Bool in
      self.refreshInterfaces()
      self.sendEvent("onNetworkChange", ["interfaces": self.interfaces])
      self.startBrowser(serviceType: serviceType)
      return true
    }

    AsyncFunction("stop") { () -> Bool in
      self.browser?.cancel()
      self.browser = nil
      for service in self.services.values {
        service.stop()
      }
      self.services.removeAll()
      self.interfaces = []
      return true
    }

    Function("getInterfaces") { () -> [[String: String]] in
      self.refreshInterfaces()
      return self.interfaces
    }

    AsyncFunction("advertise") { (record: [String: Any]) -> Bool in
      guard
        let id = record["id"] as? String,
        let ifname = record["ifname"] as? String,
        let host = record["host"] as? String,
        let port = record["port"] as? Int
      else {
        return false
      }

      self.services[id]?.stop()
      let service = NetService(
        domain: "local.",
        type: "_reticulum._udp.",
        name: id,
        port: Int32(port)
      )
      service.includesPeerToPeer = true
      service.publish()
      self.services[id] = service
      return true
    }
  }

  private func startBrowser(serviceType: String) {
    browser?.cancel()
    let type = serviceType.hasSuffix(".") ? serviceType : "\(serviceType)."
    let parameters = NWParameters.tcp
    parameters.includePeerToPeer = true
    let nextBrowser = NWBrowser(for: .bonjour(type: type, domain: nil), using: parameters)
    nextBrowser.stateUpdateHandler = { state in
      if case .failed(let error) = state {
        self.sendEvent("onServiceLost", ["message": error.localizedDescription])
      }
    }
    nextBrowser.browseResultsChangedHandler = { results, _ in
      for result in results {
        if case let .service(name, _, _, _) = result.endpoint {
          self.sendEvent("onServiceFound", [
            "id": name,
            "ifname": self.interfaces.first?["name"] ?? "en0",
            "host": name,
            "port": 42_671
          ])
        }
      }
    }
    nextBrowser.start(queue: .main)
    browser = nextBrowser
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
