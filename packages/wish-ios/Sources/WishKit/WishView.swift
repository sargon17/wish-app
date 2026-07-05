import SwiftUI
import WebKit

/// Renders the hosted Wish UI in a `WKWebView`.
///
/// Requires ``Wish/configure(appId:clientKey:externalUserId:appVersion:baseURL:)``
/// to have been called first; otherwise a visible configuration error is shown.
public struct WishView: View {
    private let destination: WishDestination

    public init(_ destination: WishDestination = .requests) {
        self.destination = destination
    }

    public var body: some View {
        if let url = Wish.embedURL(for: destination) {
            EmbedWebView(url: url)
        } else {
            ErrorStateView(
                title: "Wish is not configured",
                message: "Call Wish.configure(appId:clientKey:externalUserId:) before rendering WishView.",
                retry: nil
            )
        }
    }
}

private struct EmbedWebView: View {
    let url: URL

    @State private var loadFailed = false
    @State private var reloadToken = 0

    var body: some View {
        if loadFailed {
            ErrorStateView(
                title: "Could not load feedback",
                message: "Check your connection and try again.",
                retry: {
                    loadFailed = false
                    reloadToken += 1
                }
            )
        } else {
            WebViewRepresentable(url: url, onLoadFailure: { loadFailed = true })
                .id(reloadToken)
                .ignoresSafeArea(.container, edges: .bottom)
        }
    }
}

private struct WebViewRepresentable: UIViewRepresentable {
    let url: URL
    let onLoadFailure: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onLoadFailure: onLoadFailure)
    }

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        let onLoadFailure: () -> Void

        init(onLoadFailure: @escaping () -> Void) {
            self.onLoadFailure = onLoadFailure
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            onLoadFailure()
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            onLoadFailure()
        }
    }
}

private struct ErrorStateView: View {
    let title: String
    let message: String
    let retry: (() -> Void)?

    var body: some View {
        VStack(spacing: 8) {
            Text(title)
                .font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            if let retry {
                Button("Retry", action: retry)
                    .padding(.top, 4)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
