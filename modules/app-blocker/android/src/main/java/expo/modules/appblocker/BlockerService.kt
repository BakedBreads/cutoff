package expo.modules.appblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

/**
 * Keeps the countdown alive while you're inside the other app, then fires the
 * block screen. Runs as a foreground service so Android won't kill it mid-session.
 */
class BlockerService : Service() {

    companion object {
        const val ACTION_START = "cutoff.START"
        const val ACTION_STOP = "cutoff.STOP"

        private const val CHANNEL_ID = "cutoff.session"
        private const val NOTIF_ID = 4711

        fun start(context: Context) {
            val intent = Intent(context, BlockerService::class.java).setAction(ACTION_START)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            try {
                context.startService(
                    Intent(context, BlockerService::class.java).setAction(ACTION_STOP)
                )
            } catch (_: Exception) {
                // Service may already be gone; nothing to stop.
            }
        }
    }

    private val handler = Handler(Looper.getMainLooper())
    private var lastNotifText = ""

    private val tick = object : Runnable {
        override fun run() {
            if (step()) handler.postDelayed(this, 1000L)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                Session.clear(this)
                Session.endLockout(this)
                Overlay.dismiss(this)
                shutdown()
                return START_NOT_STICKY
            }
            else -> {
                createChannel()
                goForeground(buildNotification(Session.remainingMs(this)))
                handler.removeCallbacks(tick)
                handler.post(tick)
            }
        }
        // Restart if the OS kills us — state lives in SharedPreferences.
        return START_STICKY
    }

    override fun onDestroy() {
        handler.removeCallbacks(tick)
        super.onDestroy()
    }

    // ---- the loop -----------------------------------------------------------

    /** @return true to keep ticking. */
    private fun step(): Boolean {
        val running = Session.isRunning(this)
        val remaining = Session.remainingMs(this)

        if (running) {
            if (remaining <= 0L) {
                fire()
            } else {
                updateNotification(remaining)
            }
            return true
        }

        // Not running — we're either in lockout, or done.
        if (Session.inLockout(this)) {
            watchLockout()
            return true
        }

        if (Overlay.isShowing) {
            // Let the user keep the block screen up as long as they want.
            return true
        }

        shutdown()
        return false
    }

    private fun fire() {
        Session.markExpired(this)
        Overlay.show(
            context = this,
            title = Session.title(this),
            subtitle = Session.subtitle(this),
            appLabel = Session.label(this),
            spentMs = Session.durationMs(this),
            lockoutMs = Session.lockoutMs(this),
            dark = Session.isDark(this),
            vibrate = Session.shouldVibrate(this)
        )
        updateNotification(0L)
    }

    /** During lockout, reopening the blocked app slams the screen back up. */
    private fun watchLockout() {
        updateNotification(0L)
        Overlay.updateLockout(
            "LOCKED FOR ${
            fmt((Session.lockoutUntil(this) - System.currentTimeMillis()).coerceAtLeast(0L))
            }"
        )
        if (Overlay.isShowing) return

        val blocked = Session.blockedPackage(this)
        if (blocked.isEmpty()) return

        val current = Usage.foregroundPackage(this) ?: return
        if (current == blocked) {
            Overlay.show(
                context = this,
                title = Session.title(this),
                subtitle = Session.subtitle(this),
                appLabel = Session.label(this),
                spentMs = Session.durationMs(this),
                lockoutMs = (Session.lockoutUntil(this) - System.currentTimeMillis())
                    .coerceAtLeast(0L),
                dark = Session.isDark(this),
                vibrate = Session.shouldVibrate(this)
            )
        }
    }

    private fun shutdown() {
        handler.removeCallbacks(tick)
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    // ---- notification -------------------------------------------------------

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Session timer",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Shows the countdown while a timed session is running."
            setShowBadge(false)
            enableVibration(false)
            setSound(null, null)
        }
        nm.createNotificationChannel(channel)
    }

    private fun goForeground(notification: Notification) {
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
        } else {
            0
        }
        try {
            ServiceCompat.startForeground(this, NOTIF_ID, notification, type)
        } catch (e: Exception) {
            // Some OEMs are strict; the timer still works via the handler loop.
        }
    }

    private fun updateNotification(remaining: Long) {
        val text = notifText(remaining)
        if (text == lastNotifText) return
        lastNotifText = text
        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.notify(NOTIF_ID, buildNotification(remaining))
        } catch (_: Exception) {
        }
    }

    private fun notifText(remaining: Long): String {
        val label = Session.label(this).ifEmpty { "Session" }
        return when {
            Session.isRunning(this) -> "$label · ${fmt(remaining)} left"
            Session.inLockout(this) ->
                "$label locked · ${fmt((Session.lockoutUntil(this) - System.currentTimeMillis()).coerceAtLeast(0L))} left"
            else -> "Time's up"
        }
    }

    private fun buildNotification(remaining: Long): Notification {
        val open = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
            (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)

        val contentPI = open?.let { PendingIntent.getActivity(this, 0, it, flags) }
        val stopPI = PendingIntent.getService(
            this, 1,
            Intent(this, BlockerService::class.java).setAction(ACTION_STOP),
            flags
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(if (Session.isRunning(this)) "Cutoff running" else "Cutoff")
            .setContentText(notifText(remaining))
            .setSmallIcon(applicationInfo.icon)
            .setOngoing(true)
            .setSilent(true)
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .apply { contentPI?.let { setContentIntent(it) } }
            .addAction(0, "End session", stopPI)
            .build()
    }

    private fun fmt(ms: Long): String {
        val total = (ms / 1000L).toInt()
        val h = total / 3600
        val m = (total % 3600) / 60
        val s = total % 60
        return if (h > 0) String.format("%d:%02d:%02d", h, m, s)
        else String.format("%d:%02d", m, s)
    }
}
