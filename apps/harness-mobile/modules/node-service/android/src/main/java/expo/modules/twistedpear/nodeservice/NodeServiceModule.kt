package expo.modules.twistedpear.nodeservice

import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import network.twistedpear.harness.NodeForegroundService

class NodeServiceModule : Module() {
    override fun definition() =
        ModuleDefinition {
            Name("TwistedPearNodeService")

            AsyncFunction("start") {
                val context = appContext.reactContext ?: return@AsyncFunction false
                val intent = Intent(context, NodeForegroundService::class.java)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }

                true
            }

            AsyncFunction("stop") {
                val context = appContext.reactContext ?: return@AsyncFunction false
                val intent = Intent(context, NodeForegroundService::class.java)
                context.stopService(intent)
                // isRunning clears in NodeForegroundService.onDestroy
                true
            }

            Function("isRunning") {
                NodeForegroundService.isRunning
            }
        }
}
