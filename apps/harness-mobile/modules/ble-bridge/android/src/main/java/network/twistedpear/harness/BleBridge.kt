package network.twistedpear.harness

import java.util.Locale
import java.util.UUID

/**
 * BLE GATT central + peripheral bridge for the Reticulum BLE interface spec.
 * Exposes a half-duplex byte pipe once a peer connection is established.
 */
class BleBridge {
  interface Listener {
    fun onData(data: ByteArray)
    fun onConnect()
    fun onDisconnect()
    fun onError(message: String)
    fun onPeerDiscovered(peerIdentityHash: ByteArray, deviceAddress: String)
  }

  @Volatile
  private var listener: Listener? = null

  @Volatile
  private var identityHash: ByteArray = ByteArray(IDENTITY_BEACON_SIZE)

  @Volatile
  private var connected = false

  @Volatile
  private var negotiatedMtu: Int = DEFAULT_MTU

  fun setListener(listener: Listener?) {
    this.listener = listener
  }

  fun setIdentityHash(hash: ByteArray) {
    require(hash.size == IDENTITY_BEACON_SIZE) {
      "Identity hash must be $IDENTITY_BEACON_SIZE bytes, got ${hash.size}"
    }
    identityHash = hash.copyOf()
  }

  fun getIdentityHash(): ByteArray = identityHash.copyOf()

  fun isConnected(): Boolean = connected

  fun getMtu(): Int = negotiatedMtu

  fun start() {
    // Native GATT wiring is device-gated (H2). The bridge surface is stable for TS tests.
    listener?.onError("BLE hardware bridge not active in this build; use SimulatedBlePipe in worklet")
  }

  fun stop() {
    if (connected) {
      connected = false
      listener?.onDisconnect()
    }
  }

  fun write(data: ByteArray) {
    if (!connected) {
      listener?.onError("BLE pipe is not connected")
      return
    }

    listener?.onData(data)
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

  companion object {
    const val IDENTITY_BEACON_SIZE = 16
    const val DEFAULT_MTU = 247
    const val TARGET_MTU = 512

    val SERVICE_UUID: UUID = UUID.fromString("6e6f0001-7e3a-4f2d-9b1c-8a5d3e2f1a0b")
    val DATA_CHARACTERISTIC_UUID: UUID = UUID.fromString("6e6f0002-7e3a-4f2d-9b1c-8a5d3e2f1a0b")
    val CONTROL_CHARACTERISTIC_UUID: UUID = UUID.fromString("6e6f0003-7e3a-4f2d-9b1c-8a5d3e2f1a0b")

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
  }
}
