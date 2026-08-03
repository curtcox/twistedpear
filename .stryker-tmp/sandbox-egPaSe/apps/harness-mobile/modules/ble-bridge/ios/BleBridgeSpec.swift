import CoreBluetooth
import Foundation

/// BLE GATT constants and pure helpers shared by the native bridge and unit tests.
enum BleBridgeSpec {
  static let identityBeaconSize = 16
  static let defaultMtu = 247
  static let targetMtu = 512
  static let mtuFallbackDelayMs = 500

  static let serviceUUID = CBUUID(string: "6e6f0001-7e3a-4f2d-9b1c-8a5d3e2f1a0b")
  static let dataCharacteristicUUID = CBUUID(string: "6e6f0002-7e3a-4f2d-9b1c-8a5d3e2f1a0b")
  static let controlCharacteristicUUID = CBUUID(string: "6e6f0003-7e3a-4f2d-9b1c-8a5d3e2f1a0b")
  static let clientConfigDescriptorUUID = CBUUID(string: "00002902-0000-1000-8000-00805f9b34fb")

  static let centralRestoreIdentifier = "network.twistedpear.ble.central"
  static let peripheralRestoreIdentifier = "network.twistedpear.ble.peripheral"

  /// Spec tie-break: lower hash acts as central (initiator).
  static func shouldActAsCentral(localHash: Data, peerHash: Data) -> Bool {
    precondition(localHash.count == identityBeaconSize && peerHash.count == identityBeaconSize)
    return localHash.lexicographicallyPrecedes(peerHash)
  }

  static func formatIdentityHash(_ hash: Data) -> String {
    precondition(hash.count == identityBeaconSize)
    return hash.map { String(format: "%02x", $0) }.joined()
  }

  static func parseIdentityHash(_ hex: String) -> Data? {
    let normalized = hex.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    guard normalized.count == identityBeaconSize * 2 else {
      return nil
    }

    var bytes = Data(capacity: identityBeaconSize)
    var index = normalized.startIndex
    for _ in 0..<identityBeaconSize {
      let next = normalized.index(index, offsetBy: 2)
      guard let byte = UInt8(normalized[index..<next], radix: 16) else {
        return nil
      }
      bytes.append(byte)
      index = next
    }
    return bytes
  }

  static func parseIdentityFromAdvertisement(_ advertisementData: [String: Any]) -> Data? {
    guard
      let serviceData = advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data],
      let hash = serviceData[serviceUUID],
      hash.count == identityBeaconSize
    else {
      return nil
    }
    return hash
  }
}
