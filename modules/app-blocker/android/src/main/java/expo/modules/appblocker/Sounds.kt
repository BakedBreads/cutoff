package expo.modules.appblocker

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import androidx.core.os.bundleOf
import android.os.Bundle

/**
 * Reads the alarm/notification tones already on the device and plays one when
 * the block screen fires. Listing them ourselves (rather than opening Android's
 * ringtone picker) keeps the chooser inside the app's own look.
 */
object Sounds {

    private var player: MediaPlayer? = null

    /** Every alarm and notification tone the system knows about. */
    fun list(context: Context): List<Bundle> {
        val out = mutableListOf<Bundle>()
        val seen = mutableSetOf<String>()

        val types = listOf(
            RingtoneManager.TYPE_ALARM to "ALARM",
            RingtoneManager.TYPE_NOTIFICATION to "NOTIFICATION"
        )

        for ((type, groupLabel) in types) {
            try {
                val manager = RingtoneManager(context)
                manager.setType(type)
                val cursor = manager.cursor
                var index = 0
                while (cursor.moveToNext()) {
                    val title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX) ?: "Tone"
                    val uri = manager.getRingtoneUri(index)?.toString()
                    index++
                    if (uri.isNullOrEmpty() || !seen.add(uri)) continue
                    out.add(bundleOf("uri" to uri, "title" to title, "group" to groupLabel))
                }
            } catch (e: Exception) {
                // A broken provider for one type shouldn't lose the other.
            }
        }
        return out
    }

    /** The system default alarm tone, used when nothing has been chosen. */
    fun defaultUri(): String =
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)?.toString() ?: ""

    fun play(context: Context, uriString: String?, loop: Boolean) {
        stop()
        val raw = uriString?.takeIf { it.isNotBlank() } ?: defaultUri()
        if (raw.isBlank()) return
        try {
            player = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(context.applicationContext, Uri.parse(raw))
                isLooping = loop
                setOnCompletionListener { if (!loop) stop() }
                prepare()
                start()
            }
        } catch (e: Exception) {
            stop()
        }
    }

    fun stop() {
        try {
            player?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
        } catch (_: Exception) {
        }
        player = null
    }

    /** True when the phone is on silent — the caller may want to fall back to vibration. */
    fun isSilent(context: Context): Boolean = try {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        am.getStreamVolume(AudioManager.STREAM_ALARM) == 0
    } catch (e: Exception) {
        false
    }
}
