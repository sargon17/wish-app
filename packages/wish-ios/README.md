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
