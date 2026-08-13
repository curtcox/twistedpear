package expo.modules.twistedpear.blebridge

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import network.twistedpear.harness.BleBridge

class BleBridgeModule : Module() {
    private var bridge: BleBridge? = null

    override fun definition() =
        ModuleDefinition {
            Name("TwistedPearBleBridge")

            Events("onData", "onConnect", "onDisconnect", "onError", "onPeerDiscovered")

            AsyncFunction("start") { identityHash: ByteArray ->
                val context = appContext.reactContext?.applicationContext ?: return@AsyncFunction false
                val active = bridge ?: BleBridge(context).also { bridge = it }

                active.setIdentityHash(identityHash)
                active.setListener(
                    object : BleBridge.Listener {
                        override fun onData(data: ByteArray) {
                            sendEvent("onData", mapOf("data" to data))
                        }

                        override fun onConnect() {
                            sendEvent("onConnect", mapOf("mtu" to active.getMtu()))
                        }

                        override fun onDisconnect() {
                            sendEvent("onDisconnect", emptyMap<String, Any>())
                        }

                        override fun onError(message: String) {
                            sendEvent("onError", mapOf("message" to message))
                        }

                        override fun onPeerDiscovered(
                            peerIdentityHash: ByteArray,
                            deviceAddress: String,
                        ) {
                            sendEvent(
                                "onPeerDiscovered",
                                mapOf(
                                    "peerIdentityHash" to peerIdentityHash,
                                    "deviceAddress" to deviceAddress,
                                ),
                            )
                        }
                    },
                )

                active.start()
                true
            }

            AsyncFunction("stop") {
                bridge?.stop()
                bridge?.setListener(null)
                bridge = null
                true
            }

            AsyncFunction("write") { data: ByteArray ->
                bridge?.write(data)
                true
            }

            Function("isConnected") {
                bridge?.isConnected() ?: false
            }

            Function("getMtu") {
                bridge?.getMtu() ?: BleBridge.DEFAULT_MTU
            }

            Function("shouldActAsCentral") { localHash: ByteArray, peerHash: ByteArray ->
                BleBridge.shouldActAsCentral(localHash, peerHash)
            }
        }
}
