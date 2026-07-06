import BackgroundTasks
import ExpoModulesCore
import Foundation
import UIKit

public final class TwistedPearNodeServiceModule: Module {
  private var running = false
  private var lifecycleState = "stopped"
  private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
  private var observers: [NSObjectProtocol] = []

  public func definition() -> ModuleDefinition {
    Name("TwistedPearNodeService")

    Events("onLifecycleChange")

    OnCreate {
      self.installLifecycleObservers()
    }

    OnDestroy {
      self.removeLifecycleObservers()
      self.endBackgroundGrace()
    }

    AsyncFunction("start") { () -> Bool in
      self.running = true
      self.lifecycleState = UIApplication.shared.applicationState == .active ? "foreground" : "background-grace"
      self.emitLifecycleChange()
      return true
    }

    AsyncFunction("stop") { () -> Bool in
      self.endBackgroundGrace()
      self.running = false
      self.setLifecycleState("stopped")
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

  private func installLifecycleObservers() {
    let center = NotificationCenter.default

    observers.append(center.addObserver(
      forName: UIApplication.didEnterBackgroundNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      guard let self, self.running else { return }
      self.beginBackgroundGrace()
    })

    observers.append(center.addObserver(
      forName: UIApplication.willEnterForegroundNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      guard let self, self.running else { return }
      self.endBackgroundGrace()
      self.setLifecycleState("foreground")
    })

    observers.append(center.addObserver(
      forName: UIApplication.didBecomeActiveNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      guard let self, self.running else { return }
      self.endBackgroundGrace()
      self.setLifecycleState("foreground")
    })
  }

  private func removeLifecycleObservers() {
    let center = NotificationCenter.default
    for observer in observers {
      center.removeObserver(observer)
    }
    observers.removeAll()
  }

  private func beginBackgroundGrace() {
    guard backgroundTask == .invalid else {
      setLifecycleState("background-grace")
      return
    }

    setLifecycleState("background-grace")
    backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "TwistedPearQuiesce") { [weak self] in
      guard let self else { return }
      self.setLifecycleState("suspended")
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

  private func setLifecycleState(_ next: String) {
    guard lifecycleState != next else {
      return
    }

    lifecycleState = next
    emitLifecycleChange()
  }

  private func emitLifecycleChange() {
    sendEvent("onLifecycleChange", ["state": lifecycleState])
  }
}
