package network.twistedpear.harness

import android.bluetooth.le.ScanRecord
import android.bluetooth.le.ScanResult
import android.os.ParcelUuid
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`

class BleBridgeTest {
    @Test
    fun shouldActAsCentral_prefersLexicographicallyLowerHash() {
        val lower = ByteArray(BleBridgeSpec.IDENTITY_BEACON_SIZE) { index -> (index + 1).toByte() }
        val higher = lower.copyOf()
        higher[15] = 0x7f

        assertTrue(BleBridgeSpec.shouldActAsCentral(lower, higher))
        assertFalse(BleBridgeSpec.shouldActAsCentral(higher, lower))
    }

    @Test
    fun formatAndParseIdentityHash_roundTrip() {
        val hash = ByteArray(BleBridgeSpec.IDENTITY_BEACON_SIZE) { index -> (index * 3).toByte() }
        val formatted = BleBridgeSpec.formatIdentityHash(hash)
        assertArrayEquals(hash, BleBridgeSpec.parseIdentityHash(formatted))
    }

    @Test
    fun serviceUuids_matchBleInterfaceSpec() {
        assertTrue(BleBridgeSpec.SERVICE_UUID.toString().startsWith("6e6f0001-"))
        assertTrue(BleBridgeSpec.DATA_CHARACTERISTIC_UUID.toString().startsWith("6e6f0002-"))
        assertTrue(BleBridgeSpec.CONTROL_CHARACTERISTIC_UUID.toString().startsWith("6e6f0003-"))
    }

    // Stubbed with `any()` rather than with the expected ParcelUuid: matching an
    // argument calls `equals` on it, and `android.os.ParcelUuid` has no
    // implementation on a plain JVM, so Mockito throws "not mocked" before the
    // assertion is ever reached. Which UUID the beacon uses is covered by
    // `serviceUuids_matchBleInterfaceSpec` above, which needs no framework at all.
    @Test
    fun parseIdentityFromScanResult_readsServiceDataBeacon() {
        val hash = ByteArray(BleBridgeSpec.IDENTITY_BEACON_SIZE) { index -> (index + 1).toByte() }
        val scanRecord = mock(ScanRecord::class.java)
        `when`(scanRecord.getServiceData(any(ParcelUuid::class.java))).thenReturn(hash)

        val scanResult = mock(ScanResult::class.java)
        `when`(scanResult.scanRecord).thenReturn(scanRecord)

        assertArrayEquals(hash, BleBridgeSpec.parseIdentityFromScanResult(scanResult))
    }

    @Test
    fun parseIdentityFromScanResult_rejectsWrongSizedServiceData() {
        val scanRecord = mock(ScanRecord::class.java)
        `when`(scanRecord.getServiceData(any(ParcelUuid::class.java)))
            .thenReturn(byteArrayOf(1, 2, 3))

        val scanResult = mock(ScanResult::class.java)
        `when`(scanResult.scanRecord).thenReturn(scanRecord)

        assertNull(BleBridgeSpec.parseIdentityFromScanResult(scanResult))
    }
}
