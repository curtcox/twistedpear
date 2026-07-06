import ExpoModulesCore
import Foundation
import Network

public final class TwistedPearBonjourModule: Module, NetServiceDelegate, NetServiceBrowserDelegate {
  private var interfaces: [[String: String]] = []
  private var browser: NetServiceBrowser?
  private var resolvingServices: [String: NetService] = [:]
  private var advertisedServices: [String: NetService] = [:]
  private var pathMonitor: NWPathMonitor?

  public func definition() -> ModuleDefinition {
    Name("TwistedPearBonjour")

    Events("onServiceFound", "onServiceLost", "onNetworkChange")

    OnDestroy {
      self.stopAll()
    }

    AsyncFunction("start") { (serviceType: String) -> Bool in
      self.refreshInterfaces()
      self.sendEvent("onNetworkChange", ["interfaces": self.interfaces])
      self.startBrowser(serviceType: serviceType)
      self.startPathMonitor()
      return true
    }

    AsyncFunction("stop") { () -> Bool in
      self.stopAll()
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

      self.advertisedServices[id]?.stop()
      self.advertisedServices[id]?.delegate = nil

      let service = NetService(
        domain: "local.",
        type: "_reticulum._udp.",
        name: id,
        port: Int32(port)
      )
      service.includesPeerToPeer = true
      service.delegate = self

      let txt = NetService.data(fromTXTRecord: [
        "ifname": Data(ifname.utf8),
        "host": Data(host.utf8)
      ])
      service.setTXTRecord(txt)
      service.publish()

      self.advertisedServices[id] = service
      return true
    }
  }

  private func startBrowser(serviceType: String) {
    browser?.stop()
    browser?.delegate = nil

    let nextBrowser = NetServiceBrowser()
    nextBrowser.includesPeerToPeer = true
    nextBrowser.delegate = self

    let type = serviceType.hasSuffix(".") ? serviceType : "\(serviceType)."
    nextBrowser.searchForServices(ofType: type, inDomain: "local.")

    browser = nextBrowser
  }

  private func startPathMonitor() {
    guard pathMonitor == nil else {
      return
    }

    let monitor = NWPathMonitor()
    monitor.pathUpdateHandler = { [weak self] _ in
      guard let self else {
        return
      }

      self.refreshInterfaces()
      self.sendEvent("onNetworkChange", ["interfaces": self.interfaces])
    }
    monitor.start(queue: .main)
    pathMonitor = monitor
  }

  private func stopAll() {
    pathMonitor?.cancel()
    pathMonitor = nil

    browser?.stop()
    browser?.delegate = nil
    browser = nil

    for service in resolvingServices.values {
      service.stop()
      service.delegate = nil
    }
    resolvingServices.removeAll()

    for service in advertisedServices.values {
      service.stop()
      service.delegate = nil
    }
    advertisedServices.removeAll()

    interfaces = []
  }

  public func netServiceBrowser(
    _ browser: NetServiceBrowser,
    didFind service: NetService,
    moreComing: Bool
  ) {
    let id = service.name
    guard resolvingServices[id] == nil else {
      return
    }

    service.delegate = self
    service.resolve(withTimeout: 5)
    resolvingServices[id] = service
  }

  public func netServiceBrowser(
    _ browser: NetServiceBrowser,
    didRemove service: NetService,
    moreComing: Bool
  ) {
    let id = service.name
    resolvingServices.removeValue(forKey: id)?.stop()
    sendEvent("onServiceLost", ["id": id])
  }

  public func netServiceBrowser(_ browser: NetServiceBrowser, didNotSearch errorDict: [String: NSNumber]) {
    let message = errorDict[NetService.errorCode]?.stringValue ?? "browse failed"
    sendEvent("onServiceLost", ["message": message])
  }

  public func netServiceDidResolveAddress(_ sender: NetService) {
    let id = sender.name
    let port = sender.port
    guard port > 0 else {
      return
    }

    let txt = NetService.dictionary(fromTXTRecord: sender.txtRecordData() ?? Data())
    let ifname = txtData(txt, key: "ifname") ?? interfaces.first?["name"] ?? "en0"
    let host = txtData(txt, key: "host") ?? extractIPv6Address(from: sender) ?? id

    sendEvent("onServiceFound", [
      "id": id,
      "ifname": ifname,
      "host": host,
      "port": port
    ])
  }

  public func netService(_ sender: NetService, didNotResolve errorDict: [String: NSNumber]) {
    resolvingServices.removeValue(forKey: sender.name)
    let message = errorDict[NetService.errorCode]?.stringValue ?? "resolve failed"
    sendEvent("onServiceLost", ["message": "\(sender.name): \(message)"])
  }

  public func netService(_ sender: NetService, didNotPublish errorDict: [String: NSNumber]) {
    advertisedServices.removeValue(forKey: sender.name)
    let message = errorDict[NetService.errorCode]?.stringValue ?? "publish failed"
    sendEvent("onServiceLost", ["message": "\(sender.name): \(message)"])
  }

  private func txtData(_ txt: [String: Data], key: String) -> String? {
    guard let data = txt[key] else {
      return nil
    }

    return String(data: data, encoding: .utf8)
  }

  private func extractIPv6Address(from service: NetService) -> String? {
    guard let addresses = service.addresses else {
      return nil
    }

    for addressData in addresses {
      let host = addressData.withUnsafeBytes { rawBuffer -> String? in
        guard let sockaddrPointer = rawBuffer.baseAddress?.assumingMemoryBound(to: sockaddr.self) else {
          return nil
        }

        guard sockaddrPointer.pointee.sa_family == sa_family_t(AF_INET6) else {
          return nil
        }

        let sockaddr6 = rawBuffer.bindMemory(to: sockaddr_in6.self).baseAddress!
        var hostBuffer = [CChar](repeating: 0, count: Int(NI_MAXHOST))
        let result = getnameinfo(
          sockaddrPointer,
          socklen_t(rawBuffer.count),
          &hostBuffer,
          socklen_t(hostBuffer.count),
          nil,
          0,
          NI_NUMERICHOST
        )

        guard result == 0 else {
          return nil
        }

        let address = String(cString: hostBuffer)
        guard address.hasPrefix("fe80:") else {
          return nil
        }

        return address.components(separatedBy: "%").first ?? address
      }

      if let host {
        return host
      }
    }

    return nil
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
          let linkLocal = address.components(separatedBy: "%").first ?? address
          if !next.contains(where: { $0["name"] == name }) {
            next.append(["name": name, "linkLocalAddress": linkLocal])
          }
        }
      }
    }

    interfaces = next
  }
}
