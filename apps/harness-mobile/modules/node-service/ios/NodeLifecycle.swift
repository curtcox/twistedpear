import BackgroundTasks
import ExpoModulesCore
import Foundation
import UIKit

public final class TwistedPearNodeServiceModule: Module {
  private var running = false
  private var lifecycleState = "stopped"
  private var backgroundTask: UIBackgroundTaskIdentifier = .invalid

  public func definition() -> ModuleDefinition {
    Name("TwistedPearNodeService")

    AsyncFunction("start") { () -> Bool in
      self.running = true
      self.lifecycleState = "foreground"
      return true
    }

    AsyncFunction("stop") { () -> Bool in
      self.endBackgroundGrace()
      self.running = false
      self.lifecycleState = "stopped"
      return true
    }

    Function("isRunning") { () -> Bool in
      return self.running
    }

    Function("getLifecycleState") { () -> String in
      return self.lifecycleState
    }

    AsyncFunction("requestBackgroundRefresh") { () -> Bool in
      let request = BGAppRefreshTaskRequest(identifier: "network.twistedpear.harness.refresh")
      request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
      do {
        try BGTaskScheduler.shared.submit(request)
        return true
      } catch {
        return false
      }
    }
  }

  private func beginBackgroundGrace() {
    guard backgroundTask == .invalid else {
      return
    }

    lifecycleState = "background-grace"
    backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "TwistedPearQuiesce") {
      self.lifecycleState = "suspended"
      self.endBackgroundGrace()
    }
  }

  private func endBackgroundGrace() {
    guard backgroundTask != .invalid else {
      return
    }

    UIApplication.shared.endBackgroundTask(backgroundTask)
    backgroundTask = .invalid
  }
}
