package expo.modules.twistedpear.multicast

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import network.twistedpear.harness.MulticastBridge
import network.twistedpear.harness.MulticastNetworkInfo

class MulticastModule : Module() {
    private var bridge: MulticastBridge? = null

    override fun definition() =
        ModuleDefinition {
            Name("TwistedPearMulticast")

            Events("onPacket", "onNetworkChange")

            AsyncFunction("start") {
                val context = appContext.reactContext?.applicationContext ?: return@AsyncFunction false
                val active = bridge ?: MulticastBridge(context).also { bridge = it }

                active.setListener(
                    object : MulticastBridge.Listener {
                        override fun onPacket(
                            ifname: String,
                            data: ByteArray,
                            sourceAddress: String,
                            port: Int,
                        ) {
                            sendEvent(
                                "onPacket",
                                mapOf(
                                    "ifname" to ifname,
                                    "data" to data,
                                    "sourceAddress" to sourceAddress,
                                    "port" to port,
                                ),
                            )
                        }

                        override fun onNetworkChange(interfaces: List<MulticastNetworkInfo>) {
                            sendEvent(
                                "onNetworkChange",
                                mapOf(
                                    "interfaces" to
                                        interfaces.map { iface ->
                                            mapOf(
                                                "name" to iface.name,
                                                "linkLocalAddress" to iface.linkLocalAddress,
                                            )
                                        },
                                ),
                            )
                        }
                    },
                )

                active.start()
                sendEvent(
                    "onNetworkChange",
                    mapOf(
                        "interfaces" to
                            active.getInterfaces().map { iface ->
                                mapOf(
                                    "name" to iface.name,
                                    "linkLocalAddress" to iface.linkLocalAddress,
                                )
                            },
                    ),
                )
                true
            }

            AsyncFunction("stop") {
                bridge?.stop()
                bridge?.setListener(null)
                bridge = null
                true
            }

            Function("getInterfaces") {
                bridge?.getInterfaces()?.map { iface ->
                    mapOf(
                        "name" to iface.name,
                        "linkLocalAddress" to iface.linkLocalAddress,
                    )
                } ?: emptyList<Map<String, String>>()
            }

            AsyncFunction("joinGroup") { ifname: String, groupAddress: String, port: Int ->
                bridge?.joinGroup(ifname, groupAddress, port)
                true
            }

            AsyncFunction("bindPort") { ifname: String, port: Int ->
                bridge?.bindPort(ifname, port)
                true
            }

            AsyncFunction("send") { ifname: String, groupAddress: String, port: Int, data: ByteArray ->
                bridge?.send(ifname, groupAddress, port, data)
                true
            }

            AsyncFunction("sendUnicast") { ifname: String, targetAddress: String, port: Int, data: ByteArray ->
                bridge?.sendUnicast(ifname, targetAddress, port, data)
                true
            }
        }
}
