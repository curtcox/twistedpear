import BackgroundTasks
import ExpoModulesCore
import Foundation
import UIKit

public final class TwistedPearNodeServiceModule: Module {
  private static let refreshTaskId = "network.twistedpear.harness.refresh"
  private static let processingTaskId = "network.twistedpear.harness.processing"

  private var running = false
  private var lifecycleState = "stopped"
  private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
  private var observers: [NSObjectProtocol] = []
  private var tasksRegistered = false

  public func definition() -> ModuleDefinition {
    Name("TwistedPearNodeService")

    Events("onLifecycleChange")

    OnCreate {
      self.installLifecycleObservers()
      self.registerBackgroundTasks()
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
      return self.scheduleBackgroundTasks()
    }
  }

  private func registerBackgroundTasks() {
    guard !tasksRegistered else {
      return
    }

    BGTaskScheduler.shared.register(
      forTaskWithIdentifier: Self.refreshTaskId,
      using: nil
    ) { [weak self] task in
      guard let refreshTask = task as? BGAppRefreshTask, let self else {
        task.setTaskCompleted(success: false)
        return
      }
      self.handleBackgroundRefresh(task: refreshTask)
    }

    BGTaskScheduler.shared.register(
      forTaskWithIdentifier: Self.processingTaskId,
      using: nil
    ) { [weak self] task in
      guard let processingTask = task as? BGProcessingTask, let self else {
        task.setTaskCompleted(success: false)
        return
      }
      self.handleBackgroundProcessing(task: processingTask)
    }

    tasksRegistered = true
  }

  private func scheduleBackgroundTasks() -> Bool {
    let refreshRequest = BGAppRefreshTaskRequest(identifier: Self.refreshTaskId)
    refreshRequest.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)

    let processingRequest = BGProcessingTaskRequest(identifier: Self.processingTaskId)
    processingRequest.requiresNetworkConnectivity = true
    processingRequest.earliestBeginDate = Date(timeIntervalSinceNow: 30 * 60)

    do {
      try BGTaskScheduler.shared.submit(refreshRequest)
      try BGTaskScheduler.shared.submit(processingRequest)
      return true
    } catch {
      return false
    }
  }

  private func handleBackgroundRefresh(task: BGAppRefreshTask) {
    scheduleBackgroundTasks()

    task.expirationHandler = { [weak self] in
      self?.finishBackgroundWake()
    }

    guard running else {
      task.setTaskCompleted(success: false)
      return
    }

    setLifecycleState("background-wake")
    task.setTaskCompleted(success: true)
    finishBackgroundWake()
  }

  private func handleBackgroundProcessing(task: BGProcessingTask) {
    scheduleBackgroundTasks()

    task.expirationHandler = { [weak self] in
      self?.finishBackgroundWake()
    }

    guard running else {
      task.setTaskCompleted(success: false)
      return
    }

    setLifecycleState("background-wake")
    task.setTaskCompleted(success: true)
    finishBackgroundWake()
  }

  private func finishBackgroundWake() {
    guard running else {
      setLifecycleState("stopped")
      return
    }

    let next = UIApplication.shared.applicationState == .active ? "foreground" : "suspended"
    setLifecycleState(next)
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
      _ = self.scheduleBackgroundTasks()
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
