package expo.modules.appblocker

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.view.View
import android.widget.RemoteViews

/**
 * Home-screen widget. Mirrors the same SharedPreferences the service writes, so
 * it shows the truth whether or not the JS side is alive.
 *
 * Three states: idle, counting down, or blocked. Tapping it always opens Cutoff,
 * which is the only place a block can be lifted.
 */
class CutoffWidget : AppWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "cutoff.WIDGET_REFRESH"

        /** Called by the service whenever the session state moves. */
        fun refresh(context: Context) {
            try {
                val manager = AppWidgetManager.getInstance(context) ?: return
                val ids = manager.getAppWidgetIds(
                    ComponentName(context.applicationContext, CutoffWidget::class.java)
                )
                if (ids == null || ids.isEmpty()) return
                for (id in ids) render(context, manager, id)
            } catch (_: Exception) {
                // A missing host or a race during uninstall isn't worth crashing over.
            }
        }

        private fun render(context: Context, manager: AppWidgetManager, id: Int) {
            val views = RemoteViews(context.packageName, R.layout.cutoff_widget)

            val running = Session.isRunning(context)
            val blocked = Session.inLockout(context)
            val label = Session.label(context).ifEmpty { "NO SESSION" }

            when {
                running -> {
                    val paused = Session.isPaused(context)
                    views.setTextViewText(R.id.widget_kicker, label.uppercase())
                    views.setTextViewText(R.id.widget_value, fmt(Session.remainingMs(context)))
                    views.setTextViewText(
                        R.id.widget_note,
                        if (paused) "PAUSED - OPEN $label".uppercase() else "LEFT ON THE CLOCK"
                    )
                    views.setTextViewText(R.id.widget_lock, "PAUSED")
                    views.setViewVisibility(
                        R.id.widget_lock,
                        if (paused) View.VISIBLE else View.GONE
                    )
                }
                blocked -> {
                    views.setTextViewText(R.id.widget_kicker, label.uppercase())
                    views.setTextViewText(R.id.widget_value, "BLOCKED")
                    views.setTextViewText(
                        R.id.widget_note,
                        if (Session.isIndefinite(context)) "OPEN CUTOFF TO STOP"
                        else "UNLOCKS IN " + fmt(
                            (Session.lockoutUntil(context) - System.currentTimeMillis())
                                .coerceAtLeast(0L)
                        )
                    )
                    views.setViewVisibility(R.id.widget_lock, View.VISIBLE)
                }
                else -> {
                    views.setTextViewText(R.id.widget_kicker, "CUTOFF")
                    views.setTextViewText(R.id.widget_value, "READY")
                    views.setTextViewText(R.id.widget_note, "TAP TO START A SESSION")
                    views.setViewVisibility(R.id.widget_lock, View.GONE)
                }
            }

            // Whole widget opens the app.
            val open = context.packageManager.getLaunchIntentForPackage(context.packageName)
                ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (open != null) {
                val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                    (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
                views.setOnClickPendingIntent(
                    R.id.widget_root,
                    PendingIntent.getActivity(context, 90, open, flags)
                )
            }

            manager.updateAppWidget(id, views)
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

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) render(context, appWidgetManager, id)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) refresh(context)
    }
}
