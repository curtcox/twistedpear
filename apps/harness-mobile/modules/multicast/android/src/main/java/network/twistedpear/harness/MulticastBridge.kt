package network.twistedpear.harness

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.WifiManager
import android.os.Build
import java.net.DatagramPacket
import java.net.Inet6Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.MulticastSocket
import java.net.NetworkInterface
import java.net.SocketException
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

data class MulticastNetworkInfo(
    val name: String,
    val linkLocalAddress: String,
)

/**
 * IPv6 UDP multicast bridge with MulticastLock for AutoInterface on Android.
 */
class MulticastBridge(
    private val context: Context,
) {
    interface Listener {
        fun onPacket(
            ifname: String,
            data: ByteArray,
            sourceAddress: String,
            port: Int,
        )

        fun onNetworkChange(interfaces: List<MulticastNetworkInfo>)
    }

    @Volatile
    private var listener: Listener? = null

    private val running = AtomicBoolean(false)
    private val executor = Executors.newCachedThreadPool()
    private val multicastLock: WifiManager.MulticastLock? =
        (context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager)
            ?.createMulticastLock("twistedpear-auto")
            ?.apply { setReferenceCounted(true) }

    private val joinedGroups = ConcurrentHashMap<String, MulticastSocket>()
    private val boundPorts = ConcurrentHashMap<String, MulticastSocket>()
    private val readThreads = ConcurrentHashMap<String, Thread>()
    private var connectivityManager: ConnectivityManager? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    fun setListener(listener: Listener?) {
        this.listener = listener
    }

    fun start() {
        if (!running.compareAndSet(false, true)) {
            return
        }

        multicastLock?.acquire()
        registerNetworkCallback()
        notifyNetworkChange()
    }

    fun stop() {
        if (!running.compareAndSet(true, false)) {
            return
        }

        unregisterNetworkCallback()
        closeAllSockets()
        multicastLock?.release()
    }

    fun getInterfaces(): List<MulticastNetworkInfo> = enumerateLinkLocalInterfaces()

    fun joinGroup(
        ifname: String,
        groupAddress: String,
        port: Int,
    ) {
        if (!running.get()) {
            return
        }

        val key = "$ifname:$groupAddress:$port"
        if (joinedGroups.containsKey(key)) {
            return
        }

        val socket = openSocket(ifname, port, reuse = true) ?: return
        try {
            val group = InetAddress.getByName(groupAddress) as Inet6Address
            val networkInterface = NetworkInterface.getByName(ifname)
            if (networkInterface !== null) {
                socket.joinGroup(InetSocketAddress(group, port), networkInterface)
            }
        } catch (_: Exception) {
            socket.close()
            return
        }

        joinedGroups[key] = socket
        startReader(key, socket, ifname)
    }

    fun bindPort(
        ifname: String,
        port: Int,
    ) {
        if (!running.get()) {
            return
        }

        val key = "$ifname:$port"
        if (boundPorts.containsKey(key)) {
            return
        }

        val socket = openSocket(ifname, port, reuse = true) ?: return
        boundPorts[key] = socket
        startReader(key, socket, ifname)
    }

    fun send(
        ifname: String,
        groupAddress: String,
        port: Int,
        data: ByteArray,
    ) {
        if (!running.get()) {
            return
        }

        executor.execute {
            var socket: MulticastSocket? = null
            try {
                socket = openSocket(ifname, 0, reuse = false)
                if (socket === null) {
                    return@execute
                }

                val group = InetAddress.getByName(groupAddress)
                val packet = DatagramPacket(data, data.size, group, port)
                val networkInterface = NetworkInterface.getByName(ifname)
                if (networkInterface !== null && group is Inet6Address) {
                    socket.networkInterface = networkInterface
                }

                socket.send(packet)
            } catch (_: Exception) {
            } finally {
                socket?.close()
            }
        }
    }

    fun sendUnicast(
        ifname: String,
        targetAddress: String,
        port: Int,
        data: ByteArray,
    ) {
        if (!running.get()) {
            return
        }

        executor.execute {
            var socket: MulticastSocket? = null
            try {
                socket = openSocket(ifname, 0, reuse = false)
                if (socket === null) {
                    return@execute
                }

                val target = InetAddress.getByName(targetAddress)
                val packet = DatagramPacket(data, data.size, target, port)
                val networkInterface = NetworkInterface.getByName(ifname)
                if (networkInterface !== null) {
                    socket.networkInterface = networkInterface
                }

                socket.send(packet)
            } catch (_: Exception) {
            } finally {
                socket?.close()
            }
        }
    }

    private fun openSocket(
        ifname: String,
        port: Int,
        reuse: Boolean,
    ): MulticastSocket? =
        try {
            val socket = MulticastSocket(port)
            socket.reuseAddress = reuse
            val networkInterface = NetworkInterface.getByName(ifname)
            if (networkInterface !== null) {
                socket.networkInterface = networkInterface
            }

            if (port > 0) {
                val bindAddress = linkLocalForInterface(ifname) ?: Inet6Address.getByName("::")
                socket.bind(InetSocketAddress(bindAddress, port))
            }

            socket
        } catch (_: Exception) {
            null
        }

    private fun startReader(
        key: String,
        socket: MulticastSocket,
        ifname: String,
    ) {
        if (readThreads.containsKey(key)) {
            return
        }

        val reader =
            thread(name = "multicast-reader-$key", isDaemon = true) {
                val buffer = ByteArray(2048)
                while (running.get() && !socket.isClosed) {
                    try {
                        val packet = DatagramPacket(buffer, buffer.size)
                        socket.receive(packet)
                        val data = packet.data.copyOf(packet.length)
                        val source = (packet.address as? Inet6Address)?.hostAddress ?: packet.address.hostAddress ?: continue
                        val port = packet.port
                        listener?.onPacket(ifname, data, descopeLinkLocal(source), port)
                    } catch (_: SocketException) {
                        break
                    } catch (_: Exception) {
                        // Ignore transient receive errors while the bridge is running.
                    }
                }
            }

        readThreads[key] = reader
    }

    private fun closeAllSockets() {
        for ((key, socket) in joinedGroups) {
            try {
                socket.close()
            } catch (_: Exception) {
            }

            joinedGroups.remove(key)
        }

        for ((key, socket) in boundPorts) {
            try {
                socket.close()
            } catch (_: Exception) {
            }

            boundPorts.remove(key)
        }

        for ((key, thread) in readThreads) {
            thread.interrupt()
            readThreads.remove(key)
        }
    }

    private fun registerNetworkCallback() {
        val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return
        connectivityManager = manager

        val callback =
            object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    notifyNetworkChange()
                }

                override fun onLost(network: Network) {
                    notifyNetworkChange()
                }

                override fun onCapabilitiesChanged(
                    network: Network,
                    capabilities: NetworkCapabilities,
                ) {
                    notifyNetworkChange()
                }
            }

        networkCallback = callback

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            manager.registerDefaultNetworkCallback(callback)
        } else {
            val request =
                NetworkRequest
                    .Builder()
                    .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    .build()
            manager.registerNetworkCallback(request, callback)
        }
    }

    private fun unregisterNetworkCallback() {
        val manager = connectivityManager ?: return
        val callback = networkCallback ?: return

        try {
            manager.unregisterNetworkCallback(callback)
        } catch (_: Exception) {
        }

        networkCallback = null
        connectivityManager = null
    }

    private fun notifyNetworkChange() {
        listener?.onNetworkChange(enumerateLinkLocalInterfaces())
    }

    private fun enumerateLinkLocalInterfaces(): List<MulticastNetworkInfo> {
        val ignored = setOf("lo", "dummy0", "tun0")
        val results = mutableListOf<MulticastNetworkInfo>()

        try {
            val interfaces = NetworkInterface.getNetworkInterfaces() ?: return emptyList()
            for (networkInterface in interfaces) {
                val name = networkInterface.name
                if (ignored.contains(name) || !networkInterface.isUp) {
                    continue
                }

                for (address in networkInterface.inetAddresses) {
                    if (address !is Inet6Address || !address.isLinkLocalAddress) {
                        continue
                    }

                    val host = descopeLinkLocal(address.hostAddress ?: continue)
                    results.add(MulticastNetworkInfo(name, host))
                    break
                }
            }
        } catch (_: Exception) {
            return emptyList()
        }

        return results
    }

    private fun linkLocalForInterface(ifname: String): Inet6Address? {
        return try {
            val networkInterface = NetworkInterface.getByName(ifname) ?: return null
            networkInterface.inetAddresses
                .asSequence()
                .filterIsInstance<Inet6Address>()
                .firstOrNull { it.isLinkLocalAddress }
        } catch (_: Exception) {
            null
        }
    }

    companion object {
        fun descopeLinkLocal(address: String): String =
            address.split("%")[0].replace(Regex("fe80:[0-9a-f]*::", RegexOption.IGNORE_CASE), "fe80::")
    }
}
