// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "BleBridgeSpec",
  platforms: [.macOS(.v13), .iOS(.v15)],
  products: [
    .library(name: "BleBridgeSpec", targets: ["BleBridgeSpec"])
  ],
  targets: [
    .target(
      name: "BleBridgeSpec",
      path: "ios",
      exclude: ["BleBridge.swift", "BleBridgeModule.swift"],
      sources: ["BleBridgeSpec.swift"]
    ),
    .testTarget(
      name: "BleBridgeSpecTests",
      dependencies: ["BleBridgeSpec"],
      path: "Tests"
    )
  ]
)
