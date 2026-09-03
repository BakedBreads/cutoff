package expo.modules.appblocker

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Base64
import androidx.core.os.bundleOf
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.ByteArrayOutputStream

class SessionConfig : Record {
    @Field var appId: String = ""
    @Field var packageName: String = ""
    @Field var label: String = "App"
    @Field var durationMs: Double = 0.0
    @Field var lockoutMs: Double = 0.0
    @Field var title: String = "TIME TO STUDY"
    @Field var subtitle: String = ""
    @Field var dark: Boolean = false
    @Field var vibrate: Boolean = true
    @Field var launch: Boolean = true
    @Field var soundUri: String = ""
    @Field var soundEnabled: Boolean = true
    @Field var loopSound: Boolean = false
}

class AppBlockerModule : Module() {

    private val context: Context
        get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

    override fun definition() = ModuleDefinition {
        Name("AppBlocker")

        Function("isSupported") { true }

        // ---- permissions ----------------------------------------------------

        Function("hasOverlayPermission") { Overlay.canDraw(context) }

        Function("hasUsagePermission") { Usage.hasAccess(context) }

        Function("requestOverlayPermission") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                open(
                    Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:${context.packageName}")
                    )
                )
            }
        }

        Function("requestUsagePermission") {
            open(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
        }

        Function("openNotificationSettings") {
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            } else {
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    .setData(Uri.parse("package:${context.packageName}"))
            }
            open(intent)
        }

        // ---- app lookup -----------------------------------------------------

        Function("isAppInstalled") { pkg: String -> launchIntent(pkg) != null }

        /** Given a list of candidate package names, return the first one installed. */
        Function("resolvePackage") { candidates: List<String> ->
            candidates.firstOrNull { launchIntent(it) != null }
        }

        Function("launchApp") { pkg: String ->
            val intent = launchIntent(pkg) ?: return@Function false
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                context.startActivity(intent)
                true
            } catch (e: Exception) {
                false
            }
        }

        /** Real launcher icon as a data URI, so tiles show the actual app icon. */
        Function("getAppIcon") { pkg: String ->
            try {
                iconToDataUri(context.packageManager.getApplicationIcon(pkg))
            } catch (e: Exception) {
                null
            }
        }

        AsyncFunction("listInstalledApps") {
            val pm = context.packageManager
            val query = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            @Suppress("DEPRECATION")
            val resolved = pm.queryIntentActivities(query, 0)
            resolved
                .map { it.activityInfo.packageName to it.loadLabel(pm).toString() }
                .filter { it.first != context.packageName }
                .distinctBy { it.first }
                .sortedBy { it.second.lowercase() }
                .map { bundleOf("packageName" to it.first, "label" to it.second) }
        }

        // ---- session --------------------------------------------------------

        Function("startSession") { config: SessionConfig ->
            Session.begin(
                ctx = context,
                appId = config.appId,
                pkg = config.packageName,
                label = config.label,
                durationMs = config.durationMs.toLong(),
                lockoutMs = config.lockoutMs.toLong(),
                title = config.title,
                subtitle = config.subtitle,
                dark = config.dark,
                vibrate = config.vibrate,
                soundUri = config.soundUri,
                soundEnabled = config.soundEnabled,
                loopSound = config.loopSound
            )
            Overlay.dismiss(context)
            BlockerService.start(context)
            CutoffWidget.refresh(context)

            if (config.launch) {
                launchIntent(config.packageName)?.let {
                    it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    try {
                        context.startActivity(it)
                    } catch (_: Exception) {
                    }
                }
            }
            true
        }

        Function("stopSession") {
            Session.clear(context)
            Session.endLockout(context)
            Overlay.dismiss(context)
            BlockerService.stop(context)
        }

        /** User saw the "time's up" screen inside the app. Lockout keeps running. */
        Function("acknowledge") { Session.acknowledge(context) }

        Function("endLockout") {
            Session.endLockout(context)
            Overlay.dismiss(context)
            BlockerService.stop(context)
            CutoffWidget.refresh(context)
        }

        /** Redraws the home-screen widget from current state. */
        Function("refreshWidget") { CutoffWidget.refresh(context) }

        Function("dismissOverlay") { Overlay.dismiss(context) }

        Function("getState") {
            val now = System.currentTimeMillis()
            bundleOf(
                "running" to Session.isRunning(context),
                "remainingMs" to Session.remainingMs(context).toDouble(),
                "endsAt" to Session.endsAt(context).toDouble(),
                "durationMs" to Session.durationMs(context).toDouble(),
                "expired" to Session.isExpired(context),
                "inLockout" to Session.inLockout(context),
                "blockedForever" to Session.isIndefinite(context),
                "lockoutRemainingMs" to
                    if (Session.isIndefinite(context)) 0.0
                    else (Session.lockoutUntil(context) - now).coerceAtLeast(0L).toDouble(),
                "appId" to Session.appId(context),
                "packageName" to Session.blockedPackage(context),
                "label" to Session.label(context),
                "message" to Session.title(context),
                "overlayShowing" to Overlay.isShowing
            )
        }

        // ---- sounds ---------------------------------------------------------

        /** Every alarm/notification tone on the device, for the in-app chooser. */
        AsyncFunction("listSounds") { Sounds.list(context) }

        Function("defaultSoundUri") { Sounds.defaultUri() }

        /** Plays a tone once so you can audition it from settings. */
        Function("previewSound") { uri: String ->
            Sounds.play(context, uri, false)
        }

        Function("stopSound") { Sounds.stop() }

        /** True when alarm volume is zero — settings warns you the tone won't be heard. */
        Function("isSilent") { Sounds.isSilent(context) }

        /** Fires the block screen right now, so you can see your wording before committing. */
        Function("previewBlockScreen") { title: String, subtitle: String, dark: Boolean, soundUri: String, soundEnabled: Boolean ->
            if (!Overlay.canDraw(context)) return@Function false
            Overlay.show(
                context = context,
                title = title,
                subtitle = subtitle,
                appLabel = "Preview",
                spentMs = 0L,
                lockoutMs = 0L,
                dark = dark,
                vibrate = false,
                soundUri = soundUri,
                soundEnabled = soundEnabled,
                loopSound = false
            )
            true
        }
    }

    // ---- helpers ------------------------------------------------------------

    private fun launchIntent(pkg: String): Intent? = try {
        context.packageManager.getLaunchIntentForPackage(pkg)
    } catch (e: Exception) {
        null
    }

    private fun open(intent: Intent) {
        val activity = appContext.currentActivity
        try {
            if (activity != null) {
                activity.startActivity(intent)
            } else {
                context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            }
        } catch (_: Exception) {
        }
    }

    private fun iconToDataUri(drawable: Drawable, size: Int = 144): String {
        val bitmap = if (drawable is BitmapDrawable && drawable.bitmap != null) {
            Bitmap.createScaledBitmap(drawable.bitmap, size, size, true)
        } else {
            val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bmp)
            drawable.setBounds(0, 0, size, size)
            drawable.draw(canvas)
            bmp
        }
        val out = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
        return "data:image/png;base64," +
            Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }
}
