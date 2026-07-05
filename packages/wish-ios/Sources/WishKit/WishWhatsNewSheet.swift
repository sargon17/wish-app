import Foundation
import SwiftUI

/// Presents the hosted "What's new" release notes for the current app
/// version, at most once per version per device.
///
/// Requires ``Wish/configure(appId:clientKey:externalUserId:appVersion:baseURL:)``
/// to have been called first; does nothing otherwise.
public extension View {
    func wishWhatsNewSheet() -> some View {
        modifier(WishWhatsNewSheetModifier())
    }
}

private struct WishWhatsNewSheetModifier: ViewModifier {
    @State private var isPresented = false

    func body(content: Content) -> some View {
        content
            .task {
                await checkAndPresent()
            }
            .sheet(isPresented: $isPresented, onDismiss: markCurrentVersionSeen) {
                WishView(.whatsNew)
            }
    }

    private func checkAndPresent() async {
        guard let configuration = Wish.configuration,
              let appVersion = Wish.currentAppVersion,
              WishWhatsNewSeenStore.seenVersion(appId: configuration.appId) != appVersion
        else {
            return
        }

        let hasPublishedNotes = await fetchHasPublishedNotes(configuration: configuration, appVersion: appVersion)
        if hasPublishedNotes == true {
            isPresented = true
        }
    }

    private func fetchHasPublishedNotes(configuration: Wish.Configuration, appVersion: String) async -> Bool? {
        guard var components = URLComponents(url: configuration.baseURL, resolvingAgainstBaseURL: false) else {
            return nil
        }
        components.path = "/api/project/\(configuration.appId)/whats-new/exists"
        components.queryItems = [URLQueryItem(name: "version", value: appVersion)]

        guard let url = components.url else {
            return nil
        }

        var request = URLRequest(url: url)
        request.setValue(configuration.clientKey, forHTTPHeaderField: "x-api-key")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                return nil
            }
            let payload = try JSONDecoder().decode(WhatsNewExistsResponse.self, from: data)
            return payload.hasPublishedNotes
        } catch {
            return nil
        }
    }

    private func markCurrentVersionSeen() {
        guard let configuration = Wish.configuration, let appVersion = Wish.currentAppVersion else {
            return
        }
        WishWhatsNewSeenStore.markSeen(appId: configuration.appId, version: appVersion)
    }
}

private struct WhatsNewExistsResponse: Decodable {
    let hasPublishedNotes: Bool
}

/// Local-only record of the last app version a device has seen "What's new"
/// notes for, scoped by project so multiple Wish-enabled apps don't collide.
private enum WishWhatsNewSeenStore {
    private static func key(appId: String) -> String {
        "wish.whatsNew.seenVersion.\(appId)"
    }

    static func seenVersion(appId: String) -> String? {
        UserDefaults.standard.string(forKey: key(appId: appId))
    }

    static func markSeen(appId: String, version: String) {
        UserDefaults.standard.set(version, forKey: key(appId: appId))
    }
}
