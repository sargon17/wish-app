import Foundation
import SwiftUI
import WebKit

/// One load operation. It is retained while a surface is visible, or while
/// automatic release notes are prepared and presented. It is not a read cache.
@MainActor
final class WishWebContent: NSObject, ObservableObject, WKNavigationDelegate, Identifiable {
    enum Phase: Equatable {
        case loading, ready, empty, failed
    }

    @Published private(set) var phase: Phase = .loading
    let url: URL
    let revision: UUID
    let destination: WishDestination
    let version: String?
    let seenKey: String?
    let webView: WKWebView
    private var timeout: Task<Void, Never>?
    private var readyWaiter: CheckedContinuation<Bool, Never>?
    private var isStarted = false
    private var activeURL: URL?

    init(url: URL, destination: WishDestination, seenKey: String? = nil) {
        self.url = url
        self.revision = Wish.configurationRevision
        self.destination = destination
        self.version = destination == .whatsNew ? Wish.currentAppVersion : nil
        self.seenKey = seenKey
        let configuration = WKWebViewConfiguration()
        self.webView = WKWebView(frame: .zero, configuration: configuration)
        super.init()
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground
        configuration.userContentController.add(WishContentMessageHandler(content: self), name: "wishContent")
    }

    var isCurrent: Bool { revision == Wish.configurationRevision }

    func start() {
        guard !isStarted, isCurrent else { return }
        isStarted = true
        phase = .loading
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = (components.queryItems ?? []) + [URLQueryItem(name: "wishLoad", value: UUID().uuidString)]
        components.percentEncodedQuery = components.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%2B")
        activeURL = components.url!
        webView.load(URLRequest(url: activeURL!))
        timeout = Task { [weak self] in
            do { try await Task.sleep(nanoseconds: 30_000_000_000) }
            catch { return }
            self?.finish(.failed)
            self?.webView.stopLoading()
        }
    }

    func retry() {
        cancel()
        isStarted = false
        start()
    }

    func waitUntilReady() async -> Bool {
        start()
        if phase != .loading { return phase == .ready && isCurrent }
        return await withTaskCancellationHandler {
            await withCheckedContinuation { continuation in
                if Task.isCancelled {
                    continuation.resume(returning: false)
                } else {
                    readyWaiter = continuation
                }
            }
        } onCancel: {
            Task { @MainActor [weak self] in self?.cancel() }
        }
    }

    func cancel() {
        timeout?.cancel()
        timeout = nil
        webView.stopLoading()
        readyWaiter?.resume(returning: false)
        readyWaiter = nil
        activeURL = nil
        if phase == .loading { isStarted = false }
    }

    fileprivate func receive(_ message: WKScriptMessage) {
        guard phase == .loading, isCurrent, message.webView === webView, message.frameInfo.isMainFrame,
              let messageURL = message.frameInfo.request.url,
              matchesActiveURL(messageURL),
              let payload = message.body as? [String: String],
              payload["destination"] == destination.rawValue,
              destination != .whatsNew || payload["version"] == version
        else { return }
        switch payload["state"] {
        case "ready": finish(.ready)
        case "empty": finish(.empty)
        case "error": finish(.failed)
        default: break
        }
    }

    private func matchesActiveURL(_ source: URL) -> Bool {
        guard let activeURL,
              var expected = URLComponents(url: activeURL, resolvingAgainstBaseURL: false),
              var actual = URLComponents(url: source, resolvingAgainstBaseURL: false),
              actual.scheme == expected.scheme, actual.host == expected.host,
              (actual.port ?? (actual.scheme == "https" ? 443 : 80)) == (expected.port ?? (expected.scheme == "https" ? 443 : 80)),
              actual.path == expected.path
        else { return false }
        // Decode form queries before comparing identities. A raw '+' means a
        // space; an encoded '%2B' means a literal plus and must stay distinct.
        actual.percentEncodedQuery = actual.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%20")
        expected.percentEncodedQuery = expected.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%20")
        let actualItems = actual.queryItems ?? []
        let expectedItems = expected.queryItems ?? []
        guard Set(actualItems.map(\.name)).count == actualItems.count else { return false }
        return actualItems.sorted { $0.name < $1.name } == expectedItems.sorted { $0.name < $1.name }
    }

    private func finish(_ nextPhase: Phase) {
        guard phase == .loading || nextPhase == .failed else { return }
        timeout?.cancel()
        timeout = nil
        phase = nextPhase
        readyWaiter?.resume(returning: nextPhase == .ready && isCurrent)
        readyWaiter = nil
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { finish(.failed) }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { finish(.failed) }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { finish(.failed) }
}

@MainActor
private final class WishContentMessageHandler: NSObject, WKScriptMessageHandler {
    weak var content: WishWebContent?

    init(content: WishWebContent) { self.content = content }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        content?.receive(message)
    }
}

struct WishContentView: View {
    @ObservedObject var content: WishWebContent

    var body: some View {
        ZStack {
            WishWebView(content: content)
                .ignoresSafeArea(.container, edges: .bottom)
            if content.phase == .loading {
                ProgressView("Loading…")
                    .padding()
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
            } else if content.phase == .failed {
                VStack(spacing: 8) {
                    Text("Could not load feedback").font(.headline)
                    Text("Check your connection and try again.").font(.subheadline)
                    Button("Retry") { content.retry() }
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(.systemBackground))
            }
        }
        .onAppear { content.start() }
    }
}

private struct WishWebView: UIViewRepresentable {
    let content: WishWebContent

    func makeUIView(context: Context) -> WKWebView { content.webView }
    func updateUIView(_ webView: WKWebView, context: Context) {}
}
