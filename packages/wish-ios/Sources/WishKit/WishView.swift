import SwiftUI

/// Renders the hosted Wish UI. Requires `Wish.configure` first.
public struct WishView: View {
    private let destination: WishDestination
    @State private var revision = Wish.configurationRevision

    public init(_ destination: WishDestination = .requests) {
        self.destination = destination
    }

    public var body: some View {
        Group {
            if let url = Wish.embedURL(for: destination) {
                WishVisibleContent(url: url, destination: destination)
                    .id(revision)
            } else {
                VStack(spacing: 8) {
                    Text("Wish is not configured").font(.headline)
                    Text("Call Wish.configure(appId:clientKey:externalUserId:) before rendering WishView.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: Wish.configurationChanged).receive(on: RunLoop.main)) { _ in
            revision = Wish.configurationRevision
        }
    }
}

private struct WishVisibleContent: View {
    @StateObject private var content: WishWebContent

    init(url: URL, destination: WishDestination) {
        _content = StateObject(wrappedValue: WishWebContent(url: url, destination: destination))
    }

    var body: some View {
        WishContentView(content: content)
            .onDisappear { content.cancel() }
    }
}
