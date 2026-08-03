import Darwin
import Foundation
import Network

struct MulticastNetworkInfo {
  let name: String
  let linkLocalAddress: String
}

/// IPv6 UDP multicast bridge for AutoInterface on iOS.
final class MulticastBridge: NSObject {
  protocol Listener: AnyObject {
    func onPacket(ifname: String, data: Data, sourceAddress: String, port: Int)
    func onNetworkChange(interfaces: [MulticastNetworkInfo])
  }

  weak var listener: Listener?

  private var running = false
  private var joinedGroups: [String: Int32] = [:]
  private var boundPorts: [String: Int32] = [:]
  private var readSources: [String: DispatchSourceRead] = [:]
  private let queue = DispatchQueue(label: "twistedpear.multicast", qos: .userInitiated)
  private var pathMonitor: NWPathMonitor?

  func start() {
  guard !running else {
      return
    }

    running = true
    registerPathMonitor()
    notifyNetworkChange()
  }

  func stop() {
    guard running else {
      return
    }

    running = false
    unregisterPathMonitor()
    closeAllSockets()
  }

  func getInterfaces() -> [MulticastNetworkInfo] {
    enumerateLinkLocalInterfaces()
  }

  func joinGroup(ifname: String, groupAddress: String, port: Int) {
    guard running else {
      return
    }

    let key = "\(ifname):\(groupAddress):\(port)"
    guard joinedGroups[key] == nil else {
      return
    }

    guard let socket = openSocket(ifname: ifname, port: port, reuse: true) else {
      return
    }

    var mreq = ipv6_mreq()
    groupAddress.withCString { groupPointer in
      _ = inet_pton(AF_INET6, groupPointer, &mreq.ipv6mr_multiaddr)
    }
    mreq.ipv6mr_interface = UInt32(if_nametoindex(ifname))

    let joined = withUnsafePointer(to: &mreq) { pointer in
      setsockopt(socket, IPPROTO_IPV6, IPV6_JOIN_GROUP, pointer, socklen_t(MemoryLayout<ipv6_mreq>.size))
    }

    guard joined == 0 else {
      close(socket)
      return
    }

    joinedGroups[key] = socket
    startReader(key: key, socket: socket, ifname: ifname)
  }

  func bindPort(ifname: String, port: Int) {
    guard running else {
      return
    }

    let key = "\(ifname):\(port)"
    guard boundPorts[key] == nil else {
      return
    }

    guard let socket = openSocket(ifname: ifname, port: port, reuse: true) else {
      return
    }

    boundPorts[key] = socket
    startReader(key: key, socket: socket, ifname: ifname)
  }

  func send(ifname: String, groupAddress: String, port: Int, data: Data) {
    guard running else {
      return
    }

    queue.async { [weak self] in
      guard let self else {
        return
      }

      guard let socket = self.openSocket(ifname: ifname, port: 0, reuse: false) else {
        return
      }

      defer { close(socket) }

      var addr = sockaddr_in6()
      addr.sin6_family = sa_family_t(AF_INET6)
      addr.sin6_port = in_port_t(port).bigEndian
      groupAddress.withCString { groupPointer in
        _ = inet_pton(AF_INET6, groupPointer, &addr.sin6_addr)
      }
      addr.sin6_scope_id = if_nametoindex(ifname)

      data.withUnsafeBytes { buffer in
        withUnsafePointer(to: &addr) { pointer in
          pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
            _ = sendto(
              socket,
              buffer.baseAddress,
              data.count,
              0,
              sockaddrPointer,
              socklen_t(MemoryLayout<sockaddr_in6>.size)
            )
          }
        }
      }
    }
  }

  func sendUnicast(ifname: String, targetAddress: String, port: Int, data: Data) {
    guard running else {
      return
    }

    queue.async { [weak self] in
      guard let self else {
        return
      }

      guard let socket = self.openSocket(ifname: ifname, port: 0, reuse: false) else {
        return
      }

      defer { close(socket) }

      var addr = sockaddr_in6()
      addr.sin6_family = sa_family_t(AF_INET6)
      addr.sin6_port = in_port_t(port).bigEndian
      targetAddress.withCString { targetPointer in
        _ = inet_pton(AF_INET6, targetPointer, &addr.sin6_addr)
      }
      addr.sin6_scope_id = if_nametoindex(ifname)

      data.withUnsafeBytes { buffer in
        withUnsafePointer(to: &addr) { pointer in
          pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
            _ = sendto(
              socket,
              buffer.baseAddress,
              data.count,
              0,
              sockaddrPointer,
              socklen_t(MemoryLayout<sockaddr_in6>.size)
            )
          }
        }
      }
    }
  }

  private func openSocket(ifname: String, port: Int, reuse: Bool) -> Int32? {
    let socket = Darwin.socket(AF_INET6, SOCK_DGRAM, IPPROTO_UDP)
    guard socket >= 0 else {
      return nil
    }

    var reuseValue: Int32 = 1
    if reuse {
      _ = setsockopt(socket, SOL_SOCKET, SO_REUSEADDR, &reuseValue, socklen_t(MemoryLayout<Int32>.size))
    }

    var v6Only: Int32 = 1
    _ = setsockopt(socket, IPPROTO_IPV6, IPV6_V6ONLY, &v6Only, socklen_t(MemoryLayout<Int32>.size))

    let interfaceIndex = if_nametoindex(ifname)
    guard interfaceIndex != 0 else {
      close(socket)
      return nil
    }

    if port > 0 {
      guard let linkLocal = linkLocalAddress(for: ifname) else {
        close(socket)
        return nil
      }

      var addr = sockaddr_in6()
      addr.sin6_family = sa_family_t(AF_INET6)
      addr.sin6_port = in_port_t(port).bigEndian
      linkLocal.withCString { addressPointer in
        _ = inet_pton(AF_INET6, addressPointer, &addr.sin6_addr)
      }
      addr.sin6_scope_id = interfaceIndex

      let bound = withUnsafePointer(to: &addr) { pointer in
        pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
          bind(socket, sockaddrPointer, socklen_t(MemoryLayout<sockaddr_in6>.size))
        }
      }

      guard bound == 0 else {
        close(socket)
        return nil
      }
    }

    return socket
  }

  private func startReader(key: String, socket: Int32, ifname: String) {
    guard readSources[key] == nil else {
      return
    }

    let source = DispatchSource.makeReadSource(fileDescriptor: socket, queue: queue)
    source.setEventHandler { [weak self] in
      guard let self, self.running else {
        return
      }

      var buffer = [UInt8](repeating: 0, count: 2048)
      var addr = sockaddr_in6()
      var addrLen = socklen_t(MemoryLayout<sockaddr_in6>.size)

      let received = withUnsafeMutablePointer(to: &addr) { pointer in
        pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
          recvfrom(socket, &buffer, buffer.count, 0, sockaddrPointer, &addrLen)
        }
      }

      guard received > 0 else {
        return
      }

      var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
      withUnsafePointer(to: &addr) { pointer in
        pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
          _ = getnameinfo(
            sockaddrPointer,
            addrLen,
            &host,
            socklen_t(host.count),
            nil,
            0,
            NI_NUMERICHOST
          )
        }
      }

      let sourceAddress = Self.descopeLinkLocal(String(cString: host))
      let port = Int(UInt16(bigEndian: addr.sin6_port))
      let data = Data(buffer.prefix(received))
      self.listener?.onPacket(ifname: ifname, data: data, sourceAddress: sourceAddress, port: port)
    }

    source.setCancelHandler {
      close(socket)
    }

    source.resume()
    readSources[key] = source
  }

  private func closeAllSockets() {
    for source in readSources.values {
      source.cancel()
    }
    readSources.removeAll()
    joinedGroups.removeAll()
    boundPorts.removeAll()
  }

  private func registerPathMonitor() {
    let monitor = NWPathMonitor()
    monitor.pathUpdateHandler = { [weak self] _ in
      self?.notifyNetworkChange()
    }
    monitor.start(queue: queue)
    pathMonitor = monitor
  }

  private func unregisterPathMonitor() {
    pathMonitor?.cancel()
    pathMonitor = nil
  }

  private func notifyNetworkChange() {
    listener?.onNetworkChange(interfaces: enumerateLinkLocalInterfaces())
  }

  private func enumerateLinkLocalInterfaces() -> [MulticastNetworkInfo] {
    var results: [MulticastNetworkInfo] = []
    var addresses: UnsafeMutablePointer<ifaddrs>?

    guard getifaddrs(&addresses) == 0, let first = addresses else {
      return []
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

      guard result == 0 else {
        continue
      }

      let address = String(cString: host)
      guard address.hasPrefix("fe80:") else {
        continue
      }

      let linkLocal = Self.descopeLinkLocal(address.components(separatedBy: "%").first ?? address)
      if !results.contains(where: { $0.name == name }) {
        results.append(MulticastNetworkInfo(name: name, linkLocalAddress: linkLocal))
      }
    }

    return results
  }

  private func linkLocalAddress(for ifname: String) -> String? {
    enumerateLinkLocalInterfaces().first(where: { $0.name == ifname })?.linkLocalAddress
  }

  static func descopeLinkLocal(_ address: String) -> String {
    let descoped = address.split(separator: "%").first.map(String.init) ?? address
    return descoped.replacingOccurrences(
      of: #"fe80:[0-9a-f]*::"#,
      with: "fe80::",
      options: [.regularExpression, .caseInsensitive]
    )
  }
}
