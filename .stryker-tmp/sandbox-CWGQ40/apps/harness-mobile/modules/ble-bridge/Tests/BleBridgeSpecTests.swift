import CoreBluetooth
import XCTest
@testable import BleBridgeSpec

final class BleBridgeSpecTests: XCTestCase {
  func testShouldActAsCentralPrefersLexicographicallyLowerHash() {
    let lower = Data((1...BleBridgeSpec.identityBeaconSize).map { UInt8($0) })
    var higher = lower
    higher[15] = 0x7f

    XCTAssertTrue(BleBridgeSpec.shouldActAsCentral(localHash: lower, peerHash: higher))
    XCTAssertFalse(BleBridgeSpec.shouldActAsCentral(localHash: higher, peerHash: lower))
  }

  func testFormatAndParseIdentityHashRoundTrip() {
    let hash = Data((0..<BleBridgeSpec.identityBeaconSize).map { UInt8($0 * 3) })
    let formatted = BleBridgeSpec.formatIdentityHash(hash)
    XCTAssertEqual(hash, BleBridgeSpec.parseIdentityHash(formatted))
  }

  func testServiceUuidsMatchBleInterfaceSpec() {
    XCTAssertTrue(BleBridgeSpec.serviceUUID.uuidString.lowercased().hasPrefix("6e6f0001-"))
    XCTAssertTrue(BleBridgeSpec.dataCharacteristicUUID.uuidString.lowercased().hasPrefix("6e6f0002-"))
    XCTAssertTrue(BleBridgeSpec.controlCharacteristicUUID.uuidString.lowercased().hasPrefix("6e6f0003-"))
  }

  func testParseIdentityFromAdvertisementReadsServiceDataBeacon() {
    let hash = Data((1...BleBridgeSpec.identityBeaconSize).map { UInt8($0) })
    let advertisement: [String: Any] = [
      CBAdvertisementDataServiceDataKey: [BleBridgeSpec.serviceUUID: hash]
    ]

    XCTAssertEqual(hash, BleBridgeSpec.parseIdentityFromAdvertisement(advertisement))
  }

  func testParseIdentityFromAdvertisementRejectsWrongSizedServiceData() {
    let advertisement: [String: Any] = [
      CBAdvertisementDataServiceDataKey: [BleBridgeSpec.serviceUUID: Data([1, 2, 3])]
    ]

    XCTAssertNil(BleBridgeSpec.parseIdentityFromAdvertisement(advertisement))
  }
}
