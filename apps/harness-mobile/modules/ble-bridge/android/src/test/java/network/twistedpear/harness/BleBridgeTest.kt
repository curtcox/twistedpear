package network.twistedpear.harness

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BleBridgeTest {
  @Test
  fun shouldActAsCentral_prefersLexicographicallyLowerHash() {
    val lower = ByteArray(BleBridge.IDENTITY_BEACON_SIZE) { index -> (index + 1).toByte() }
    val higher = lower.copyOf()
    higher[15] = 0x7f

    assertTrue(BleBridge.shouldActAsCentral(lower, higher))
    assertFalse(BleBridge.shouldActAsCentral(higher, lower))
  }

  @Test
  fun formatAndParseIdentityHash_roundTrip() {
    val hash = ByteArray(BleBridge.IDENTITY_BEACON_SIZE) { index -> (index * 3).toByte() }
    val formatted = BleBridge.formatIdentityHash(hash)
    assertArrayEquals(hash, BleBridge.parseIdentityHash(formatted))
  }

  @Test
  fun serviceUuids_matchBleInterfaceSpec() {
    assertTrue(BleBridge.SERVICE_UUID.toString().startsWith("6e6f0001-"))
    assertTrue(BleBridge.DATA_CHARACTERISTIC_UUID.toString().startsWith("6e6f0002-"))
    assertTrue(BleBridge.CONTROL_CHARACTERISTIC_UUID.toString().startsWith("6e6f0003-"))
  }
}
