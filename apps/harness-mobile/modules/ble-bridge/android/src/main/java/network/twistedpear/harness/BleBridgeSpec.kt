package network.twistedpear.harness

import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattService
import android.bluetooth.le.ScanResult
import android.os.ParcelUuid
import java.util.Locale
import java.util.UUID

/** BLE GATT constants and pure helpers shared by the native bridge and unit tests. */
object BleBridgeSpec {
    const val IDENTITY_BEACON_SIZE = 16
    const val DEFAULT_MTU = 247
    const val TARGET_MTU = 512
    const val MTU_FALLBACK_DELAY_MS = 500L

    val SERVICE_UUID: UUID = UUID.fromString("6e6f0001-7e3a-4f2d-9b1c-8a5d3e2f1a0b")
    val DATA_CHARACTERISTIC_UUID: UUID = UUID.fromString("6e6f0002-7e3a-4f2d-9b1c-8a5d3e2f1a0b")
    val CONTROL_CHARACTERISTIC_UUID: UUID = UUID.fromString("6e6f0003-7e3a-4f2d-9b1c-8a5d3e2f1a0b")
    val CLIENT_CONFIG_DESCRIPTOR_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

    /** Spec tie-break: lower hash acts as central (initiator). */
    fun shouldActAsCentral(
        localHash: ByteArray,
        peerHash: ByteArray,
    ): Boolean {
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

    fun buildGattService(identityHash: ByteArray): BluetoothGattService {
        val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)

        val dataChar =
            BluetoothGattCharacteristic(
                DATA_CHARACTERISTIC_UUID,
                BluetoothGattCharacteristic.PROPERTY_WRITE or
                    BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE or
                    BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                BluetoothGattCharacteristic.PERMISSION_WRITE,
            )

        val notifyDescriptor =
            BluetoothGattDescriptor(
                CLIENT_CONFIG_DESCRIPTOR_UUID,
                BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE,
            )
        dataChar.addDescriptor(notifyDescriptor)

        val controlChar =
            BluetoothGattCharacteristic(
                CONTROL_CHARACTERISTIC_UUID,
                BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_WRITE,
                BluetoothGattCharacteristic.PERMISSION_READ or BluetoothGattCharacteristic.PERMISSION_WRITE,
            )
        controlChar.value = identityHash.copyOf()

        service.addCharacteristic(dataChar)
        service.addCharacteristic(controlChar)
        return service
    }

    fun parseIdentityFromScanResult(result: ScanResult): ByteArray? {
        val scanRecord = result.scanRecord ?: return null
        val serviceData = scanRecord.getServiceData(ParcelUuid(SERVICE_UUID)) ?: return null
        return if (serviceData.size == IDENTITY_BEACON_SIZE) serviceData.copyOf() else null
    }
}
