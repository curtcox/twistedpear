import AVFoundation
import ExpoModulesCore
import Foundation

public final class TwistedPearPeerAudioModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TwistedPearPeerAudio")

    AsyncFunction("requestPermission") { (promise: Promise) in
      AVAudioSession.sharedInstance().requestRecordPermission { granted in promise.resolve(granted) }
    }

    AsyncFunction("playPcm16") { (pcm: Data, sampleRate: Int) -> Bool in
      try self.validate(sampleRate: sampleRate, samples: pcm.count / 2)
      let engine = AVAudioEngine(); let player = AVAudioPlayerNode(); engine.attach(player)
      guard let format = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: Double(sampleRate), channels: 1, interleaved: false), let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(pcm.count / 2)) else { throw Exception(name: "PCM_FORMAT", description: "Native PCM playback format is unavailable") }
      buffer.frameLength = buffer.frameCapacity
      pcm.withUnsafeBytes { raw in if let source = raw.bindMemory(to: Int16.self).baseAddress, let target = buffer.int16ChannelData?[0] { target.update(from: source, count: pcm.count / 2) } }
      engine.connect(player, to: engine.mainMixerNode, format: format); try engine.start(); let completed = DispatchSemaphore(value: 0); player.scheduleBuffer(buffer) { completed.signal() }; player.play(); _ = completed.wait(timeout: .now() + .seconds(31)); player.stop(); engine.stop(); return true
    }

    AsyncFunction("recordPcm16") { (durationMs: Int, sampleRate: Int) -> Data in
      return try self.record(durationMs: durationMs, sampleRate: sampleRate, voiceDuplex: false)
    }

    AsyncFunction("recordVoicePcm16") { (durationMs: Int, sampleRate: Int) -> Data in
      return try self.record(durationMs: durationMs, sampleRate: sampleRate, voiceDuplex: true)
    }
  }

  private func record(durationMs: Int, sampleRate: Int, voiceDuplex: Bool) throws -> Data {
      guard durationMs >= 100 && durationMs <= 30_000 else { throw Exception(name: "PCM_BOUNDS", description: "Native peer recording is outside the host budget") }
      try self.validate(sampleRate: sampleRate, samples: 1)
      let session = AVAudioSession.sharedInstance(); try session.setCategory(.playAndRecord, mode: voiceDuplex ? .voiceChat : .measurement, options: [.defaultToSpeaker, .allowBluetooth]); try session.setPreferredSampleRate(Double(sampleRate)); try session.setActive(true)
      let engine = AVAudioEngine(); let input = engine.inputNode; let lock = NSLock(); var output = Data(); let maximum = Int(Double(durationMs) * Double(sampleRate) * 2.0 / 1000.0)
      input.installTap(onBus: 0, bufferSize: 4096, format: input.outputFormat(forBus: 0)) { buffer, _ in guard let channel = buffer.floatChannelData?[0] else { return }; var bytes = Data(capacity: Int(buffer.frameLength) * 2); for index in 0..<Int(buffer.frameLength) { var sample = Int16(max(-1, min(1, channel[index])) * Float(Int16.max)).littleEndian; withUnsafeBytes(of: &sample) { bytes.append(contentsOf: $0) } }; lock.lock(); if output.count < maximum { output.append(bytes.prefix(maximum - output.count)) }; lock.unlock() }
      engine.prepare(); try engine.start(); Thread.sleep(forTimeInterval: Double(durationMs) / 1000.0); engine.stop(); input.removeTap(onBus: 0); try session.setActive(false); lock.lock(); let result = output; lock.unlock(); return result
  }

  private func validate(sampleRate: Int, samples: Int) throws {
    guard sampleRate >= 8_000 && sampleRate <= 48_000 && samples >= 1 && samples <= sampleRate * 30 else { throw Exception(name: "PCM_BOUNDS", description: "Native peer PCM is outside the host budget") }
  }
}
