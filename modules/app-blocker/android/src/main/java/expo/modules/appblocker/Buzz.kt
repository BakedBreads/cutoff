package expo.modules.appblocker

import android.media.AudioAttributes
import android.os.Build
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.content.Context

/**
 * Vibration, declared as an alarm.
 *
 * A plain `vibrate(effect)` is treated as an ordinary notification, which Do Not
 * Disturb and most "silent" profiles suppress outright — so the buzz at zero
 * simply never arrived on a phone that was set to quiet, which is exactly the
 * phone you most want it on. Tagging the effect with alarm usage puts it in the
 * category users expect to get through.
 */
object Buzz {

    fun pattern(context: Context, timings: LongArray) {
        try {
            val effect = VibrationEffect.createWaveform(timings, -1)
            val vibrator = resolve(context) ?: return

            when {
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> {
                    vibrator.vibrate(
                        effect,
                        VibrationAttributes.createForUsage(VibrationAttributes.USAGE_ALARM)
                    )
                }
                else -> {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(
                        effect,
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                }
            }
        } catch (e: Exception) {
            // A device without a vibrator, or one refusing the effect, is not
            // worth taking the session down for.
        }
    }

    private fun resolve(context: Context): Vibrator? = try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager =
                context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            manager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }?.takeIf { it.hasVibrator() }
    } catch (e: Exception) {
        null
    }
}
