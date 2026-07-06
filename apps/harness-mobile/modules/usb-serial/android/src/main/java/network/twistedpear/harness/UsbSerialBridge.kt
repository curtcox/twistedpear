package network.twistedpear.harness

import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

data class UsbSerialDeviceInfo(
  val deviceId: Int,
  val vendorId: Int,
  val productId: Int,
  val deviceName: String?,
  val hasPermission: Boolean,
  val isCdcAcm: Boolean
)

/**
 * Raw CDC ACM USB-serial byte pipe for RNode and similar devices.
 * Exposes a dumb read/write stream; KISS framing stays in TypeScript.
 */
class UsbSerialBridge(private val usbManager: UsbManager) {
  interface Listener {
    fun onData(data: ByteArray)
    fun onConnect(deviceName: String)
    fun onDisconnect()
    fun onError(message: String)
    fun onDeviceAttached(device: UsbSerialDeviceInfo)
    fun onDeviceDetached(deviceId: Int)
    fun onPermissionResult(deviceId: Int, granted: Boolean)
  }

  @Volatile
  private var listener: Listener? = null

  private val running = AtomicBoolean(false)
  private var readThread: Thread? = null
  private var connection: UsbDeviceConnection? = null
  private var dataInterface: UsbInterface? = null
  private var controlInterface: UsbInterface? = null
  private var readEndpoint: UsbEndpoint? = null
  private var writeEndpoint: UsbEndpoint? = null

  @Volatile
  private var connected = false

  @Volatile
  private var openDeviceId: Int? = null

  fun setListener(listener: Listener?) {
    this.listener = listener
  }

  fun isConnected(): Boolean = connected

  fun getOpenDeviceId(): Int? = openDeviceId

  fun listDevices(): List<UsbSerialDeviceInfo> {
    return usbManager.deviceList.values
      .map { device -> toDeviceInfo(device) }
      .sortedBy { it.deviceId }
  }

  fun hasPermission(deviceId: Int): Boolean {
    val device = findDevice(deviceId) ?: return false
    return usbManager.hasPermission(device)
  }

  fun requestPermission(deviceId: Int, permissionIntent: android.app.PendingIntent): Boolean {
    val device = findDevice(deviceId) ?: return false
    if (usbManager.hasPermission(device)) {
      listener?.onPermissionResult(deviceId, true)
      return true
    }

    usbManager.requestPermission(device, permissionIntent)
    return true
  }

  fun handlePermissionResult(deviceId: Int, granted: Boolean) {
    listener?.onPermissionResult(deviceId, granted)
  }

  fun notifyDeviceAttached(device: UsbDevice) {
    listener?.onDeviceAttached(toDeviceInfo(device))
  }

  fun notifyDeviceDetached(deviceId: Int) {
    if (openDeviceId == deviceId) {
      close()
    }

    listener?.onDeviceDetached(deviceId)
  }

  fun open(deviceId: Int, baudRate: Int = DEFAULT_BAUD_RATE): Boolean {
    if (connected) {
      listener?.onError("USB serial pipe already open")
      return false
    }

    val device = findDevice(deviceId)
    if (device === null) {
      listener?.onError("USB device $deviceId not found")
      return false
    }

    if (!usbManager.hasPermission(device)) {
      listener?.onError("USB permission not granted for device $deviceId")
      return false
    }

    val endpoints = findCdcAcmEndpoints(device)
    if (endpoints === null) {
      listener?.onError("Device is not a supported CDC ACM serial adapter")
      return false
    }

    val activeConnection = usbManager.openDevice(device)
    if (activeConnection === null) {
      listener?.onError("Failed to open USB device")
      return false
    }

    if (!activeConnection.claimInterface(endpoints.controlInterface, true)) {
      activeConnection.close()
      listener?.onError("Failed to claim USB control interface")
      return false
    }

    if (!activeConnection.claimInterface(endpoints.dataInterface, true)) {
      activeConnection.releaseInterface(endpoints.controlInterface)
      activeConnection.close()
      listener?.onError("Failed to claim USB data interface")
      return false
    }

    if (!setLineCoding(activeConnection, endpoints.controlInterface, baudRate)) {
      activeConnection.releaseInterface(endpoints.dataInterface)
      activeConnection.releaseInterface(endpoints.controlInterface)
      activeConnection.close()
      listener?.onError("Failed to configure USB serial line coding")
      return false
    }

    connection = activeConnection
    controlInterface = endpoints.controlInterface
    dataInterface = endpoints.dataInterface
    readEndpoint = endpoints.readEndpoint
    writeEndpoint = endpoints.writeEndpoint
    openDeviceId = deviceId
    connected = true
    running.set(true)

    readThread = thread(name = "twistedpear-usb-serial-read", isDaemon = true) {
      readLoop()
    }

    listener?.onConnect(device.deviceName ?: "usb-$deviceId")
    return true
  }

  fun close() {
    if (!running.compareAndSet(true, false)) {
      return
    }

    readThread?.interrupt()
    readThread = null

    val activeConnection = connection
    val activeControl = controlInterface
    val activeData = dataInterface

    connection = null
    controlInterface = null
    dataInterface = null
    readEndpoint = null
    writeEndpoint = null
    openDeviceId = null

    if (activeData !== null && activeConnection !== null) {
      activeConnection.releaseInterface(activeData)
    }

    if (activeControl !== null && activeConnection !== null) {
      activeConnection.releaseInterface(activeControl)
    }

    activeConnection?.close()

    if (connected) {
      connected = false
      listener?.onDisconnect()
    }
  }

  fun write(data: ByteArray) {
    if (!connected) {
      listener?.onError("USB serial pipe is not connected")
      return
    }

    val activeConnection = connection ?: return
    val endpoint = writeEndpoint ?: return

    var offset = 0
    while (offset < data.size) {
      val chunkSize = minOf(endpoint.maxPacketSize, data.size - offset)
      val written = activeConnection.bulkTransfer(
        endpoint,
        data,
        offset,
        chunkSize,
        WRITE_TIMEOUT_MS
      )

      if (written < 0) {
        listener?.onError("USB serial write failed ($written)")
        close()
        return
      }

      offset += written
    }
  }

  private fun readLoop() {
    val activeConnection = connection ?: return
    val endpoint = readEndpoint ?: return
    val buffer = ByteArray(endpoint.maxPacketSize.coerceAtLeast(64))

    while (running.get() && connected) {
      val read = activeConnection.bulkTransfer(endpoint, buffer, buffer.size, READ_TIMEOUT_MS)
      if (read < 0) {
        if (running.get()) {
          listener?.onError("USB serial read failed ($read)")
          close()
        }
        return
      }

      if (read > 0) {
        listener?.onData(buffer.copyOf(read))
      }
    }
  }

  private fun findDevice(deviceId: Int): UsbDevice? {
    return usbManager.deviceList.values.firstOrNull { it.deviceId == deviceId }
  }

  private fun toDeviceInfo(device: UsbDevice): UsbSerialDeviceInfo {
    return UsbSerialDeviceInfo(
      deviceId = device.deviceId,
      vendorId = device.vendorId,
      productId = device.productId,
      deviceName = device.deviceName,
      hasPermission = usbManager.hasPermission(device),
      isCdcAcm = findCdcAcmEndpoints(device) !== null
    )
  }

  companion object {
    const val DEFAULT_BAUD_RATE = 115_200
    const val USB_PERMISSION_ACTION = "network.twistedpear.harness.USB_PERMISSION"

    private const val CDC_SUBCLASS_ACM = 2
    private const val CDC_CLASS_COMMUNICATION = 2
    private const val CDC_CLASS_DATA = 10
    private const val CDC_SET_LINE_CODING = 0x20
    private const val READ_TIMEOUT_MS = 250
    private const val WRITE_TIMEOUT_MS = 1_000

    /** Known USB IDs used by common RNode adapters (CP210x, FTDI, CH340). */
    val KNOWN_RNODE_USB_IDS: Set<Pair<Int, Int>> = setOf(
      0x10C4 to 0xEA60,
      0x0403 to 0x6001,
      0x1A86 to 0x7523
    )

    fun isKnownRNodeUsbId(vendorId: Int, productId: Int): Boolean {
      return KNOWN_RNODE_USB_IDS.contains(vendorId to productId)
    }

    fun encodeLineCoding(baudRate: Int): ByteArray {
      return ByteBuffer.allocate(7)
        .order(ByteOrder.LITTLE_ENDIAN)
        .putInt(baudRate)
        .put(0) // 1 stop bit
        .put(0) // no parity
        .put(8) // 8 data bits
        .array()
    }

    data class CdcAcmEndpoints(
      val controlInterface: UsbInterface,
      val dataInterface: UsbInterface,
      val readEndpoint: UsbEndpoint,
      val writeEndpoint: UsbEndpoint
    )

    fun findCdcAcmEndpoints(device: UsbDevice): CdcAcmEndpoints? {
      var controlInterface: UsbInterface? = null
      var dataInterface: UsbInterface? = null

      for (index in 0 until device.interfaceCount) {
        val usbInterface = device.getInterface(index)
        if (usbInterface.interfaceClass == CDC_CLASS_COMMUNICATION &&
          usbInterface.interfaceSubclass == CDC_SUBCLASS_ACM
        ) {
          controlInterface = usbInterface
        } else if (usbInterface.interfaceClass == CDC_CLASS_DATA) {
          dataInterface = usbInterface
        }
      }

      if (controlInterface === null || dataInterface === null) {
        return null
      }

      var readEndpoint: UsbEndpoint? = null
      var writeEndpoint: UsbEndpoint? = null

      for (index in 0 until dataInterface.endpointCount) {
        val endpoint = dataInterface.getEndpoint(index)
        if (endpoint.type != UsbConstants.USB_ENDPOINT_XFER_BULK) {
          continue
        }

        if (endpoint.direction == UsbConstants.USB_DIR_IN) {
          readEndpoint = endpoint
        } else if (endpoint.direction == UsbConstants.USB_DIR_OUT) {
          writeEndpoint = endpoint
        }
      }

      if (readEndpoint === null || writeEndpoint === null) {
        return null
      }

      return CdcAcmEndpoints(controlInterface, dataInterface, readEndpoint, writeEndpoint)
    }

    private fun setLineCoding(
      connection: UsbDeviceConnection,
      controlInterface: UsbInterface,
      baudRate: Int
    ): Boolean {
      val result = connection.controlTransfer(
        0x21,
        CDC_SET_LINE_CODING,
        0,
        controlInterface.id,
        encodeLineCoding(baudRate),
        WRITE_TIMEOUT_MS
      )

      return result >= 0
    }
  }
}
