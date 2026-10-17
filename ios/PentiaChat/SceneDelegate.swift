import UIKit
import React
import React_RCTAppDelegate
import FBSDKCoreKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window

    // With scenes, a deep link that launches the app arrives here instead of
    // in AppDelegate. Pass it on as launch options so Linking.getInitialURL() sees it
    var launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions = [.url: url]
    }

    factory.startReactNative(
      withModuleName: "PentiaChat",
      in: window,
      launchOptions: launchOptions
    )
    window.makeKeyAndVisible()
  }

  // Links while the app is running: Facebook's login callback first,
  // everything else (pentiachat://) goes to React Native's Linking
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }

    if ApplicationDelegate.shared.application(
      UIApplication.shared,
      open: url,
      sourceApplication: nil,
      annotation: [UIApplication.OpenURLOptionsKey.annotation]
    ) {
      return
    }
    RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
  }
}
