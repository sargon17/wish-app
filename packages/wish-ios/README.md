# WishKit (iOS)

Minimal iOS integration for Wish: a SwiftUI view that renders the hosted Wish
embed (`/embed`) in a `WKWebView`. No native data models — the hosted UI owns
listing, creating, upvoting, and commenting on requests.

## Requirements

- iOS 15+
- A Wish project id (the `appId`)
- A **public** project API key with `read` and `write` scopes, created from
  the project dashboard. Never ship an `admin` key in an app.

## Install

Add the package as a local Swift package dependency pointing at
`packages/wish-ios` (no public SPM release yet).

## Usage

```swift
import WishKit

// Once at startup:
Wish.configure(
    appId: "<projectId>",
    clientKey: "wish_pk_...",
    externalUserId: currentUser.id
)

// Anywhere in SwiftUI:
WishView()
```

`externalUserId` is a stable identifier for the current user of your app. Wish
uses it to attribute requests, upvotes, and comments to that user.

If `WishView` is rendered before `Wish.configure`, it shows a visible
configuration error instead of a blank view. Load failures show a native retry
state.

Use `WishView(.changelog)` for the release feed. To show release notes for the
current app version automatically, add `.wishWhatsNewSheet()` to the host view.
Pass `appVersion` to `Wish.configure`, or use the version from the app bundle.

The automatic sheet prepares one web view and presents it after the release
content is ready. It uses that same web view when the sheet opens. Preparation
stops after 30 seconds, on cancellation, or when configuration changes. Empty
notes and failed loads do not open the sheet.

The version is marked seen only when a ready sheet is dismissed. The seen record
is local and scoped by origin, project, client key, and requester. The new scoped
record can show notes once more for a version recorded by an older SDK. Failed,
empty, cancelled, and timed-out loads do not mark a version seen. A later
appearance can try again.

Content is retained during the current preparation or visible view. There is no
content cache across separate openings. New openings make live API calls.

Run the native behavior tests in an app host on an iOS Simulator:

```sh
packages/wish-ios/Tests/run-ios-tests.sh <simulator-uuid>
```
