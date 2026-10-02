#!/bin/bash
set -euo pipefail

# Run real WebKit tests in an application. Swift Package's hostless xctest
# process cannot run UIApplication lifecycle events on the simulator.
package_root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d /tmp/wishkit-ios-tests.XXXXXX)"
project="$work/WishKitTests.xcodeproj"
mkdir -p "$project/xcshareddata/xcschemes"
cat > "$project/project.pbxproj" <<'PROJECT'
// !$*UTF8*$!
{
 archiveVersion = 1;
 classes = {};
 objectVersion = 56;
 objects = {
  000000000000000000000001 = {isa = PBXProject; attributes = {LastUpgradeCheck = 2700; TargetAttributes = {000000000000000000000010 = {CreatedOnToolsVersion = 27.0;}; 000000000000000000000011 = {CreatedOnToolsVersion = 27.0; TestTargetID = 000000000000000000000010;};};}; buildConfigurationList = 000000000000000000000030; compatibilityVersion = "Xcode 14.0"; developmentRegion = en; hasScannedForEncodings = 0; knownRegions = (en,Base); mainGroup = 000000000000000000000002; packageReferences = (000000000000000000000040); productRefGroup = 000000000000000000000003; projectDirPath = ""; projectRoot = ""; targets = (000000000000000000000010,000000000000000000000011);};
  000000000000000000000002 = {isa = PBXGroup; children = (000000000000000000000004,000000000000000000000005,000000000000000000000003); sourceTree = "<group>";};
  000000000000000000000003 = {isa = PBXGroup; children = (000000000000000000000006,000000000000000000000007); name = Products; sourceTree = "<group>";};
  000000000000000000000004 = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "PACKAGE_ROOT/Tests/TestHost/App.swift"; sourceTree = "<absolute>";};
  000000000000000000000005 = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "PACKAGE_ROOT/Tests/WishKitTests/WishWebContentTests.swift"; sourceTree = "<absolute>";};
  000000000000000000000006 = {isa = PBXFileReference; explicitFileType = wrapper.application; path = WishKitTestHost.app; sourceTree = BUILT_PRODUCTS_DIR;};
  000000000000000000000007 = {isa = PBXFileReference; explicitFileType = wrapper.cfbundle; path = WishKitRuntimeTests.xctest; sourceTree = BUILT_PRODUCTS_DIR;};
  000000000000000000000008 = {isa = PBXBuildFile; fileRef = 000000000000000000000004;};
  000000000000000000000009 = {isa = PBXBuildFile; fileRef = 000000000000000000000005;};
  000000000000000000000010 = {isa = PBXNativeTarget; buildConfigurationList = 000000000000000000000031; buildPhases = (000000000000000000000020,000000000000000000000022); buildRules = (); dependencies = (); name = WishKitTestHost; productName = WishKitTestHost; productReference = 000000000000000000000006; productType = "com.apple.product-type.application";};
  000000000000000000000011 = {isa = PBXNativeTarget; buildConfigurationList = 000000000000000000000032; buildPhases = (000000000000000000000021,000000000000000000000023); buildRules = (); dependencies = (000000000000000000000025); name = WishKitRuntimeTests; packageProductDependencies = (000000000000000000000041); productName = WishKitRuntimeTests; productReference = 000000000000000000000007; productType = "com.apple.product-type.bundle.unit-test";};
  000000000000000000000020 = {isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = (000000000000000000000008); runOnlyForDeploymentPostprocessing = 0;};
  000000000000000000000021 = {isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = (000000000000000000000009); runOnlyForDeploymentPostprocessing = 0;};
  000000000000000000000022 = {isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0;};
  000000000000000000000023 = {isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = (000000000000000000000042); runOnlyForDeploymentPostprocessing = 0;};
  000000000000000000000024 = {isa = PBXContainerItemProxy; containerPortal = 000000000000000000000001; proxyType = 1; remoteGlobalIDString = 000000000000000000000010; remoteInfo = WishKitTestHost;};
  000000000000000000000025 = {isa = PBXTargetDependency; target = 000000000000000000000010; targetProxy = 000000000000000000000024;};
  000000000000000000000030 = {isa = XCConfigurationList; buildConfigurations = (000000000000000000000033); defaultConfigurationIsVisible = 0; defaultConfigurationName = Debug;};
  000000000000000000000031 = {isa = XCConfigurationList; buildConfigurations = (000000000000000000000034); defaultConfigurationIsVisible = 0; defaultConfigurationName = Debug;};
  000000000000000000000032 = {isa = XCConfigurationList; buildConfigurations = (000000000000000000000035); defaultConfigurationIsVisible = 0; defaultConfigurationName = Debug;};
  000000000000000000000033 = {isa = XCBuildConfiguration; buildSettings = {SDKROOT = iphoneos; ONLY_ACTIVE_ARCH = YES; SWIFT_OPTIMIZATION_LEVEL = "-Onone"; IPHONEOS_DEPLOYMENT_TARGET = 15.0; SWIFT_VERSION = 5.0; ENABLE_TESTABILITY = YES;}; name = Debug;};
  000000000000000000000034 = {isa = XCBuildConfiguration; buildSettings = {PRODUCT_NAME = "$(TARGET_NAME)"; PRODUCT_BUNDLE_IDENTIFIER = dev.wish.testhost; GENERATE_INFOPLIST_FILE = YES; INFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES; INFOPLIST_KEY_UILaunchScreen_Generation = YES; TARGETED_DEVICE_FAMILY = "1,2"; CODE_SIGNING_ALLOWED = NO;}; name = Debug;};
  000000000000000000000035 = {isa = XCBuildConfiguration; buildSettings = {PRODUCT_NAME = "$(TARGET_NAME)"; PRODUCT_BUNDLE_IDENTIFIER = dev.wish.runtimetests; GENERATE_INFOPLIST_FILE = YES; TARGETED_DEVICE_FAMILY = "1,2"; CODE_SIGNING_ALLOWED = NO; TEST_HOST = "$(BUILT_PRODUCTS_DIR)/WishKitTestHost.app/WishKitTestHost"; BUNDLE_LOADER = "$(TEST_HOST)";}; name = Debug;};
  000000000000000000000040 = {isa = XCLocalSwiftPackageReference; relativePath = "PACKAGE_ROOT";};
  000000000000000000000041 = {isa = XCSwiftPackageProductDependency; package = 000000000000000000000040; productName = WishKit;};
  000000000000000000000042 = {isa = PBXBuildFile; productRef = 000000000000000000000041;};
 };
 rootObject = 000000000000000000000001;
}
PROJECT
python3 - "$project/project.pbxproj" "$package_root" <<'PY'
from pathlib import Path
import sys
project = Path(sys.argv[1])
project.write_text(project.read_text().replace('PACKAGE_ROOT', sys.argv[2]))
PY
cat > "$project/xcshareddata/xcschemes/WishKitRuntimeTests.xcscheme" <<'SCHEME'
<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2700" version="1.3">
 <BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries>
  <BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="NO" buildForArchiving="NO" buildForAnalyzing="YES"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="000000000000000000000010" BuildableName="WishKitTestHost.app" BlueprintName="WishKitTestHost" ReferencedContainer="container:WishKitTests.xcodeproj"/></BuildActionEntry>
  <BuildActionEntry buildForTesting="YES" buildForRunning="NO" buildForProfiling="NO" buildForArchiving="NO" buildForAnalyzing="YES"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="000000000000000000000011" BuildableName="WishKitRuntimeTests.xctest" BlueprintName="WishKitRuntimeTests" ReferencedContainer="container:WishKitTests.xcodeproj"/></BuildActionEntry>
 </BuildActionEntries></BuildAction>
 <TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables><TestableReference skipped="NO"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="000000000000000000000011" BuildableName="WishKitRuntimeTests.xctest" BlueprintName="WishKitRuntimeTests" ReferencedContainer="container:WishKitTests.xcodeproj"/></TestableReference></Testables></TestAction>
 <LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0"><BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="000000000000000000000010" BuildableName="WishKitTestHost.app" BlueprintName="WishKitTestHost" ReferencedContainer="container:WishKitTests.xcodeproj"/></BuildableProductRunnable></LaunchAction>
</Scheme>
SCHEME
printf 'Test artifacts: %s\n' "$work"
xcodebuild -project "$project" -scheme WishKitRuntimeTests -destination "platform=iOS Simulator,id=${1:?Pass an iOS Simulator UUID}" -parallel-testing-enabled NO -derivedDataPath "$work/build" -resultBundlePath "$work/results.xcresult" test CODE_SIGNING_ALLOWED=NO
