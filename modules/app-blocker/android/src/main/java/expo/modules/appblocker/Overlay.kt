package expo.modules.appblocker

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView

/**
 * The full-screen "time's up" screen, drawn as a system overlay so it lands
 * on top of whatever app you're in — that's the whole point of the hard block.
 *
 * Requires SYSTEM_ALERT_WINDOW ("Display over other apps"), which is also what
 * lets us interrupt from the background on Android 10+.
 */
object Overlay {

    private val main = Handler(Looper.getMainLooper())
    private var root: FrameLayout? = null
    private var lockoutLabel: TextView? = null

    val isShowing: Boolean get() = root != null

    // ---- palette ------------------------------------------------------------

    private class Palette(dark: Boolean) {
        val bg = if (dark) Color.parseColor("#0A0A0A") else Color.parseColor("#F2F1EE")
        val ink = if (dark) Color.parseColor("#F5F4F1") else Color.parseColor("#0A0A0A")
        val dim = if (dark) Color.parseColor("#8A8A93") else Color.parseColor("#6B6B6B")
        val btnBg = if (dark) Color.parseColor("#F5F4F1") else Color.parseColor("#0A0A0A")
        val btnInk = if (dark) Color.parseColor("#0A0A0A") else Color.parseColor("#F2F1EE")
        val shadow = if (dark) Color.parseColor("#3A3A40") else Color.parseColor("#0A0A0A")
    }

    // ---- public api ---------------------------------------------------------

    fun show(
        context: Context,
        title: String,
        subtitle: String,
        appLabel: String,
        spentMs: Long,
        lockoutMs: Long,
        dark: Boolean,
        vibrate: Boolean
    ) = main.post {
        if (root != null) return@post
        if (!canDraw(context)) return@post

        val ctx = context.applicationContext
        val p = Palette(dark)
        val view = buildView(ctx, p, title, subtitle, appLabel, spentMs, lockoutMs)

        val type =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            type,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.OPAQUE
        )
        params.gravity = Gravity.TOP or Gravity.START

        try {
            wm(ctx).addView(view, params)
            root = view
            if (vibrate) buzz(ctx)
        } catch (e: Exception) {
            root = null
        }
    }

    fun updateLockout(text: String?) = main.post {
        lockoutLabel?.let {
            if (text.isNullOrEmpty()) {
                it.visibility = View.GONE
            } else {
                it.visibility = View.VISIBLE
                it.text = text
            }
        }
    }

    fun dismiss(context: Context) = main.post {
        val view = root ?: return@post
        try {
            wm(context.applicationContext).removeView(view)
        } catch (_: Exception) {
        }
        root = null
        lockoutLabel = null
    }

    fun canDraw(context: Context): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            Settings.canDrawOverlays(context)
        else
            true

    // ---- view construction --------------------------------------------------

    @SuppressLint("ViewConstructor")
    private class Root(context: Context, val onBack: () -> Unit) : FrameLayout(context) {
        override fun dispatchKeyEvent(event: KeyEvent): Boolean {
            if (event.keyCode == KeyEvent.KEYCODE_BACK && event.action == KeyEvent.ACTION_UP) {
                onBack()
                return true
            }
            // Swallow everything else so volume/menu keys don't leak to the app behind.
            return super.dispatchKeyEvent(event)
        }
    }

    private fun buildView(
        ctx: Context,
        p: Palette,
        title: String,
        subtitle: String,
        appLabel: String,
        spentMs: Long,
        lockoutMs: Long
    ): FrameLayout {

        val root = Root(ctx) { dismissAndGoHome(ctx) }
        root.setBackgroundColor(p.bg)
        root.isClickable = true
        root.isFocusable = true
        root.isFocusableInTouchMode = true

        val col = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL or Gravity.START
            setPadding(dp(ctx, 32), dp(ctx, 48), dp(ctx, 32), dp(ctx, 48))
        }

        // ── eyebrow rule + kicker ───────────────────────────────────────────
        col.addView(rule(ctx, p.ink), lp(dp(ctx, 44), dp(ctx, 3), 0))
        col.addView(
            mono(ctx, "CUTOFF / SESSION ENDED", 11f, p.dim, bold = true).apply {
                letterSpacing = 0.28f
            },
            lp(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT, dp(ctx, 14))
        )

        // ── the big custom message ──────────────────────────────────────────
        col.addView(
            mono(ctx, title.uppercase(), 38f, p.ink, bold = true).apply {
                setLineSpacing(0f, 1.02f)
                letterSpacing = -0.02f
            },
            lp(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT, dp(ctx, 18))
        )

        if (subtitle.isNotBlank()) {
            col.addView(
                mono(ctx, subtitle, 15f, p.dim, bold = false).apply {
                    setLineSpacing(0f, 1.35f)
                },
                lp(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT, dp(ctx, 14))
            )
        }

        // ── receipt line ────────────────────────────────────────────────────
        col.addView(rule(ctx, p.dim), lp(LinearLayout.LayoutParams.MATCH_PARENT, dp(ctx, 1), dp(ctx, 28)))
        col.addView(
            mono(ctx, "${appLabel.uppercase()}   ·   ${humanMs(spentMs)} SPENT", 12f, p.dim, bold = true).apply {
                letterSpacing = 0.14f
            },
            lp(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT, dp(ctx, 12))
        )

        val lock = mono(ctx, "", 12f, p.dim, bold = true).apply {
            letterSpacing = 0.14f
            visibility = if (lockoutMs > 0) View.VISIBLE else View.GONE
            if (lockoutMs > 0) text = "LOCKED FOR ${humanMs(lockoutMs).uppercase()}"
        }
        lockoutLabel = lock
        col.addView(lock, lp(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT, dp(ctx, 6)))
        col.addView(rule(ctx, p.dim), lp(LinearLayout.LayoutParams.MATCH_PARENT, dp(ctx, 1), dp(ctx, 12)))

        // ── primary button, with a hard offset shadow ───────────────────────
        col.addView(
            hardButton(ctx, p, "I'M DONE") { dismissAndGoHome(ctx) },
            lp(LinearLayout.LayoutParams.MATCH_PARENT, dp(ctx, 60), dp(ctx, 34)).also {
                it.rightMargin = dp(ctx, 5)
            }
        )

        // ── secondary text action ───────────────────────────────────────────
        col.addView(
            mono(ctx, "OPEN CUTOFF", 12f, p.dim, bold = true).apply {
                letterSpacing = 0.18f
                gravity = Gravity.CENTER
                setPadding(dp(ctx, 12), dp(ctx, 16), dp(ctx, 12), dp(ctx, 4))
                isClickable = true
                setOnClickListener { dismissAndOpenApp(ctx) }
            },
            lp(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT, dp(ctx, 10))
        )

        root.addView(
            col,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        return root
    }

    private fun hardButton(
        ctx: Context,
        p: Palette,
        label: String,
        onTap: () -> Unit
    ): FrameLayout {
        val wrap = FrameLayout(ctx)
        val off = dp(ctx, 5)

        val shadow = View(ctx).apply {
            background = GradientDrawable().apply { setColor(p.shadow) }
        }
        wrap.addView(
            shadow,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            ).apply { leftMargin = off; topMargin = off }
        )

        val face = mono(ctx, label, 15f, p.btnInk, bold = true).apply {
            gravity = Gravity.CENTER
            letterSpacing = 0.2f
            background = GradientDrawable().apply {
                setColor(p.btnBg)
                setStroke(dp(ctx, 2), p.ink)
            }
            isClickable = true
            setOnClickListener { onTap() }
        }
        wrap.addView(
            face,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            ).apply { rightMargin = off; bottomMargin = off }
        )
        return wrap
    }

    // ---- actions ------------------------------------------------------------

    private fun dismissAndGoHome(ctx: Context) {
        dismiss(ctx)
        try {
            ctx.startActivity(
                Intent(Intent.ACTION_MAIN)
                    .addCategory(Intent.CATEGORY_HOME)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        } catch (_: Exception) {
        }
    }

    private fun dismissAndOpenApp(ctx: Context) {
        dismiss(ctx)
        try {
            val intent = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)
            intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (intent != null) ctx.startActivity(intent)
        } catch (_: Exception) {
        }
    }

    // ---- helpers ------------------------------------------------------------

    private fun wm(ctx: Context) =
        ctx.getSystemService(Context.WINDOW_SERVICE) as WindowManager

    private fun dp(ctx: Context, v: Int): Int = TypedValue.applyDimension(
        TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), ctx.resources.displayMetrics
    ).toInt()

    private fun mono(ctx: Context, text: String, sp: Float, color: Int, bold: Boolean) =
        TextView(ctx).apply {
            this.text = text
            setTextColor(color)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, sp)
            typeface = Typeface.create(
                Typeface.MONOSPACE,
                if (bold) Typeface.BOLD else Typeface.NORMAL
            )
            includeFontPadding = false
        }

    private fun rule(ctx: Context, color: Int) = View(ctx).apply {
        setBackgroundColor(color)
    }

    private fun lp(w: Int, h: Int, topMargin: Int) =
        LinearLayout.LayoutParams(w, h).apply { this.topMargin = topMargin }

    private fun humanMs(ms: Long): String {
        val totalMin = (ms / 60000L).toInt()
        val h = totalMin / 60
        val m = totalMin % 60
        return when {
            ms < 60000L -> "${(ms / 1000L).toInt()}s"
            h > 0 && m > 0 -> "${h}h ${m}m"
            h > 0 -> "${h}h"
            else -> "${m}m"
        }
    }

    private fun buzz(ctx: Context) {
        try {
            val pattern = longArrayOf(0, 120, 90, 120, 90, 260)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vm.defaultVibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
            } else {
                @Suppress("DEPRECATION")
                val v = ctx.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createWaveform(pattern, -1))
                } else {
                    @Suppress("DEPRECATION") v.vibrate(pattern, -1)
                }
            }
        } catch (_: Exception) {
        }
    }
}
