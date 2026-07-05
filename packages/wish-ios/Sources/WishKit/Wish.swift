import Foundation

/// Entry point for the Wish iOS integration.
///
/// Call ``configure(appId:clientKey:externalUserId:baseURL:)`` once at app
/// startup, then render ``WishView`` anywhere in SwiftUI.
public enum Wish {
    struct Configuration {
        let appId: String
        let clientKey: String
        let externalUserId: String
        let baseURL: URL
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
    ///   - baseURL: The hosted Wish UI origin. Defaults to the production
    ///     deployment.
    public static func configure(
        appId: String,
        clientKey: String,
        externalUserId: String,
        baseURL: URL = URL(string: "https://wish-app.tymofyeyev.com")!
    ) {
        configuration = Configuration(
            appId: appId,
            clientKey: clientKey,
            externalUserId: externalUserId,
            baseURL: baseURL
        )
    }

    static func embedURL(for destination: WishDestination) -> URL? {
        guard let configuration else {
            return nil
        }

        var components = URLComponents(url: configuration.baseURL, resolvingAgainstBaseURL: false)
        components?.path = "/embed"
        components?.queryItems = [
            URLQueryItem(name: "projectId", value: configuration.appId),
            URLQueryItem(name: "clientId", value: configuration.externalUserId),
            URLQueryItem(name: "clientKey", value: configuration.clientKey),
            URLQueryItem(name: "view", value: destination.rawValue),
        ]
        return components?.url
    }
}

/// The Wish surface a ``WishView`` renders. The raw value is the hosted
/// embed's `view` query parameter.
public enum WishDestination: String {
    case requests
    case changelog
}
