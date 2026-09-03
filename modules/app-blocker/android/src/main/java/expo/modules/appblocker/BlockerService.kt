package expo.modules.appblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
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
        const val ACTION_OPEN_TARGET = "cutoff.OPEN_TARGET"

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
    private var lastWidgetKey = ""
    /** When the last tick ran, so a pause can absorb exactly that much time. */
    private var lastTickAt = 0L
    /**
     * Last package the system actually reported. Usage events only fire when
     * the foreground app CHANGES, so a quiet query means "still whatever it
     * was", not "nothing is running" — holding it here is what stops the timer
     * pausing itself a few seconds into every session.
     */
    private var lastKnownForeground: String? = null

    private val tick = object : Runnable {
        override fun run() {
            // Ticks every second while counting down; eases off while standing guard.
            val delay = if (Session.isRunning(this@BlockerService)) 1000L else 1500L
            if (step()) handler.postDelayed(this, delay)
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
            ACTION_OPEN_TARGET -> {
                // "Back to <app>" from the notification.
                val pkg = Session.blockedPackage(this)
                try {
                    packageManager.getLaunchIntentForPackage(pkg)
                        ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        ?.let { startActivity(it) }
                } catch (_: Exception) {
                }
                return START_STICKY
            }
            else -> {
                createChannel()
                lastTickAt = System.currentTimeMillis()
                // We just sent the user into this app, so seed the state with it
                // rather than waiting for the first usage event to arrive.
                if (Session.isRunning(this)) {
                    lastKnownForeground = Session.blockedPackage(this)
                }
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

    /**
     * Redraws the widget only when what it displays would actually change —
     * a whole second on the countdown is fine, but pushing RemoteViews on every
     * tick regardless of content is wasteful and gets throttled by the host.
     */
    private fun syncWidget(remaining: Long) {
        val key = when {
            // Pausing has to be part of the key, or the widget keeps showing a
            // live countdown that has actually stopped.
            Session.isRunning(this) ->
                "run:" + (remaining / 1000L) + ":" + Session.isPaused(this)
            Session.inLockout(this) -> "lock:" + Session.isIndefinite(this)
            else -> "idle"
        }
        if (key == lastWidgetKey) return
        lastWidgetKey = key
        CutoffWidget.refresh(this)
    }

    /** @return true to keep ticking. */
    private fun step(): Boolean {
        val running = Session.isRunning(this)
        val remaining = Session.remainingMs(this)
        syncWidget(remaining)

        if (running) {
            // The clock only moves while the app being timed is the one on
            // screen. Leave it and the deadline slides forward by however long
            // you were away, so the session resumes exactly where it stopped.
            val paused = applyPause()
            val left = Session.remainingMs(this)

            if (!paused && left <= 0L) {
                fire()
            } else {
                if (!paused && left in 1L..60_000L && !Session.hasWarned(this)) warnOneMinute()
                updateNotification(left)
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

    /**
     * Freezes the countdown whenever the timed app is not in the foreground, by
     * pushing the deadline forward rather than tracking a separate remainder --
     * the arithmetic stays in one place and survives the process being killed.
     *
     * @return true when the session is currently paused.
     */
    private fun applyPause(): Boolean {
        val now = System.currentTimeMillis()
        val previous = lastTickAt
        lastTickAt = now

        // Without usage access there is no way to know what is on screen, so
        // the timer keeps running instead of stalling forever.
        if (!Usage.hasAccess(this)) {
            Session.setPaused(this, false)
            return false
        }

        val target = Session.blockedPackage(this)

        // Only overwrite what we know when the system actually tells us something.
        Usage.foregroundPackage(this)?.let { lastKnownForeground = it }
        val current = lastKnownForeground

        // Until the system has reported anything at all, assume the session is
        // live — the app was just launched, so that is the honest default.
        val inTarget = current == null || current == target
        Session.setPaused(this, !inTarget)

        if (!inTarget && previous > 0L) {
            val away = (now - previous).coerceAtLeast(0L)
            if (away > 0L) Session.setEndsAt(this, Session.endsAt(this) + away)
        }
        return !inTarget
    }

    /** A short double-buzz at the one-minute mark, so zero isn't a surprise. */
    private fun warnOneMinute() {
        Session.markWarned(this)
        if (!Session.shouldVibrate(this)) return
        Buzz.pattern(this, longArrayOf(0, 90, 80, 90))
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
            vibrate = Session.shouldVibrate(this),
            soundUri = Session.soundUri(this),
            soundEnabled = Session.soundEnabled(this),
            loopSound = Session.loopSound(this)
        )
        updateNotification(0L)
    }

    /** During lockout, reopening the blocked app slams the screen back up. */
    private fun watchLockout() {
        updateNotification(0L)
        Overlay.updateLockout(
            if (Session.isIndefinite(this)) "BLOCKED UNTIL YOU STOP IT IN CUTOFF"
            else "LOCKED FOR ${
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
                lockoutMs = if (Session.isIndefinite(this)) -1L
                            else (Session.lockoutUntil(this) - System.currentTimeMillis())
                                .coerceAtLeast(0L),
                dark = Session.isDark(this),
                vibrate = Session.shouldVibrate(this),
                soundUri = Session.soundUri(this),
                soundEnabled = Session.soundEnabled(this),
                loopSound = false
            )
        }
    }

    private fun shutdown() {
        CutoffWidget.refresh(this)
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
            // Paused says so outright, because a frozen number with no
            // explanation just looks like the timer has broken.
            Session.isRunning(this) && Session.isPaused(this) ->
                "$label · paused · ${fmt(remaining)} left"
            Session.isRunning(this) -> "$label · ${fmt(remaining)} left"
            Session.isIndefinite(this) -> "$label is blocked · open Cutoff to stop"
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
        val backPI = PendingIntent.getService(
            this, 2,
            Intent(this, BlockerService::class.java).setAction(ACTION_OPEN_TARGET),
            flags
        )

        val running = Session.isRunning(this)
        val label = Session.label(this).ifEmpty { "Session" }
        val total = Session.durationMs(this)
        val elapsed = (total - remaining).coerceIn(0L, total)

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .apply { appIconBitmap()?.let { setLargeIcon(it) } }
            .setContentTitle(
                when {
                    running && Session.isPaused(this) -> "$label · paused"
                    running -> "$label · ${fmt(remaining)} left"
                    else -> "Cutoff"
                }
            )
            .setContentText(notifText(remaining))
            .setSmallIcon(applicationInfo.icon)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .apply { contentPI?.let { setContentIntent(it) } }

        // Android shows at most three actions, so they're tailored to the state:
        // mid-session you can bail out or jump back in; once blocked, the only
        // route out is opening Cutoff itself.
        if (running) {
            // Deliberately no "end session" — the countdown is the commitment.
            builder
                .addAction(0, "Back to $label", backPI)
                .apply { contentPI?.let { addAction(0, "Open Cutoff", it) } }
        } else if (Session.inLockout(this)) {
            builder.apply { contentPI?.let { addAction(0, "Open Cutoff to unblock", it) } }
        } else {
            builder.addAction(0, "Dismiss", stopPI)
        }

        if (running && !Session.isPaused(this)) {
            // A self-updating countdown in the shade — no per-second redraw needed.
            builder
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setWhen(Session.endsAt(this))
                .setShowWhen(true)
                .setProgress(if (total > 0) total.toInt() else 100, elapsed.toInt(), false)
                .setStyle(
                    NotificationCompat.BigTextStyle().bigText(
                        "${fmt(remaining)} left of ${humanMs(total)}.\n" +
                            "At zero: ${Session.title(this)}"
                    )
                )
        } else {
            builder.setShowWhen(false)
            if (Session.inLockout(this)) {
                builder.setStyle(
                    NotificationCompat.BigTextStyle().bigText(
                        "$label is locked. Opening it will bring the block screen back."
                    )
                )
            }
        }

        return builder.build()
    }

    /**
     * The launcher icon of whatever app is being timed, so the notification
     * carries the thing it is about rather than a generic mark.
     */
    private fun appIconBitmap(): Bitmap? {
        val pkg = Session.blockedPackage(this)
        if (pkg.isEmpty()) return null
        return try {
            val drawable = packageManager.getApplicationIcon(pkg)
            if (drawable is BitmapDrawable && drawable.bitmap != null) {
                Bitmap.createScaledBitmap(drawable.bitmap, 192, 192, true)
            } else {
                val bmp = Bitmap.createBitmap(192, 192, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(bmp)
                drawable.setBounds(0, 0, 192, 192)
                drawable.draw(canvas)
                bmp
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun humanMs(ms: Long): String {
        val mins = (ms / 60000L).toInt()
        return if (mins >= 60) {
            val h = mins / 60
            val m = mins % 60
            if (m > 0) "${h}h ${m}m" else "${h}h"
        } else "${mins}m"
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
