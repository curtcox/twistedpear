package network.twistedpear.harness

import org.junit.Assert.assertEquals
import org.junit.Test

class MulticastBridgeTest {
  @Test
  fun descopeLinkLocal_stripsZoneAndInterfaceId() {
    assertEquals(
      "fe80::1",
      MulticastBridge.descopeLinkLocal("fe80::1%wlan0")
    )
    assertEquals(
      "fe80::dead:beef",
      MulticastBridge.descopeLinkLocal("fe80::aabb:ccff:fede:beef")
    )
  }
}
