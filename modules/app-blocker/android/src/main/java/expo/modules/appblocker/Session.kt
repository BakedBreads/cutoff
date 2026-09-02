package expo.modules.appblocker

import android.content.Context
import android.content.SharedPreferences

/**
 * Single source of truth for the running session.
 *
 * Backed by SharedPreferences so the state survives the JS process being killed
 * while you're off in TikTok — the service and the module both read/write here.
 */
object Session {

    private const val PREFS = "cutoff.session"

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    // ---- fields -------------------------------------------------------------

    /** True while the countdown is ticking. */
    fun isRunning(ctx: Context) = prefs(ctx).getBoolean("running", false)

    /** Epoch millis when the countdown hits zero. */
    fun endsAt(ctx: Context) = prefs(ctx).getLong("endsAt", 0L)

    /** True once the timer fired and hasn't been acknowledged in the app yet. */
    fun isExpired(ctx: Context) = prefs(ctx).getBoolean("expired", false)

    /** Epoch millis until which reopening the blocked app re-triggers the screen. */
    fun lockoutUntil(ctx: Context) = prefs(ctx).getLong("lockoutUntil", 0L)

    /** Package of the app we're timing (the one that gets re-blocked during lockout). */
    fun blockedPackage(ctx: Context): String = prefs(ctx).getString("pkg", "") ?: ""

    /** Stable id of the app entry in the JS list, so the UI can match it back up. */
    fun appId(ctx: Context): String = prefs(ctx).getString("appId", "") ?: ""

    fun label(ctx: Context): String = prefs(ctx).getString("label", "") ?: ""

    fun title(ctx: Context): String =
        prefs(ctx).getString("title", "TIME TO STUDY") ?: "TIME TO STUDY"

    fun subtitle(ctx: Context): String =
        prefs(ctx).getString("subtitle", "") ?: ""

    fun isDark(ctx: Context) = prefs(ctx).getBoolean("dark", false)

    fun shouldVibrate(ctx: Context) = prefs(ctx).getBoolean("vibrate", true)

    /** Total planned length of the session, for the progress ring. */
    fun durationMs(ctx: Context) = prefs(ctx).getLong("durationMs", 0L)

    fun lockoutMs(ctx: Context) = prefs(ctx).getLong("lockoutMs", 0L)

    // ---- transitions --------------------------------------------------------

    fun begin(
        ctx: Context,
        appId: String,
        pkg: String,
        label: String,
        durationMs: Long,
        lockoutMs: Long,
        title: String,
        subtitle: String,
        dark: Boolean,
        vibrate: Boolean
    ) {
        prefs(ctx).edit()
            .putBoolean("running", true)
            .putBoolean("expired", false)
            .putLong("endsAt", System.currentTimeMillis() + durationMs)
            .putLong("durationMs", durationMs)
            .putLong("lockoutMs", lockoutMs)
            .putLong("lockoutUntil", 0L)
            .putString("appId", appId)
            .putString("pkg", pkg)
            .putString("label", label)
            .putString("title", title)
            .putString("subtitle", subtitle)
            .putBoolean("dark", dark)
            .putBoolean("vibrate", vibrate)
            .apply()
    }

    fun markExpired(ctx: Context) {
        val lockout = lockoutMs(ctx)
        prefs(ctx).edit()
            .putBoolean("running", false)
            .putBoolean("expired", true)
            .putLong("lockoutUntil", if (lockout > 0) System.currentTimeMillis() + lockout else 0L)
            .apply()
    }

    /** Session ended early by the user — no lockout, no block screen. */
    fun clear(ctx: Context) {
        prefs(ctx).edit()
            .putBoolean("running", false)
            .putBoolean("expired", false)
            .putLong("endsAt", 0L)
            .putLong("lockoutUntil", 0L)
            .apply()
    }

    /** User has seen the "time's up" screen in the app. Lockout keeps running. */
    fun acknowledge(ctx: Context) {
        prefs(ctx).edit().putBoolean("expired", false).apply()
    }

    fun endLockout(ctx: Context) {
        prefs(ctx).edit().putLong("lockoutUntil", 0L).apply()
    }

    fun remainingMs(ctx: Context): Long =
        if (!isRunning(ctx)) 0L else (endsAt(ctx) - System.currentTimeMillis()).coerceAtLeast(0L)

    fun inLockout(ctx: Context): Boolean =
        System.currentTimeMillis() < lockoutUntil(ctx)
}
