import Network
import SwiftUI
import WebKit
import XCTest
@testable import WishKit

@MainActor
final class WishWebContentTests: XCTestCase {
    func testAutomaticSheetPresentsReadyContentAndMarksSeenAfterDismissal() async throws {
        let fixture = try await ContentFixture(html: page(state: "ready"))
        defer { fixture.close() }
        Wish.configure(appId: "auto-project", clientKey: "test-key", externalUserId: UUID().uuidString, appVersion: "2.0.0", baseURL: fixture.url)
        let before = Set(UserDefaults.standard.dictionaryRepresentation().keys)
        let host = UIHostingController(rootView: Text("Automatic host").wishWhatsNewSheet())
        let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
        let window = UIWindow(windowScene: scene)
        window.rootViewController = host
        window.makeKeyAndVisible()
        defer { window.isHidden = true }
        for _ in 0..<500 {
            if host.presentedViewController != nil { break }
            try await Task.sleep(nanoseconds: 10_000_000)
        }
        let presentation = try XCTUnwrap(host.presentedViewController)
        for _ in 0..<500 {
            if let readyView = findWebView(in: presentation.view), readyView.window != nil,
               readyView.bounds.width > 100, readyView.bounds.height > 100 { break }
            try await Task.sleep(nanoseconds: 10_000_000)
        }
        let webView = try XCTUnwrap(findWebView(in: presentation.view))
        XCTAssertNotNil(webView.window)
        XCTAssertGreaterThan(webView.bounds.width, 100)
        XCTAssertGreaterThan(webView.bounds.height, 100)
        XCTAssertEqual(fixture.requestCount, 1)
        XCTAssertTrue(Set(UserDefaults.standard.dictionaryRepresentation().keys).subtracting(before).filter { $0.hasPrefix("wish.whatsNew.seenVersion") }.isEmpty)
        host.presentedViewController?.dismiss(animated: false)
        for _ in 0..<200 {
            if UserDefaults.standard.dictionaryRepresentation().keys.contains(where: { !before.contains($0) && $0.hasPrefix("wish.whatsNew.seenVersion") }) { break }
            try await Task.sleep(nanoseconds: 10_000_000)
        }
        let seen = UserDefaults.standard.dictionaryRepresentation().filter { !before.contains($0.key) && $0.key.hasPrefix("wish.whatsNew.seenVersion") }
        XCTAssertEqual(seen.count, 1)
        XCTAssertEqual(seen.values.first as? String, "2.0.0")
    }

    func testPreparationWaitsForContentAndPresentationDoesNotFetchAgain() async throws {
        let fixture = try await ContentFixture(html: page(state: "ready", delay: 150))
        defer { fixture.close() }
        let content = makeContent(baseURL: fixture.url)
        let preparation = Task { await content.waitUntilReady() }
        try await Task.sleep(nanoseconds: 30_000_000)
        XCTAssertEqual(content.phase, .loading)
        let ready = await preparation.value
        XCTAssertTrue(ready)
        XCTAssertEqual(content.phase, .ready)

        let host = UIHostingController(rootView: WishContentView(content: content))
        host.loadViewIfNeeded()
        host.beginAppearanceTransition(true, animated: false)
        host.endAppearanceTransition()
        try await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertEqual(fixture.requestCount, 1)
        content.cancel()
    }

    func testOldSheetDismissalCannotDiscardOrMarkNewConfigurationSeen() async throws {
        let first = try await ContentFixture(html: page(state: "ready"))
        let next = try await ContentFixture(html: page(state: "ready", version: "3.0.0"))
        defer { first.close(); next.close() }
        Wish.configure(appId: "first-project", clientKey: "first-key", externalUserId: UUID().uuidString, appVersion: "2.0.0", baseURL: first.url)
        let before = Set(UserDefaults.standard.dictionaryRepresentation().keys)
        let host = UIHostingController(rootView: Text("Configuration host").wishWhatsNewSheet())
        let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
        let window = UIWindow(windowScene: scene)
        window.rootViewController = host
        window.makeKeyAndVisible()
        defer { window.isHidden = true }
        for _ in 0..<500 {
            if let presentation = host.presentedViewController,
               let webView = findWebView(in: presentation.view), webView.window != nil,
               webView.bounds.width > 100, webView.bounds.height > 100 { break }
            try await Task.sleep(nanoseconds: 10_000_000)
        }
        let firstPresentation = try XCTUnwrap(host.presentedViewController)
        let firstWebView = try XCTUnwrap(findWebView(in: firstPresentation.view))
        XCTAssertNotNil(firstWebView.window)
        XCTAssertEqual(firstWebView.url?.port, first.url.port)

        // The next operation becomes ready while SwiftUI dismisses the old
        // sheet. Its content and seen record must belong to its own dismissal.
        Wish.configure(appId: "next-project", clientKey: "next-key", externalUserId: UUID().uuidString, appVersion: "3.0.0", baseURL: next.url)
        for _ in 0..<1000 {
            if let presentation = host.presentedViewController,
               let webView = findWebView(in: presentation.view), webView.url?.port == next.url.port,
               webView.window != nil, webView.bounds.width > 100, webView.bounds.height > 100 { break }
            try await Task.sleep(nanoseconds: 10_000_000)
        }
        let nextPresentation = try XCTUnwrap(host.presentedViewController)
        let nextWebView = try XCTUnwrap(findWebView(in: nextPresentation.view))
        XCTAssertEqual(nextWebView.url?.port, next.url.port)
        XCTAssertNotNil(nextWebView.window)
        XCTAssertGreaterThan(nextWebView.bounds.width, 100)
        XCTAssertGreaterThan(nextWebView.bounds.height, 100)
        XCTAssertEqual(next.requestCount, 1)
        XCTAssertTrue(Set(UserDefaults.standard.dictionaryRepresentation().keys).subtracting(before).filter { $0.hasPrefix("wish.whatsNew.seenVersion") }.isEmpty)

        nextPresentation.dismiss(animated: false)
        for _ in 0..<200 {
            if UserDefaults.standard.dictionaryRepresentation().keys.contains(where: { !before.contains($0) && $0.hasPrefix("wish.whatsNew.seenVersion") }) { break }
            try await Task.sleep(nanoseconds: 10_000_000)
        }
        let seen = UserDefaults.standard.dictionaryRepresentation().filter { !before.contains($0.key) && $0.key.hasPrefix("wish.whatsNew.seenVersion") }
        XCTAssertEqual(seen.count, 1)
        XCTAssertEqual(seen.values.first as? String, "3.0.0")
    }

    func testEmptyAndFailedContentDoNotBecomeReady() async throws {
        for state in ["empty", "error"] {
            let fixture = try await ContentFixture(html: page(state: state))
            let content = makeContent(baseURL: fixture.url)
            let ready = await content.waitUntilReady()
            XCTAssertFalse(ready)
            XCTAssertEqual(content.phase, state == "empty" ? .empty : .failed)
            content.cancel()
            fixture.close()
        }
    }

    func testInterruptedVisibleLoadCanStartAgain() async throws {
        let fixture = try await ContentFixture(html: page(state: "ready", delay: 2000))
        defer { fixture.close() }
        let content = makeContent(baseURL: fixture.url)
        let host = UIHostingController(rootView: WishContentView(content: content).onDisappear { content.cancel() })
        let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
        let window = UIWindow(windowScene: scene)
        window.rootViewController = host
        window.makeKeyAndVisible()
        defer { window.isHidden = true }
        try await waitForPage(content.webView)
        XCTAssertEqual(content.phase, .loading)
        window.rootViewController = UIViewController()
        try await Task.sleep(nanoseconds: 50_000_000)
        window.rootViewController = host
        for _ in 0..<500 {
            if content.phase != .loading { break }
            try await Task.sleep(nanoseconds: 10_000_000)
        }
        XCTAssertEqual(content.phase, .ready)
        XCTAssertEqual(fixture.requestCount, 2)
        content.cancel()
    }

    func testWrongVersionCannotMakeTheSurfaceReady() async throws {
        let fixture = try await ContentFixture(html: page(state: "ready", version: "old"))
        defer { fixture.close() }
        let content = makeContent(baseURL: fixture.url)
        let preparation = Task { await content.waitUntilReady() }
        try await waitForPage(content.webView)
        XCTAssertEqual(content.phase, .loading)
        _ = try await content.webView.evaluateJavaScript("window.webkit.messageHandlers.wishContent.postMessage({destination:'whats-new',state:'ready',version:'2.0.0'}); true")
        let ready = await preparation.value
        XCTAssertTrue(ready)
        content.cancel()
    }

    func testChangedConfigurationAndCancellationRejectLateContent() async throws {
        let fixture = try await ContentFixture(html: page(state: "ready", delay: 250))
        defer { fixture.close() }
        let content = makeContent(baseURL: fixture.url)
        let preparation = Task { await content.waitUntilReady() }
        try await waitForPage(content.webView)
        Wish.configure(appId: "another-project", clientKey: "another-key", externalUserId: "another-user", appVersion: "2.0.0", baseURL: fixture.url)
        preparation.cancel()
        let ready = await preparation.value
        XCTAssertFalse(ready)
        XCTAssertFalse(content.isCurrent)
    }

    func testRouterQueryReorderingPreservesTheReadySignal() async throws {
        for clientId in ["test-user", "user name", "user+name", "user name+tag"] {
            let fixture = try await ContentFixture(html: page(state: "waiting"))
            defer { fixture.close() }
            let content = makeContent(baseURL: fixture.url, clientId: clientId)
            let preparation = Task { await content.waitUntilReady() }
            try await waitForPage(content.webView)
            let browserClientId = try await content.webView.evaluateJavaScript("new URL(location.href).searchParams.get('clientId')")
            XCTAssertEqual(browserClientId as? String, clientId)
            _ = try await content.webView.evaluateJavaScript("""
                const reordered = new URL(location.href);
                const parameters = [...reordered.searchParams.entries()].reverse();
                reordered.search = new URLSearchParams(parameters).toString();
                history.replaceState(null, '', reordered.href);
                window.webkit.messageHandlers.wishContent.postMessage({destination:'whats-new',state:'ready',version:'2.0.0'});
                true;
                """)
            for _ in 0..<500 {
                if content.phase != .loading { break }
                try await Task.sleep(nanoseconds: 10_000_000)
            }
            XCTAssertEqual(content.phase, .ready)
            preparation.cancel()
            _ = await preparation.value
            content.cancel()
        }
    }

    func testChangedQueryIdentityAndOldTokensCannotCompleteTheLoad() async throws {
        let fixture = try await ContentFixture(html: page(state: "waiting"))
        defer { fixture.close() }
        let content = makeContent(baseURL: fixture.url)
        let preparation = Task { await content.waitUntilReady() }
        try await waitForPage(content.webView)
        _ = try await content.webView.evaluateJavaScript("window.originalLoadURL = location.href; true")
        for key in ["projectId", "clientId", "clientKey", "view", "appVersion", "wishLoad"] {
            _ = try await content.webView.evaluateJavaScript("""
                (() => {
                  const wrong = new URL(window.originalLoadURL);
                  wrong.searchParams.set('\(key)', 'another-value');
                  history.replaceState(null, '', wrong.href);
                  window.webkit.messageHandlers.wishContent.postMessage({destination:'whats-new',state:'ready',version:'2.0.0'});
                  return true;
                })();
                """)
            try await Task.sleep(nanoseconds: 20_000_000)
            XCTAssertEqual(content.phase, .loading)
        }
        _ = try await content.webView.evaluateJavaScript("""
            (() => {
              const wrong = new URL(window.originalLoadURL);
              wrong.searchParams.append('projectId', wrong.searchParams.get('projectId'));
              history.replaceState(null, '', wrong.href);
              window.webkit.messageHandlers.wishContent.postMessage({destination:'whats-new',state:'ready',version:'2.0.0'});
              return true;
            })();
            """)
        try await Task.sleep(nanoseconds: 20_000_000)
        XCTAssertEqual(content.phase, .loading)
        for change in ["wrong.searchParams.delete('wishLoad')", "wrong.searchParams.append('extra', 'value')"] {
            _ = try await content.webView.evaluateJavaScript("""
                (() => {
                  const wrong = new URL(window.originalLoadURL);
                  \(change);
                  history.replaceState(null, '', wrong.href);
                  window.webkit.messageHandlers.wishContent.postMessage({destination:'whats-new',state:'ready',version:'2.0.0'});
                  return true;
                })();
                """)
            try await Task.sleep(nanoseconds: 20_000_000)
            XCTAssertEqual(content.phase, .loading)
        }
        _ = try await content.webView.evaluateJavaScript("history.replaceState(null, '', window.originalLoadURL); window.webkit.messageHandlers.wishContent.postMessage({destination:'whats-new',state:'ready',version:'2.0.0'}); true")
        let ready = await preparation.value
        XCTAssertTrue(ready)
        content.cancel()
    }

    func testSpacesAndLiteralPlusRemainDifferentRequesterIdentities() async throws {
        for (clientId, wrongId) in [("user name", "user+name"), ("user+name", "user name")] {
            let fixture = try await ContentFixture(html: page(state: "waiting"))
            defer { fixture.close() }
            let content = makeContent(baseURL: fixture.url, clientId: clientId)
            let preparation = Task { await content.waitUntilReady() }
            try await waitForPage(content.webView)
            _ = try await content.webView.evaluateJavaScript("""
                window.originalLoadURL = location.href;
                const wrong = new URL(location.href);
                wrong.searchParams.set('clientId', '\(wrongId)');
                history.replaceState(null, '', wrong.href);
                window.webkit.messageHandlers.wishContent.postMessage({destination:'whats-new',state:'ready',version:'2.0.0'});
                true;
                """)
            try await Task.sleep(nanoseconds: 20_000_000)
            XCTAssertEqual(content.phase, .loading)
            _ = try await content.webView.evaluateJavaScript("history.replaceState(null, '', window.originalLoadURL); window.webkit.messageHandlers.wishContent.postMessage({destination:'whats-new',state:'ready',version:'2.0.0'}); true")
            let ready = await preparation.value
            XCTAssertTrue(ready)
            content.cancel()
        }
    }

    func testSubframeWithTheSameLoadURLCannotCompleteTheLoad() async throws {
        let fixture = try await ContentFixture(html: page(state: "waiting"))
        defer { fixture.close() }
        let content = makeContent(baseURL: fixture.url)
        let preparation = Task { await content.waitUntilReady() }
        try await waitForPage(content.webView)
        _ = try await content.webView.evaluateJavaScript("""
            const frame = document.createElement('iframe');
            frame.onload = () => {
              frame.contentWindow.eval("window.webkit.messageHandlers.wishContent.postMessage({destination:'whats-new',state:'ready',version:'2.0.0'})");
              window.subframeSent = true;
            };
            frame.src = location.href;
            document.body.append(frame);
            true;
            """)
        for _ in 0..<500 {
            if let sent = try? await content.webView.evaluateJavaScript("window.subframeSent === true"), sent as? Bool == true { break }
            try await Task.sleep(nanoseconds: 10_000_000)
        }
        XCTAssertEqual(fixture.requestCount, 2)
        XCTAssertEqual(content.phase, .loading)
        _ = try await content.webView.evaluateJavaScript("window.webkit.messageHandlers.wishContent.postMessage({destination:'whats-new',state:'ready',version:'2.0.0'}); true")
        let ready = await preparation.value
        XCTAssertTrue(ready)
        content.cancel()
    }

    func testDifferentOriginWithTheSameQueryCannotCompleteTheLoad() async throws {
        let fixture = try await ContentFixture(html: page(state: "waiting"))
        let otherOrigin = try await ContentFixture(html: page(state: "ready"))
        defer { fixture.close(); otherOrigin.close() }
        let content = makeContent(baseURL: fixture.url)
        let preparation = Task { await content.waitUntilReady() }
        try await waitForPage(content.webView)
        var foreignURL = URLComponents(url: content.webView.url!, resolvingAgainstBaseURL: false)!
        foreignURL.port = otherOrigin.url.port
        content.webView.load(URLRequest(url: foreignURL.url!))
        for _ in 0..<500 {
            if content.webView.url?.port == otherOrigin.url.port { break }
            try await Task.sleep(nanoseconds: 10_000_000)
        }
        try await waitForPage(content.webView)
        try await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertEqual(otherOrigin.requestCount, 1)
        XCTAssertEqual(content.phase, .loading)
        preparation.cancel()
        let ready = await preparation.value
        XCTAssertFalse(ready)
        content.cancel()
    }

    private func makeContent(baseURL: URL, clientId: String = "test-user") -> WishWebContent {
        Wish.configure(appId: "test-project", clientKey: "test-key", externalUserId: clientId, appVersion: "2.0.0", baseURL: baseURL)
        return WishWebContent(url: Wish.embedURL(for: .whatsNew)!, destination: .whatsNew)
    }

    private func findWebView(in view: UIView) -> WKWebView? {
        if let webView = view as? WKWebView { return webView }
        for child in view.subviews {
            if let webView = findWebView(in: child) { return webView }
        }
        return nil
    }

    private func page(state: String, version: String = "2.0.0", delay: Int = 0) -> String {
        "<html><body><h1>Release content</h1><script>setTimeout(()=>window.webkit.messageHandlers.wishContent.postMessage({destination:'whats-new',state:'\(state)',version:'\(version)'}),\(delay))</script></body></html>"
    }

    private func waitForPage(_ webView: WKWebView) async throws {
        for _ in 0..<500 {
            if let ready = try? await webView.evaluateJavaScript("document.readyState === 'complete' && document.body.textContent.includes('Release content')"), ready as? Bool == true { return }
            try await Task.sleep(nanoseconds: 10_000_000)
        }
        XCTFail("The fixture document did not load")
    }
}

/// Local HTTP transport lets real WebKit deliver the bridge messages. It adds
/// no injection seam to the SDK and never contacts a production service.
private final class ContentFixture: @unchecked Sendable {
    private let listener: NWListener
    private let queue: DispatchQueue
    private let lock = NSLock()
    private var requests = 0
    let url: URL

    var requestCount: Int {
        lock.lock()
        defer { lock.unlock() }
        return requests
    }

    init(html: String) async throws {
        let listener = try NWListener(using: .tcp, on: .any)
        let queue = DispatchQueue(label: "wish.tests.http")
        self.listener = listener
        self.queue = queue
        listener.newConnectionHandler = { $0.cancel() }
        let port: UInt16 = try await withCheckedThrowingContinuation { continuation in
            listener.stateUpdateHandler = { state in
                if case .ready = state, let port = listener.port {
                    listener.stateUpdateHandler = nil
                    continuation.resume(returning: port.rawValue)
                } else if case .failed(let error) = state {
                    listener.stateUpdateHandler = nil
                    continuation.resume(throwing: error)
                }
            }
            listener.start(queue: queue)
        }
        url = URL(string: "http://127.0.0.1:\(port)")!
        listener.newConnectionHandler = { [weak self] connection in
            guard let self else { connection.cancel(); return }
            connection.start(queue: self.queue)
            connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { _, _, _, _ in
                self.lock.lock()
                self.requests += 1
                self.lock.unlock()
                let body = Data(html.utf8)
                var response = Data("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: \(body.count)\r\nConnection: close\r\n\r\n".utf8)
                response.append(body)
                connection.send(content: response, completion: .contentProcessed { _ in connection.cancel() })
            }
        }
    }

    func close() { listener.cancel() }
}
