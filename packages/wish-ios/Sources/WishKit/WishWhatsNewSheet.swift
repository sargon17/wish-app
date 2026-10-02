import CryptoKit
import Foundation
import SwiftUI

/// Presents ready release notes at most once per version and requester.
public extension View {
    func wishWhatsNewSheet() -> some View {
        modifier(WishWhatsNewSheetModifier())
    }
}

private struct WishWhatsNewSheetModifier: ViewModifier {
    @State private var presented: WishWebContent?
    @State private var activePresentation: WishWebContent?
    @State private var prepared: WishWebContent?
    @State private var revision = Wish.configurationRevision

    func body(content: Content) -> some View {
        content
            .task(id: revision) { await prepareAndPresent() }
            .onReceive(NotificationCenter.default.publisher(for: Wish.configurationChanged).receive(on: RunLoop.main)) { _ in
                discard()
                presented = nil
                revision = Wish.configurationRevision
            }
            .onDisappear {
                if presented == nil { discard() }
            }
            .sheet(item: $presented, onDismiss: finishDismissal) { readyContent in
                WishContentView(content: readyContent)
            }
    }

    @MainActor
    private func prepareAndPresent() async {
        guard let configuration = Wish.configuration,
              let appVersion = Wish.currentAppVersion,
              let url = Wish.embedURL(for: .whatsNew)
        else { return }
        let key = WishWhatsNewSeenStore.key(configuration: configuration)
        guard WishWhatsNewSeenStore.seenVersion(key: key) != appVersion else { return }
        // Only one automatic operation can prepare at a time. This also avoids
        // loading twice if multiple root views install the modifier.
        guard WishWhatsNewPreparation.acquire() else { return }
        let next = WishWebContent(url: url, destination: .whatsNew, seenKey: key)
        prepared = next
        let ready = await next.waitUntilReady()
        guard ready, !Task.isCancelled, next.isCurrent, prepared === next else {
            if prepared === next { discard() }
            return
        }
        // SwiftUI cannot present the next sheet until the old dismissal ends.
        // Retain its ready content and let that completion present it.
        if activePresentation == nil { present(next) }
    }

    @MainActor
    private func present(_ next: WishWebContent) {
        activePresentation = next
        presented = next
    }

    @MainActor
    private func finishDismissal() {
        guard let shown = activePresentation else { return }
        activePresentation = nil
        if shown.isCurrent, shown.phase == .ready,
           let version = shown.version, let seenKey = shown.seenKey {
            WishWhatsNewSeenStore.markSeen(key: seenKey, version: version)
        }
        if prepared === shown { discard() }
        if presented === shown { presented = nil }
        if let next = prepared, next.isCurrent, next.phase == .ready {
            present(next)
        }
    }

    @MainActor
    private func discard() {
        prepared?.cancel()
        if prepared != nil { WishWhatsNewPreparation.release() }
        prepared = nil
    }
}

@MainActor
private enum WishWhatsNewPreparation {
    private static var isPreparing = false
    static func acquire() -> Bool {
        guard !isPreparing else { return false }
        isPreparing = true
        return true
    }
    static func release() { isPreparing = false }
}

private enum WishWhatsNewSeenStore {
    static func key(configuration: Wish.Configuration) -> String {
        // Use a separate key from the old project-only record so one requester
        // cannot suppress notes for a different requester or origin.
        let identity = [configuration.baseURL.absoluteString, configuration.appId, configuration.clientKey, configuration.externalUserId, WishDestination.whatsNew.rawValue]
        let data = (try? JSONEncoder().encode(identity)) ?? Data()
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        return "wish.whatsNew.seenVersion.v2.\(digest)"
    }
    static func seenVersion(key: String) -> String? { UserDefaults.standard.string(forKey: key) }
    static func markSeen(key: String, version: String) { UserDefaults.standard.set(version, forKey: key) }
}
