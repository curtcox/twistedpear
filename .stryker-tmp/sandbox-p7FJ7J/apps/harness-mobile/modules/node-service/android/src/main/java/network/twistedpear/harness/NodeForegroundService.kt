package network.twistedpear.harness

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * Keeps the Reticulum worklet process eligible to run while the harness is backgrounded.
 * START_STICKY allows the system to restart the service after process death.
 */
class NodeForegroundService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    startForeground(NOTIFICATION_ID, buildNotification())
    isRunning = true
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (!isRunning) {
      startForeground(NOTIFICATION_ID, buildNotification())
      isRunning = true
    }

    return START_STICKY
  }

  override fun onDestroy() {
    isRunning = false
    super.onDestroy()
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    // Keep routing while the user swipes the app away; OEM killers may still stop us.
    val restartIntent = Intent(applicationContext, NodeForegroundService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      applicationContext.startForegroundService(restartIntent)
    } else {
      applicationContext.startService(restartIntent)
    }

    super.onTaskRemoved(rootIntent)
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel = NotificationChannel(
      CHANNEL_ID,
      CHANNEL_NAME,
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Reticulum node routing while the harness is backgrounded"
      setShowBadge(false)
    }

    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent = PendingIntent.getActivity(
      this,
      0,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("TwistedPear node active")
      .setContentText("Reticulum routing in background")
      .setSmallIcon(android.R.drawable.stat_sys_upload)
      .setContentIntent(pendingIntent)
      .setOngoing(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .build()
  }

  companion object {
    const val CHANNEL_ID = "twistedpear_node"
    const val CHANNEL_NAME = "TwistedPear Node"
    const val NOTIFICATION_ID = 1001

    @Volatile
    var isRunning: Boolean = false
      private set
  }
}
