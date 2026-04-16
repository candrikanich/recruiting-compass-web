## iOS / SwiftUI

- Only use APIs and modifiers that actually exist in the target framework version. For SwiftUI, verify any unfamiliar modifier exists before using it. Do not hallucinate APIs like `.accessibilityLiveRegion()`. When unsure, use a Bash command to search Apple documentation or the project's existing usage patterns.
- **xcconfig files are gitignored — always edit `project.pbxproj`**: Many `.xcconfig` files are gitignored and will never reach CI. Before editing any xcconfig, run `git check-ignore -v <file>`. If gitignored, apply the build setting change to `project.pbxproj` instead. Find the right location with `grep -n "SETTING_NAME" TheRecruitingCompass.xcodeproj/project.pbxproj`.
- **Always update both Debug and Release configurations**: Build settings in `project.pbxproj` appear in multiple configuration blocks. After any pbxproj change, verify both configs are consistent: `grep -A2 -B2 "YOUR_SETTING" TheRecruitingCompass.xcodeproj/project.pbxproj`. Patching only Debug causes Release (what CI builds) to fail.
- **Verify Swift feature flag names exactly — never guess**: Wrong flag variant is the #1 cause of multi-round CI fix sessions. Always grep existing project settings first: `grep -r "enable-experimental\|ExperimentalFeature" TheRecruitingCompass.xcodeproj/` before applying any compiler flag fix.

## iOS Simulator Troubleshooting

When the simulator behaves unexpectedly during builds or UI tests, work through this ladder in order:

**Simulator won't boot / shuts down mid-test:**
```bash
sudo xcrun simctl shutdown all
xcrun simctl erase all          # full reset — clears all simulator state
xcrun simctl boot "iPhone 16"   # boot a known-good device
```

**SPM resolution failures or DerivedData corruption:**
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf ~/Library/Caches/org.swift.swiftpm
# Then re-open project and let SPM re-resolve
```

**`xcodebuild` destination not found:**
Try destinations in this order until one works:
```bash
-destination 'generic/platform=iOS Simulator'
-destination 'platform=iOS Simulator,name=iPhone 16'
-destination 'platform=iOS Simulator,name=iPhone 15'
-destination 'platform=iOS Simulator,OS=latest,name=iPhone 16'
```

**Password autofill eating characters in UI tests:**
iOS autofill silently drops characters from `.newPassword` / `.password` fields during `app.typeText()`. Fix:
```swift
// In the text field under test — use clipboard paste instead of typeText
UIPasteboard.general.string = "testPassword123"
field.tap()
app.menuItems["Paste"].tap()
```
Or set `.textContentType(.none)` on the field in test builds (via `#if DEBUG`).

**UI tests fail locally but pass CI (or vice versa):**
Check simulator locale and keyboard settings — CI uses a clean simulator with no custom keyboards. Ensure tests don't depend on autocorrect, predictive text, or locale-specific formatting.
