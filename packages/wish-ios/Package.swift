// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "WishKit",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(name: "WishKit", targets: ["WishKit"])
    ],
    targets: [
        .target(name: "WishKit", path: "Sources/WishKit")
    ]
)
