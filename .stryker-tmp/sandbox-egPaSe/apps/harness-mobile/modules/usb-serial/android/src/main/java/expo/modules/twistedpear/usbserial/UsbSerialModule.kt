package expo.modules.twistedpear.usbserial

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import network.twistedpear.harness.UsbSerialBridge
import network.twistedpear.harness.UsbSerialDeviceInfo

class UsbPermissionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != UsbSerialBridge.USB_PERMISSION_ACTION) {
      return
    }

    val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
    } else {
      @Suppress("DEPRECATION")
      intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
    } ?: return

    val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
    UsbSerialModule.handlePermissionResult(context.applicationContext, device.deviceId, granted)
  }
}

class UsbSerialModule : Module() {
  private var bridge: UsbSerialBridge? = null
  private var permissionReceiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("TwistedPearUsbSerial")

    Events("onData", "onConnect", "onDisconnect", "onError", "onDeviceAttached", "onDeviceDetached", "onPermissionResult")

    OnCreate {
      val context = appContext.reactContext?.applicationContext ?: return@OnCreate
      val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
      val active = UsbSerialBridge(usbManager).also {
        bridge = it
        activeBridge = it
      }

      active.setListener(object : UsbSerialBridge.Listener {
        override fun onData(data: ByteArray) {
          sendEvent("onData", mapOf("data" to data))
        }

        override fun onConnect(deviceName: String) {
          sendEvent("onConnect", mapOf("deviceName" to deviceName))
        }

        override fun onDisconnect() {
          sendEvent("onDisconnect", emptyMap<String, Any>())
        }

        override fun onError(message: String) {
          sendEvent("onError", mapOf("message" to message))
        }

        override fun onDeviceAttached(device: UsbSerialDeviceInfo) {
          sendEvent("onDeviceAttached", deviceToMap(device))
        }

        override fun onDeviceDetached(deviceId: Int) {
          sendEvent("onDeviceDetached", mapOf("deviceId" to deviceId))
        }

        override fun onPermissionResult(deviceId: Int, granted: Boolean) {
          sendEvent("onPermissionResult", mapOf("deviceId" to deviceId, "granted" to granted))
        }
      })

      val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
          when (intent.action) {
            UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
              val device = intent.deviceFromExtra() ?: return
              active.notifyDeviceAttached(device)
            }

            UsbManager.ACTION_USB_DEVICE_DETACHED -> {
              val device = intent.deviceFromExtra() ?: return
              active.notifyDeviceDetached(device.deviceId)
            }

            UsbSerialBridge.USB_PERMISSION_ACTION -> {
              val device = intent.deviceFromExtra() ?: return
              val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
              active.handlePermissionResult(device.deviceId, granted)
            }
          }
        }
      }

      val filter = IntentFilter().apply {
        addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
        addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        addAction(UsbSerialBridge.USB_PERMISSION_ACTION)
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        context.registerReceiver(receiver, filter)
      }

      permissionReceiver = receiver
    }

    OnDestroy {
      val context = appContext.reactContext?.applicationContext
      permissionReceiver?.let { receiver ->
        context?.unregisterReceiver(receiver)
      }
      permissionReceiver = null
      bridge?.close()
      bridge?.setListener(null)
      bridge = null
      activeBridge = null
    }

    Function("listDevices") {
      bridge?.listDevices()?.map(::deviceToMap) ?: emptyList<Map<String, Any?>>()
    }

    Function("hasPermission") { deviceId: Int ->
      bridge?.hasPermission(deviceId) ?: false
    }

    AsyncFunction("requestPermission") { deviceId: Int ->
      val context = appContext.reactContext?.applicationContext ?: return@AsyncFunction false
      val intent = PendingIntent.getBroadcast(
        context,
        deviceId,
        Intent(UsbSerialBridge.USB_PERMISSION_ACTION),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      bridge?.requestPermission(deviceId, intent) ?: false
    }

    AsyncFunction("open") { deviceId: Int, baudRate: Int ->
      bridge?.open(deviceId, baudRate) ?: false
    }

    AsyncFunction("close") {
      bridge?.close()
      true
    }

    AsyncFunction("write") { data: ByteArray ->
      bridge?.write(data)
      true
    }

    Function("isConnected") {
      bridge?.isConnected() ?: false
    }

    Function("getOpenDeviceId") {
      bridge?.getOpenDeviceId()
    }
  }

  companion object {
    @Volatile
    private var activeBridge: UsbSerialBridge? = null

    fun handlePermissionResult(context: Context, deviceId: Int, granted: Boolean) {
      activeBridge?.handlePermissionResult(deviceId, granted)
    }
  }
}

private fun deviceToMap(device: UsbSerialDeviceInfo): Map<String, Any?> {
  return mapOf(
    "deviceId" to device.deviceId,
    "vendorId" to device.vendorId,
    "productId" to device.productId,
    "deviceName" to device.deviceName,
    "hasPermission" to device.hasPermission,
    "isCdcAcm" to device.isCdcAcm
  )
}

private fun Intent.deviceFromExtra(): UsbDevice? {
  return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
  } else {
    @Suppress("DEPRECATION")
    getParcelableExtra(UsbManager.EXTRA_DEVICE)
  }
}
