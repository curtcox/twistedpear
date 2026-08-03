package expo.modules.twistedpear.peeraudio

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.AutomaticGainControl
import android.media.audiofx.NoiseSuppressor
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Native peer PCM capture/playback for realtime media voice-duplex.
 * Mirrors the iOS PeerAudioModule surface used by the mobile harness.
 */
class PeerAudioModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TwistedPearPeerAudio")

    AsyncFunction("requestPermission") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
        PackageManager.PERMISSION_GRANTED
    }

    AsyncFunction("playPcm16") { pcm: ByteArray, sampleRate: Int ->
      validate(sampleRate, pcm.size / 2)
      val channelConfig = AudioFormat.CHANNEL_OUT_MONO
      val encoding = AudioFormat.ENCODING_PCM_16BIT
      val minBuffer = AudioTrack.getMinBufferSize(sampleRate, channelConfig, encoding)
      if (minBuffer <= 0) {
        throw IllegalArgumentException("Native PCM playback format is unavailable")
      }
      val track = AudioTrack.Builder()
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        )
        .setAudioFormat(
          AudioFormat.Builder()
            .setSampleRate(sampleRate)
            .setEncoding(encoding)
            .setChannelMask(channelConfig)
            .build()
        )
        .setBufferSizeInBytes(maxOf(minBuffer, pcm.size))
        .setTransferMode(AudioTrack.MODE_STATIC)
        .build()
      try {
        track.write(pcm, 0, pcm.size)
        track.play()
        val durationMs = (pcm.size / 2) * 1000L / sampleRate
        Thread.sleep(durationMs.coerceAtMost(31_000L) + 20L)
        track.stop()
      } finally {
        track.release()
      }
      true
    }

    AsyncFunction("recordPcm16") { durationMs: Int, sampleRate: Int ->
      record(durationMs, sampleRate, voiceDuplex = false)
    }

    AsyncFunction("recordVoicePcm16") { durationMs: Int, sampleRate: Int ->
      record(durationMs, sampleRate, voiceDuplex = true)
    }
  }

  private fun record(durationMs: Int, sampleRate: Int, voiceDuplex: Boolean): ByteArray {
    if (durationMs < 100 || durationMs > 30_000) {
      throw IllegalArgumentException("Native peer recording is outside the host budget")
    }
    validate(sampleRate, 1)
    val channelConfig = AudioFormat.CHANNEL_IN_MONO
    val encoding = AudioFormat.ENCODING_PCM_16BIT
    val minBuffer = AudioRecord.getMinBufferSize(sampleRate, channelConfig, encoding)
    if (minBuffer <= 0) {
      throw IllegalArgumentException("Native PCM recording format is unavailable")
    }
    val source = if (voiceDuplex) {
      MediaRecorder.AudioSource.VOICE_COMMUNICATION
    } else {
      MediaRecorder.AudioSource.MIC
    }
    val recorder = AudioRecord(
      source,
      sampleRate,
      channelConfig,
      encoding,
      maxOf(minBuffer, sampleRate * 2)
    )
    if (recorder.state != AudioRecord.STATE_INITIALIZED) {
      recorder.release()
      throw IllegalArgumentException("Native peer microphone failed to initialize")
    }
    var echoCanceler: AcousticEchoCanceler? = null
    var noiseSuppressor: NoiseSuppressor? = null
    var automaticGain: AutomaticGainControl? = null
    try {
      if (voiceDuplex) {
        if (AcousticEchoCanceler.isAvailable()) {
          echoCanceler = AcousticEchoCanceler.create(recorder.audioSessionId)
          echoCanceler?.enabled = true
        }
        if (NoiseSuppressor.isAvailable()) {
          noiseSuppressor = NoiseSuppressor.create(recorder.audioSessionId)
          noiseSuppressor?.enabled = true
        }
        if (AutomaticGainControl.isAvailable()) {
          automaticGain = AutomaticGainControl.create(recorder.audioSessionId)
          automaticGain?.enabled = true
        }
      }
      val maximum = (durationMs.toLong() * sampleRate * 2L / 1000L).toInt()
      val output = ByteBuffer.allocate(maximum).order(ByteOrder.LITTLE_ENDIAN)
      val chunk = ByteArray(minBuffer)
      recorder.startRecording()
      val deadline = System.nanoTime() + durationMs.toLong() * 1_000_000L
      while (System.nanoTime() < deadline && output.position() < maximum) {
        val read = recorder.read(chunk, 0, chunk.size)
        if (read > 0) {
          val remaining = maximum - output.position()
          output.put(chunk, 0, minOf(read, remaining))
        } else if (read < 0) {
          break
        }
      }
      recorder.stop()
      val bytes = ByteArray(output.position())
      output.flip()
      output.get(bytes)
      return bytes
    } finally {
      echoCanceler?.release()
      noiseSuppressor?.release()
      automaticGain?.release()
      recorder.release()
    }
  }

  private fun validate(sampleRate: Int, samples: Int) {
    if (sampleRate < 8_000 || sampleRate > 48_000 || samples < 1 || samples > sampleRate * 30) {
      throw IllegalArgumentException("Native peer PCM is outside the host budget")
    }
  }
}
