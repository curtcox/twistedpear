package network.twistedpear.harness

import org.junit.Assert.assertEquals
import org.junit.Test

class MulticastBridgeTest {
    @Test
    fun descopeLinkLocal_normalizesEmbeddedInterfaceId() {
        assertEquals(
            "fe80::1",
            MulticastBridge.descopeLinkLocal("fe80:0:0:0:0:0:0:1%wlan0"),
        )
    }

    @Test
    fun descopeLinkLocal_preservesUnscopedAddress() {
        assertEquals(
            "fe80::aabb:ccff:fede:beef",
            MulticastBridge.descopeLinkLocal("fe80::aabb:ccff:fede:beef"),
        )
    }
}
