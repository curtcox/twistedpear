import CoreBluetooth
import Foundation

/// BLE GATT central + peripheral bridge for the Reticulum BLE interface spec.
/// Exposes a half-duplex byte pipe once a peer connection is established.
final class BleBridge: NSObject {
  protocol Listener: AnyObject {
    func onData(_ data: Data)
    func onConnect()
    func onDisconnect()
    func onError(_ message: String)
    func onPeerDiscovered(peerIdentityHash: Data, deviceAddress: String)
  }

  private enum Role {
    case central
    case peripheral
  }

  weak var listener: Listener?

  private var identityHash = Data(count: BleBridgeSpec.identityBeaconSize)
  private var running = false
  private var connected = false
  private var negotiatedMtu = BleBridgeSpec.defaultMtu
  private var role: Role?
  private var centralManager: CBCentralManager?
  private var peripheralManager: CBPeripheralManager?
  private var connectedPeripheral: CBPeripheral?
  private var dataCharacteristic: CBCharacteristic?
  private var serverDataCharacteristic: CBMutableCharacteristic?
  private var connectingPeripheralId: UUID?
  private var subscribedCentral: CBCentral?
  private var discoveredPeerHashes: [UUID: Data] = [:]
  private var mtuFallbackWorkItem: DispatchWorkItem?

  private let queue = DispatchQueue.main

  func setIdentityHash(_ hash: Data) {
    precondition(hash.count == BleBridgeSpec.identityBeaconSize)
    identityHash = hash
    serverDataCharacteristic?.value = identityHash
  }

  func isConnected() -> Bool {
    connected
  }

  func getMtu() -> Int {
    negotiatedMtu
  }

  func start() {
    queue.async {
      guard !self.running else {
        return
      }

      self.running = true
      self.negotiatedMtu = BleBridgeSpec.defaultMtu
      self.connected = false
      self.role = nil
      self.connectedPeripheral = nil
      self.dataCharacteristic = nil
      self.connectingPeripheralId = nil
      self.subscribedCentral = nil
      self.discoveredPeerHashes.removeAll()

      if self.centralManager == nil {
        self.centralManager = CBCentralManager(
          delegate: self,
          queue: self.queue,
          options: [CBCentralManagerOptionRestoreIdentifierKey: BleBridgeSpec.centralRestoreIdentifier]
        )
      }

      if self.peripheralManager == nil {
        self.peripheralManager = CBPeripheralManager(
          delegate: self,
          queue: self.queue,
          options: [CBPeripheralManagerOptionRestoreIdentifierKey: BleBridgeSpec.peripheralRestoreIdentifier]
        )
      }

      self.tryStartBridge()
    }
  }

  func stop() {
    queue.async {
      guard self.running else {
        return
      }

      self.running = false
      self.mtuFallbackWorkItem?.cancel()
      self.mtuFallbackWorkItem = nil
      self.stopScanning()
      self.stopAdvertising()
      self.disconnectClient()
      self.removeGattService()

      if self.connected {
        self.connected = false
        self.listener?.onDisconnect()
      }

      self.role = nil
      self.connectedPeripheral = nil
      self.dataCharacteristic = nil
      self.serverDataCharacteristic = nil
      self.connectingPeripheralId = nil
      self.subscribedCentral = nil
      self.discoveredPeerHashes.removeAll()
    }
  }

  func write(_ data: Data) {
    queue.async {
      guard self.connected else {
        self.listener?.onError("BLE pipe is not connected")
        return
      }

      switch self.role {
      case .central:
        self.writeAsCentral(data)
      case .peripheral:
        self.writeAsPeripheral(data)
      case .none:
        self.listener?.onError("BLE pipe is not connected")
      }
    }
  }

  private func tryStartBridge() {
    guard running else {
      return
    }

    guard centralManager?.state == .poweredOn, peripheralManager?.state == .poweredOn else {
      return
    }

    openGattServer()
    startAdvertising()
    startScanning()
  }

  private func openGattServer() {
    guard let peripheralManager, peripheralManager.state == .poweredOn else {
      return
    }

    removeGattService()

    let dataChar = CBMutableCharacteristic(
      type: BleBridgeSpec.dataCharacteristicUUID,
      properties: [.write, .writeWithoutResponse, .notify],
      value: nil,
      permissions: [.writeable]
    )
    dataChar.descriptors = [
      CBMutableDescriptor(
        type: BleBridgeSpec.clientConfigDescriptorUUID,
        value: nil
      )
    ]

    let controlChar = CBMutableCharacteristic(
      type: BleBridgeSpec.controlCharacteristicUUID,
      properties: [.read, .write],
      value: identityHash,
      permissions: [.readable, .writeable]
    )

    let service = CBMutableService(type: BleBridgeSpec.serviceUUID, primary: true)
    service.characteristics = [dataChar, controlChar]
    serverDataCharacteristic = dataChar
    peripheralManager.add(service)
  }

  private func removeGattService() {
    guard let peripheralManager else {
      return
    }

    peripheralManager.removeAllServices()
    serverDataCharacteristic = nil
  }

  private func startAdvertising() {
    guard let peripheralManager, peripheralManager.state == .poweredOn else {
      return
    }

    peripheralManager.stopAdvertising()
    let advertisementData: [String: Any] = [
      CBAdvertisementDataServiceUUIDsKey: [BleBridgeSpec.serviceUUID],
      CBAdvertisementDataServiceDataKey: [BleBridgeSpec.serviceUUID: identityHash]
    ]
    peripheralManager.startAdvertising(advertisementData)
  }

  private func stopAdvertising() {
    peripheralManager?.stopAdvertising()
  }

  private func startScanning() {
    guard let centralManager, centralManager.state == .poweredOn else {
      return
    }

    centralManager.scanForPeripherals(
      withServices: [BleBridgeSpec.serviceUUID],
      options: [CBCentralManagerScanOptionAllowDuplicatesKey: false]
    )
  }

  private func stopScanning() {
    centralManager?.stopScan()
  }

  private func handleDiscoveredPeripheral(_ peripheral: CBPeripheral, advertisementData: [String: Any]) {
    guard running, !connected, connectingPeripheralId == nil else {
      return
    }

    let peripheralId = peripheral.identifier
    if let localId = connectedPeripheral?.identifier, localId == peripheralId {
      return
    }

    guard let peerHash = BleBridgeSpec.parseIdentityFromAdvertisement(advertisementData) else {
      return
    }

    if peerHash == identityHash {
      return
    }

    discoveredPeerHashes[peripheralId] = peerHash
    listener?.onPeerDiscovered(
      peerIdentityHash: peerHash,
      deviceAddress: peripheralId.uuidString
    )

    guard BleBridgeSpec.shouldActAsCentral(localHash: identityHash, peerHash: peerHash) else {
      return
    }

    connectingPeripheralId = peripheralId
    stopScanning()
    connectedPeripheral = peripheral
    peripheral.delegate = self
    centralManager?.connect(peripheral, options: nil)
  }

  private func handleInboundCentral(_ central: CBCentral, peerHash: Data?) {
    guard running, !connected, connectingPeripheralId == nil else {
      return
    }

    let resolvedHash = peerHash ?? discoveredPeerHashes[central.identifier]
    guard let peerHash = resolvedHash, peerHash != identityHash else {
      return
    }

    listener?.onPeerDiscovered(
      peerIdentityHash: peerHash,
      deviceAddress: central.identifier.uuidString
    )

    if BleBridgeSpec.shouldActAsCentral(localHash: identityHash, peerHash: peerHash) {
      return
    }

    role = .peripheral
    subscribedCentral = central
    schedulePeripheralMtuFallback()
  }

  private func schedulePeripheralMtuFallback() {
    mtuFallbackWorkItem?.cancel()
    let work = DispatchWorkItem { [weak self] in
      guard let self, self.running, self.role == .peripheral, !self.connected else {
        return
      }
      self.markConnected(role: .peripheral)
    }
    mtuFallbackWorkItem = work
    queue.asyncAfter(deadline: .now() + .milliseconds(BleBridgeSpec.mtuFallbackDelayMs), execute: work)
  }

  private func markConnected(role nextRole: Role) {
    guard !connected else {
      return
    }

    role = nextRole
    connected = true
    stopScanning()
    stopAdvertising()
    mtuFallbackWorkItem?.cancel()
    mtuFallbackWorkItem = nil
    listener?.onConnect()
  }

  private func handleLinkLost() {
    guard connected || connectingPeripheralId != nil || role != nil else {
      return
    }

    connected = false
    role = nil
    connectingPeripheralId = nil
    subscribedCentral = nil
    dataCharacteristic = nil
    mtuFallbackWorkItem?.cancel()
    mtuFallbackWorkItem = nil
    disconnectClient()
    listener?.onDisconnect()

    if running {
      openGattServer()
      startAdvertising()
      startScanning()
    }
  }

  private func disconnectClient() {
    if let peripheral = connectedPeripheral {
      centralManager?.cancelPeripheralConnection(peripheral)
    }
    connectedPeripheral = nil
    dataCharacteristic = nil
  }

  private func writeAsCentral(_ data: Data) {
    guard let peripheral = connectedPeripheral, let characteristic = dataCharacteristic else {
      return
    }

    let writeType: CBCharacteristicWriteType = characteristic.properties.contains(.writeWithoutResponse)
      ? .withoutResponse
      : .withResponse
    peripheral.writeValue(data, for: characteristic, type: writeType)
  }

  private func writeAsPeripheral(_ data: Data) {
    guard
      let peripheralManager,
      let characteristic = serverDataCharacteristic
    else {
      listener?.onError("BLE peripheral notify failed")
      return
    }

    characteristic.value = data
    if !peripheralManager.updateValue(data, for: characteristic, onSubscribedCentrals: nil) {
      listener?.onError("BLE peripheral notify failed")
    }
  }

  private func updateNegotiatedMtu(for peripheral: CBPeripheral) {
    let maxWrite = peripheral.maximumWriteValueLength(for: .withoutResponse)
    negotiatedMtu = max(maxWrite + 3, BleBridgeSpec.defaultMtu)
  }
}

extension BleBridge: CBCentralManagerDelegate {
  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    switch central.state {
    case .poweredOn:
      tryStartBridge()
    case .unsupported, .unauthorized, .poweredOff:
      if running {
        listener?.onError("Bluetooth is not available or disabled")
      }
    default:
      break
    }
  }

  func centralManager(_ central: CBCentralManager, willRestoreState dict: [String: Any]) {
    guard let peripherals = dict[CBCentralManagerRestoredStatePeripheralsKey] as? [CBPeripheral] else {
      return
    }

    for peripheral in peripherals {
      peripheral.delegate = self
      connectedPeripheral = peripheral
      if peripheral.state == .connected {
        peripheral.discoverServices([BleBridgeSpec.serviceUUID])
      }
    }
  }

  func centralManager(
    _ central: CBCentralManager,
    didDiscover peripheral: CBPeripheral,
    advertisementData: [String: Any],
    rssi RSSI: NSNumber
  ) {
    handleDiscoveredPeripheral(peripheral, advertisementData: advertisementData)
  }

  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    guard running, connectingPeripheralId == peripheral.identifier else {
      return
    }

    role = .central
    connectedPeripheral = peripheral
    peripheral.discoverServices([BleBridgeSpec.serviceUUID])
  }

  func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
    if connectingPeripheralId == peripheral.identifier {
      connectingPeripheralId = nil
      connectedPeripheral = nil
      if running {
        startScanning()
      }
    }
  }

  func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
    if connectedPeripheral?.identifier == peripheral.identifier || connectingPeripheralId == peripheral.identifier {
      handleLinkLost()
    }
  }
}

extension BleBridge: CBPeripheralDelegate {
  func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    guard running, role == .central, connectedPeripheral?.identifier == peripheral.identifier else {
      return
    }

    if error != nil {
      listener?.onError("BLE service discovery failed")
      centralManager?.cancelPeripheralConnection(peripheral)
      return
    }

    guard let service = peripheral.services?.first(where: { $0.uuid == BleBridgeSpec.serviceUUID }) else {
      listener?.onError("BLE data characteristic missing on peer")
      centralManager?.cancelPeripheralConnection(peripheral)
      return
    }

    peripheral.discoverCharacteristics(
      [BleBridgeSpec.dataCharacteristicUUID, BleBridgeSpec.controlCharacteristicUUID],
      for: service
    )
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    guard running, role == .central, connectedPeripheral?.identifier == peripheral.identifier else {
      return
    }

    if error != nil {
      listener?.onError("BLE service discovery failed")
      centralManager?.cancelPeripheralConnection(peripheral)
      return
    }

    guard let dataChar = service.characteristics?.first(where: { $0.uuid == BleBridgeSpec.dataCharacteristicUUID }) else {
      listener?.onError("BLE data characteristic missing on peer")
      centralManager?.cancelPeripheralConnection(peripheral)
      return
    }

    dataCharacteristic = dataChar

    if let controlChar = service.characteristics?.first(where: { $0.uuid == BleBridgeSpec.controlCharacteristicUUID }) {
      peripheral.readValue(for: controlChar)
    }

    updateNegotiatedMtu(for: peripheral)
    peripheral.setNotifyValue(true, for: dataChar)
  }

  func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
    guard running, connectedPeripheral?.identifier == peripheral.identifier else {
      return
    }

    if characteristic.uuid == BleBridgeSpec.controlCharacteristicUUID,
       let value = characteristic.value,
       value.count == BleBridgeSpec.identityBeaconSize,
       value != identityHash {
      discoveredPeerHashes[peripheral.identifier] = value
      listener?.onPeerDiscovered(peerIdentityHash: value, deviceAddress: peripheral.identifier.uuidString)

      if !BleBridgeSpec.shouldActAsCentral(localHash: identityHash, peerHash: value) {
        centralManager?.cancelPeripheralConnection(peripheral)
      }
      return
    }

    if characteristic.uuid == BleBridgeSpec.dataCharacteristicUUID,
       let value = characteristic.value,
       !value.isEmpty {
      listener?.onData(value)
    }
  }

  func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
    guard running, role == .central, connectedPeripheral?.identifier == peripheral.identifier else {
      return
    }

    guard characteristic.uuid == BleBridgeSpec.dataCharacteristicUUID else {
      return
    }

    if error != nil {
      listener?.onError("BLE notification setup failed")
      centralManager?.cancelPeripheralConnection(peripheral)
      return
    }

    if characteristic.isNotifying {
      markConnected(role: .central)
    }
  }
}

extension BleBridge: CBPeripheralManagerDelegate {
  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    switch peripheral.state {
    case .poweredOn:
      tryStartBridge()
    case .unsupported, .unauthorized, .poweredOff:
      if running {
        listener?.onError("Bluetooth is not available or disabled")
      }
    default:
      break
    }
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, willRestoreState dict: [String: Any]) {
    if let services = dict[CBPeripheralManagerRestoredStateServicesKey] as? [CBMutableService] {
      for service in services where service.uuid == BleBridgeSpec.serviceUUID {
        serverDataCharacteristic = service.characteristics?.first(where: {
          $0.uuid == BleBridgeSpec.dataCharacteristicUUID
        }) as? CBMutableCharacteristic
      }
    }
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
    if error != nil {
      listener?.onError("Failed to open GATT server")
    }
  }

  func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
    if error != nil {
      listener?.onError("BLE advertise failed")
    }
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) -> Bool {
    guard request.characteristic.uuid == BleBridgeSpec.controlCharacteristicUUID else {
      return false
    }

    request.value = identityHash
    peripheral.respond(to: request, withResult: .success)
    return true
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
    for request in requests {
      if request.characteristic.uuid == BleBridgeSpec.controlCharacteristicUUID,
         let value = request.value,
         value.count == BleBridgeSpec.identityBeaconSize {
        discoveredPeerHashes[request.central.identifier] = value
        handleInboundCentral(request.central, peerHash: value)
        peripheral.respond(to: request, withResult: .success)
        continue
      }

      if request.characteristic.uuid == BleBridgeSpec.dataCharacteristicUUID,
         role == .peripheral,
         let value = request.value,
         !value.isEmpty {
        listener?.onData(value)
        peripheral.respond(to: request, withResult: .success)
        continue
      }

      peripheral.respond(to: request, withResult: .attributeNotFound)
    }
  }

  func peripheralManager(
    _ peripheral: CBPeripheralManager,
    central: CBCentral,
    didSubscribeTo characteristic: CBCharacteristic
  ) {
    guard characteristic.uuid == BleBridgeSpec.dataCharacteristicUUID else {
      return
    }

    let peerHash = discoveredPeerHashes[central.identifier]
    handleInboundCentral(central, peerHash: peerHash)
    mtuFallbackWorkItem?.cancel()
    mtuFallbackWorkItem = nil

    if role == .peripheral, !connected {
      markConnected(role: .peripheral)
    }
  }

  func peripheralManager(
    _ peripheral: CBPeripheralManager,
    central: CBCentral,
    didUnsubscribeFrom characteristic: CBCharacteristic
  ) {
    guard characteristic.uuid == BleBridgeSpec.dataCharacteristicUUID, role == .peripheral else {
      return
    }

    handleLinkLost()
  }
}
