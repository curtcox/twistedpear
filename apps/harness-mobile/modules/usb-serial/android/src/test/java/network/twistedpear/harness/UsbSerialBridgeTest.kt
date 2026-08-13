package network.twistedpear.harness

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class UsbSerialBridgeTest {
    @Test
    fun encodeLineCoding_usesLittleEndianBaudRate() {
        val encoded = UsbSerialBridge.encodeLineCoding(115_200)
        assertArrayEquals(
            byteArrayOf(0x00, 0xC2.toByte(), 0x01, 0x00, 0x00, 0x00, 0x08),
            encoded,
        )
    }

    @Test
    fun isKnownRNodeUsbId_recognizesCommonAdapters() {
        assertTrue(UsbSerialBridge.isKnownRNodeUsbId(0x10C4, 0xEA60))
        assertTrue(UsbSerialBridge.isKnownRNodeUsbId(0x0403, 0x6001))
        assertTrue(UsbSerialBridge.isKnownRNodeUsbId(0x1A86, 0x7523))
        assertFalse(UsbSerialBridge.isKnownRNodeUsbId(0x1234, 0x5678))
    }

    @Test
    fun usbPermissionAction_isStable() {
        assertTrue(UsbSerialBridge.USB_PERMISSION_ACTION.startsWith("network.twistedpear.harness."))
    }
}
