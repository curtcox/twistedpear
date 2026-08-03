require "json"

package = JSON.parse(File.read(File.join(__dir__, "..", "package.json")))

Pod::Spec.new do |s|
  s.name = "TwistedPearPeerAudio"
  s.version = package["version"]
  s.summary = "Native PCM play/record for TwistedPear peer audio and Opus duplex."
  s.description = s.summary
  s.license = "UNLICENSED"
  s.author = "TwistedPear"
  s.homepage = "https://github.com/curtcox/twistedpear"
  s.platforms = { :ios => "15.1" }
  s.swift_version = "5.4"
  s.source = { :git => "https://github.com/curtcox/twistedpear.git" }
  s.static_framework = true
  s.dependency "ExpoModulesCore"
  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "SWIFT_COMPILATION_MODE" => "wholemodule"
  }
  s.source_files = "**/*.{h,m,mm,swift}"
  s.frameworks = "AVFoundation"
end
