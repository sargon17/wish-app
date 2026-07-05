import Foundation

/// Entry point for the Wish iOS integration.
///
/// Call ``configure(appId:clientKey:externalUserId:appVersion:baseURL:)`` once
/// at app startup, then render ``WishView`` anywhere in SwiftUI.
public enum Wish {
    struct Configuration {
        let appId: String
        let clientKey: String
        let externalUserId: String
        let baseURL: URL
        let appVersion: String?
    }

    static var configuration: Configuration?

    /// Configures the shared Wish instance.
    ///
    /// - Parameters:
    ///   - appId: The Wish project id shown in the project dashboard.
    ///   - clientKey: A public project API key with read and write scopes.
    ///     Never use a server/admin key in an iOS app.
    ///   - externalUserId: A stable identifier for the current user of the
    ///     host app. Wish uses it to attribute requests, upvotes, and comments.
    ///   - appVersion: The host app's version, used to look up "What's new"
    ///     release notes. Defaults to `CFBundleShortVersionString` from the
    ///     host app's bundle when omitted.
    ///   - baseURL: The single public Wish origin, serving both the hosted
    ///     UI and the SDK's API calls. Defaults to the production deployment.
    public static func configure(
        appId: String,
        clientKey: String,
        externalUserId: String,
        appVersion: String? = nil,
        baseURL: URL = URL(string: "https://wish-app.tymofyeyev.com")!
    ) {
        configuration = Configuration(
            appId: appId,
            clientKey: clientKey,
            externalUserId: externalUserId,
            baseURL: baseURL,
            appVersion: appVersion
        )
    }

    /// The app version used for "What's new" lookups: the value passed to
    /// ``configure(appId:clientKey:externalUserId:appVersion:baseURL:)``, or
    /// `CFBundleShortVersionString` from the host app's bundle.
    static var currentAppVersion: String? {
        configuration?.appVersion ?? Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
    }

    static func embedURL(for destination: WishDestination) -> URL? {
        guard let configuration else {
            return nil
        }

        var queryItems = [
            URLQueryItem(name: "projectId", value: configuration.appId),
            URLQueryItem(name: "clientId", value: configuration.externalUserId),
            URLQueryItem(name: "clientKey", value: configuration.clientKey),
            URLQueryItem(name: "view", value: destination.rawValue),
        ]
        if destination == .whatsNew, let appVersion = currentAppVersion {
            queryItems.append(URLQueryItem(name: "appVersion", value: appVersion))
        }

        var components = URLComponents(url: configuration.baseURL, resolvingAgainstBaseURL: false)
        components?.path = "/embed"
        components?.queryItems = queryItems
        return components?.url
    }
}

/// The Wish surface a ``WishView`` renders. The raw value is the hosted
/// embed's `view` query parameter.
public enum WishDestination: String {
    case requests
    case changelog
    case whatsNew = "whats-new"
}
