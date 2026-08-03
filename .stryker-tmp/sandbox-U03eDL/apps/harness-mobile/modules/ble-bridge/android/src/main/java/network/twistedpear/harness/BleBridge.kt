package network.twistedpear.harness

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import java.util.Locale
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

/**
 * BLE GATT central + peripheral bridge for the Reticulum BLE interface spec.
 * Exposes a half-duplex byte pipe once a peer connection is established.
 */
@SuppressLint("MissingPermission")
class BleBridge(private val context: Context) {
  interface Listener {
    fun onData(data: ByteArray)
    fun onConnect()
    fun onDisconnect()
    fun onError(message: String)
    fun onPeerDiscovered(peerIdentityHash: ByteArray, deviceAddress: String)
  }

  private enum class Role {
    CENTRAL,
    PERIPHERAL
  }

  @Volatile
  private var listener: Listener? = null

  @Volatile
  private var identityHash: ByteArray = ByteArray(IDENTITY_BEACON_SIZE)

  @Volatile
  private var connected = false

  @Volatile
  private var negotiatedMtu: Int = DEFAULT_MTU

  private val running = AtomicBoolean(false)
  private val handler = Handler(Looper.getMainLooper())
  private val bluetoothManager: BluetoothManager? =
    context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
  private val adapter: BluetoothAdapter? = bluetoothManager?.adapter

  private var scanner: BluetoothLeScanner? = null
  private var advertiser = adapter?.bluetoothLeAdvertiser
  private var gattServer: BluetoothGattServer? = null
  private var gattClient: BluetoothGatt? = null
  private var dataCharacteristic: BluetoothGattCharacteristic? = null
  private var serverDataCharacteristic: BluetoothGattCharacteristic? = null

  @Volatile
  private var role: Role? = null

  @Volatile
  private var peerDevice: BluetoothDevice? = null

  @Volatile
  private var connectingAddress: String? = null

  private val discoveredPeerHashes = ConcurrentHashMap<String, ByteArray>()

  fun setListener(listener: Listener?) {
    this.listener = listener
  }

  fun setIdentityHash(hash: ByteArray) {
    require(hash.size == IDENTITY_BEACON_SIZE) {
      "Identity hash must be $IDENTITY_BEACON_SIZE bytes, got ${hash.size}"
    }
    identityHash = hash.copyOf()
    val control = gattServer
      ?.getService(SERVICE_UUID)
      ?.getCharacteristic(CONTROL_CHARACTERISTIC_UUID)
    control?.value = identityHash.copyOf()
  }

  fun getIdentityHash(): ByteArray = identityHash.copyOf()

  fun isConnected(): Boolean = connected

  fun getMtu(): Int = negotiatedMtu

  fun start() {
    if (!running.compareAndSet(false, true)) {
      return
    }

    val activeAdapter = adapter
    if (activeAdapter === null || !activeAdapter.isEnabled) {
      running.set(false)
      listener?.onError("Bluetooth is not available or disabled")
      return
    }

    negotiatedMtu = DEFAULT_MTU
    connected = false
    role = null
    peerDevice = null
    connectingAddress = null
    discoveredPeerHashes.clear()

    if (!openGattServer(activeAdapter)) {
      running.set(false)
      listener?.onError("Failed to open GATT server")
      return
    }

    startAdvertising(activeAdapter)
    startScanning(activeAdapter)
  }

  fun stop() {
    if (!running.compareAndSet(true, false)) {
      return
    }

    handler.removeCallbacksAndMessages(null)
    stopScanning()
    stopAdvertising()
    disconnectClient()
    closeGattServer()

    if (connected) {
      connected = false
      listener?.onDisconnect()
    }

    role = null
    peerDevice = null
    connectingAddress = null
    dataCharacteristic = null
    serverDataCharacteristic = null
    discoveredPeerHashes.clear()
  }

  fun write(data: ByteArray) {
    if (!connected) {
      listener?.onError("BLE pipe is not connected")
      return
    }

    handler.post {
      when (role) {
        Role.CENTRAL -> writeAsCentral(data)
        Role.PERIPHERAL -> writeAsPeripheral(data)
        else -> listener?.onError("BLE pipe is not connected")
      }
    }
  }

  fun notifyConnected(mtu: Int = DEFAULT_MTU) {
    negotiatedMtu = mtu
    connected = true
    listener?.onConnect()
  }

  fun notifyDisconnected() {
    if (!connected) {
      return
    }

    connected = false
    listener?.onDisconnect()
  }

  fun notifyPeerDiscovered(peerIdentityHash: ByteArray, deviceAddress: String) {
    require(peerIdentityHash.size == IDENTITY_BEACON_SIZE) {
      "Peer identity hash must be $IDENTITY_BEACON_SIZE bytes"
    }
    listener?.onPeerDiscovered(peerIdentityHash.copyOf(), deviceAddress)
  }

  private fun openGattServer(activeAdapter: BluetoothAdapter): Boolean {
    val serverCallback = object : BluetoothGattServerCallback() {
      override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
        if (!running.get()) {
          return
        }

        when (newState) {
          BluetoothProfile.STATE_CONNECTED -> handleServerConnection(device)
          BluetoothProfile.STATE_DISCONNECTED -> handleServerDisconnection(device)
        }
      }

      override fun onMtuChanged(device: BluetoothDevice, mtu: Int) {
        if (!running.get() || role != Role.PERIPHERAL || peerDevice?.address != device.address) {
          return
        }

        negotiatedMtu = mtu.coerceAtLeast(DEFAULT_MTU)
        markConnected(Role.PERIPHERAL, device)
      }

      override fun onCharacteristicWriteRequest(
        device: BluetoothDevice,
        requestId: Int,
        characteristic: BluetoothGattCharacteristic,
        preparedWrite: Boolean,
        responseNeeded: Boolean,
        offset: Int,
        value: ByteArray
      ) {
        if (!running.get() || role != Role.PERIPHERAL || peerDevice?.address != device.address) {
          if (responseNeeded) {
            gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, offset, null)
          }
          return
        }

        if (characteristic.uuid == DATA_CHARACTERISTIC_UUID && value.isNotEmpty()) {
          listener?.onData(value.copyOf())
        }

        if (responseNeeded) {
          gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
        }
      }

      override fun onDescriptorWriteRequest(
        device: BluetoothDevice,
        requestId: Int,
        descriptor: BluetoothGattDescriptor,
        preparedWrite: Boolean,
        responseNeeded: Boolean,
        offset: Int,
        value: ByteArray
      ) {
        if (responseNeeded) {
          gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
        }
      }

      override fun onCharacteristicReadRequest(
        device: BluetoothDevice,
        requestId: Int,
        offset: Int,
        characteristic: BluetoothGattCharacteristic
      ) {
        if (characteristic.uuid == CONTROL_CHARACTERISTIC_UUID) {
          characteristic.value = identityHash.copyOf()
        }

        gattServer?.sendResponse(
          device,
          requestId,
          BluetoothGatt.GATT_SUCCESS,
          offset,
          characteristic.value
        )
      }
    }

    val server = bluetoothManager?.openGattServer(context, serverCallback) ?: return false
    val service = buildGattService()
    serverDataCharacteristic = service.getCharacteristic(DATA_CHARACTERISTIC_UUID)
    server.clearServices()
    server.addService(service)
    gattServer = server
    return true
  }

  private fun buildGattService(): BluetoothGattService {
    val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)

    val dataChar = BluetoothGattCharacteristic(
      DATA_CHARACTERISTIC_UUID,
      BluetoothGattCharacteristic.PROPERTY_WRITE or
        BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE or
        BluetoothGattCharacteristic.PROPERTY_NOTIFY,
      BluetoothGattCharacteristic.PERMISSION_WRITE
    )

    val notifyDescriptor = BluetoothGattDescriptor(
      CLIENT_CONFIG_DESCRIPTOR_UUID,
      BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE
    )
    dataChar.addDescriptor(notifyDescriptor)

    val controlChar = BluetoothGattCharacteristic(
      CONTROL_CHARACTERISTIC_UUID,
      BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_WRITE,
      BluetoothGattCharacteristic.PERMISSION_READ or BluetoothGattCharacteristic.PERMISSION_WRITE
    )
    controlChar.value = identityHash.copyOf()

    service.addCharacteristic(dataChar)
    service.addCharacteristic(controlChar)
    return service
  }

  private fun startAdvertising(activeAdapter: BluetoothAdapter) {
    val leAdvertiser = activeAdapter.bluetoothLeAdvertiser ?: return
    advertiser = leAdvertiser

    val settings = AdvertiseSettings.Builder()
      .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
      .setConnectable(true)
      .setTimeout(0)
      .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
      .build()

    val advertiseData = AdvertiseData.Builder()
      .addServiceUuid(ParcelUuid(SERVICE_UUID))
      .setIncludeDeviceName(false)
      .build()

    val scanResponse = AdvertiseData.Builder()
      .addServiceData(ParcelUuid(SERVICE_UUID), identityHash.copyOf())
      .setIncludeDeviceName(false)
      .build()

    leAdvertiser.startAdvertising(settings, advertiseData, scanResponse, advertiseCallback)
  }

  private fun stopAdvertising() {
    advertiser?.stopAdvertising(advertiseCallback)
  }

  private fun startScanning(activeAdapter: BluetoothAdapter) {
    val leScanner = activeAdapter.bluetoothLeScanner ?: return
    scanner = leScanner

    val filter = ScanFilter.Builder()
      .setServiceUuid(ParcelUuid(SERVICE_UUID))
      .build()

    val settings = ScanSettings.Builder()
      .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
      .build()

    leScanner.startScan(listOf(filter), settings, scanCallback)
  }

  private fun stopScanning() {
    scanner?.stopScan(scanCallback)
    scanner = null
  }

  private fun handleScanResult(result: ScanResult) {
    if (!running.get() || connected || connectingAddress !== null) {
      return
    }

    val device = result.device ?: return
    val address = device.address ?: return
    if (address == adapter?.address) {
      return
    }

    val peerHash = parseIdentityFromScanResult(result) ?: return
    if (peerHash.contentEquals(identityHash)) {
      return
    }

    discoveredPeerHashes[address] = peerHash.copyOf()
    listener?.onPeerDiscovered(peerHash.copyOf(), address)

    if (!shouldActAsCentral(identityHash, peerHash)) {
      return
    }

    connectingAddress = address
    stopScanning()
    gattClient = device.connectGatt(context, false, gattClientCallback, BluetoothDevice.TRANSPORT_LE)
  }

  private fun handleServerConnection(device: BluetoothDevice) {
    if (!running.get() || connected || connectingAddress !== null) {
      gattServer?.cancelConnection(device)
      return
    }

    val peerHash = readPeerHashFromServer(device) ?: discoveredPeerHashes[device.address]
    if (peerHash === null || peerHash.contentEquals(identityHash)) {
      gattServer?.cancelConnection(device)
      return
    }

    listener?.onPeerDiscovered(peerHash.copyOf(), device.address)

    if (shouldActAsCentral(identityHash, peerHash)) {
      gattServer?.cancelConnection(device)
      return
    }

    peerDevice = device
    role = Role.PERIPHERAL
    handler.postDelayed({
      if (running.get() && role == Role.PERIPHERAL && !connected && peerDevice?.address == device.address) {
        markConnected(Role.PERIPHERAL, device)
      }
    }, MTU_FALLBACK_DELAY_MS)
  }

  private fun readPeerHashFromServer(device: BluetoothDevice): ByteArray? {
    val control = gattServer
      ?.getService(SERVICE_UUID)
      ?.getCharacteristic(CONTROL_CHARACTERISTIC_UUID)
    val value = control?.value
    return if (value !== null && value.size == IDENTITY_BEACON_SIZE) value.copyOf() else null
  }

  private fun handleServerDisconnection(device: BluetoothDevice) {
    if (peerDevice?.address != device.address) {
      return
    }

    handleLinkLost()
  }

  private fun markConnected(nextRole: Role, device: BluetoothDevice) {
    if (connected) {
      return
    }

    role = nextRole
    peerDevice = device
    connected = true
    stopScanning()
    stopAdvertising()
    listener?.onConnect()
  }

  private fun handleLinkLost() {
    if (!connected && connectingAddress === null && role === null) {
      return
    }

    connected = false
    role = null
    peerDevice = null
    connectingAddress = null
    dataCharacteristic = null
    disconnectClient()

    listener?.onDisconnect()

    if (running.get()) {
      val activeAdapter = adapter ?: return
      startAdvertising(activeAdapter)
      startScanning(activeAdapter)
    }
  }

  private fun disconnectClient() {
    gattClient?.close()
    gattClient = null
  }

  private fun closeGattServer() {
    gattServer?.close()
    gattServer = null
  }

  private fun writeAsCentral(data: ByteArray) {
    val gatt = gattClient ?: return
    val characteristic = dataCharacteristic ?: return
    characteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
    characteristic.value = data
    if (!gatt.writeCharacteristic(characteristic)) {
      listener?.onError("BLE central write failed")
    }
  }

  private fun writeAsPeripheral(data: ByteArray) {
    val server = gattServer ?: return
    val device = peerDevice ?: return
    val characteristic = serverDataCharacteristic ?: return
    characteristic.value = data
    if (!server.notifyCharacteristicChanged(device, characteristic, false)) {
      listener?.onError("BLE peripheral notify failed")
    }
  }

  private val advertiseCallback = object : AdvertiseCallback() {
    override fun onStartFailure(errorCode: Int) {
      listener?.onError("BLE advertise failed ($errorCode)")
    }
  }

  private val scanCallback = object : ScanCallback() {
    override fun onScanResult(callbackType: Int, result: ScanResult) {
      handleScanResult(result)
    }

    override fun onScanFailed(errorCode: Int) {
      listener?.onError("BLE scan failed ($errorCode)")
    }
  }

  private val gattClientCallback = object : BluetoothGattCallback() {
    override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
      if (!running.get()) {
        gatt.close()
        return
      }

      when (newState) {
        BluetoothProfile.STATE_CONNECTED -> gatt.discoverServices()
        BluetoothProfile.STATE_DISCONNECTED -> {
          if (gattClient === gatt) {
            gattClient = null
            dataCharacteristic = null
            handleLinkLost()
          } else {
            gatt.close()
          }
        }
      }
    }

    override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
      if (status != BluetoothGatt.GATT_SUCCESS || !running.get()) {
        listener?.onError("BLE service discovery failed")
        gatt.disconnect()
        return
      }

      val service = gatt.getService(SERVICE_UUID)
      val characteristic = service?.getCharacteristic(DATA_CHARACTERISTIC_UUID)
      if (characteristic === null) {
        listener?.onError("BLE data characteristic missing on peer")
        gatt.disconnect()
        return
      }

      dataCharacteristic = characteristic
      peerDevice = gatt.device
      role = Role.CENTRAL

      val control = service.getCharacteristic(CONTROL_CHARACTERISTIC_UUID)
      if (control !== null) {
        gatt.readCharacteristic(control)
      }

      gatt.requestMtu(TARGET_MTU)
    }

    override fun onCharacteristicRead(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, status: Int) {
      if (status != BluetoothGatt.GATT_SUCCESS || characteristic.uuid != CONTROL_CHARACTERISTIC_UUID) {
        return
      }

      val value = characteristic.value ?: return
      if (value.size != IDENTITY_BEACON_SIZE || value.contentEquals(identityHash)) {
        return
      }

      discoveredPeerHashes[gatt.device.address] = value.copyOf()
      listener?.onPeerDiscovered(value.copyOf(), gatt.device.address)
    }

    override fun onMtuChanged(gatt: BluetoothGatt, mtu: Int, status: Int) {
      if (!running.get() || role != Role.CENTRAL) {
        return
      }

      negotiatedMtu = if (status == BluetoothGatt.GATT_SUCCESS) mtu.coerceAtLeast(DEFAULT_MTU) else DEFAULT_MTU
      val characteristic = dataCharacteristic ?: return
      gatt.setCharacteristicNotification(characteristic, true)

      val descriptor = characteristic.getDescriptor(CLIENT_CONFIG_DESCRIPTOR_UUID)
      if (descriptor !== null) {
        descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
        gatt.writeDescriptor(descriptor)
      } else {
        markConnected(Role.CENTRAL, gatt.device)
      }
    }

    override fun onDescriptorWrite(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
      if (!running.get() || role != Role.CENTRAL || descriptor.uuid != CLIENT_CONFIG_DESCRIPTOR_UUID) {
        return
      }

      if (status == BluetoothGatt.GATT_SUCCESS) {
        markConnected(Role.CENTRAL, gatt.device)
      } else {
        listener?.onError("BLE notification setup failed")
        gatt.disconnect()
      }
    }

    override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
      if (!running.get() || role != Role.CENTRAL || characteristic.uuid != DATA_CHARACTERISTIC_UUID) {
        return
      }

      val value = characteristic.value ?: return
      if (value.isNotEmpty()) {
        listener?.onData(value.copyOf())
      }
    }
  }

  companion object {
    const val IDENTITY_BEACON_SIZE = 16
    const val DEFAULT_MTU = 247
    const val TARGET_MTU = 512
    private const val MTU_FALLBACK_DELAY_MS = 500L

    val SERVICE_UUID: UUID = UUID.fromString("6e6f0001-7e3a-4f2d-9b1c-8a5d3e2f1a0b")
    val DATA_CHARACTERISTIC_UUID: UUID = UUID.fromString("6e6f0002-7e3a-4f2d-9b1c-8a5d3e2f1a0b")
    val CONTROL_CHARACTERISTIC_UUID: UUID = UUID.fromString("6e6f0003-7e3a-4f2d-9b1c-8a5d3e2f1a0b")
    val CLIENT_CONFIG_DESCRIPTOR_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

    /** Spec tie-break: lower hash acts as central (initiator). */
    fun shouldActAsCentral(localHash: ByteArray, peerHash: ByteArray): Boolean {
      require(localHash.size == IDENTITY_BEACON_SIZE && peerHash.size == IDENTITY_BEACON_SIZE) {
        "Identity hashes must be $IDENTITY_BEACON_SIZE bytes"
      }

      for (index in 0 until IDENTITY_BEACON_SIZE) {
        val local = localHash[index].toInt() and 0xff
        val peer = peerHash[index].toInt() and 0xff
        if (local != peer) {
          return local < peer
        }
      }

      return false
    }

    fun formatIdentityHash(hash: ByteArray): String {
      require(hash.size == IDENTITY_BEACON_SIZE) {
        "Identity hash must be $IDENTITY_BEACON_SIZE bytes"
      }

      return hash.joinToString("") { byte ->
        String.format(Locale.US, "%02x", byte)
      }
    }

    fun parseIdentityHash(hex: String): ByteArray {
      val normalized = hex.trim().lowercase(Locale.US)
      require(normalized.length == IDENTITY_BEACON_SIZE * 2) {
        "Identity hash hex must be ${IDENTITY_BEACON_SIZE * 2} characters"
      }

      return ByteArray(IDENTITY_BEACON_SIZE) { index ->
        normalized.substring(index * 2, index * 2 + 2).toInt(16).toByte()
      }
    }

    fun parseIdentityFromScanResult(result: ScanResult): ByteArray? {
      val scanRecord = result.scanRecord ?: return null
      val serviceData = scanRecord.getServiceData(ParcelUuid(SERVICE_UUID)) ?: return null
      return if (serviceData.size == IDENTITY_BEACON_SIZE) serviceData.copyOf() else null
    }
  }
}
