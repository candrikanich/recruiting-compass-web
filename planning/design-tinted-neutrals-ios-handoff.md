# Design: Tinted Neutrals — iOS Handoff

## What was changed (web)

Applied the "tinted neutral" technique used by Linear, Stripe, and Vercel.
The principle: every neutral carries a trace of the brand hue so the brand color
feels native to the surface rather than sitting on top of it.

**Brand temperature:** Cool (blue primary = `#2563EB` / brand-blue-600)

### Web token changes (`assets/styles/theme.css`)

| Token | Before | After |
|-------|--------|-------|
| `--background` | `#ffffff` | `#F4F6FA` |
| `--card` | `#ffffff` | `#FAFBFD` |
| `--popover` | `oklch(1 0 0)` | `#FAFBFD` |
| `--muted` | `#ececf0` | `#E8EDF5` |
| `--border` | `rgba(0,0,0,0.1)` | `rgba(30,50,100,0.12)` |
| `--shadow-card` | pure-black | blue-tinted |
| `--shadow-card-hover` | pure-black | blue-tinted |
| `--shadow-lg` | pure-black | blue-tinted |

---

## iOS equivalent (SwiftUI)

The same technique applies directly. Pure black shadows and pure white
backgrounds in SwiftUI produce the same "spreadsheet" effect.

### 1. Color tokens — add to `AppColors.swift` (or wherever colors live)

```swift
extension Color {
    // Surfaces
    static let appBackground    = Color(red: 244/255, green: 246/255, blue: 250/255) // #F4F6FA
    static let appSurface       = Color(red: 250/255, green: 251/255, blue: 253/255) // #FAFBFD
    static let appSurface2      = Color(red: 237/255, green: 240/255, blue: 247/255) // #EDF0F7
    static let appMuted         = Color(red: 232/255, green: 237/255, blue: 245/255) // #E8EDF5

    // Borders
    static let appBorder        = Color(red: 30/255, green: 50/255, blue: 100/255).opacity(0.12)
    static let appBorderStrong  = Color(red: 30/255, green: 50/255, blue: 100/255).opacity(0.22)

    // Text hierarchy (cool-leaning, not flat grey)
    static let appTextPrimary   = Color(red: 15/255,  green: 21/255,  blue: 35/255)   // #0F1523
    static let appTextSecondary = Color(red: 58/255,  green: 69/255,  blue: 96/255)   // #3A4560
    static let appTextMuted     = Color(red: 122/255, green: 139/255, blue: 160/255)  // #7A8BA0
}
```

### 2. Shadow view modifiers — add to a `View+Shadow.swift` extension

```swift
private let brandR: Double = 30/255
private let brandG: Double = 50/255
private let brandB: Double = 100/255

extension View {
    /// Subtle card shadow — equivalent to CSS `--shadow-card`
    func brandShadowSm() -> some View {
        self
            .shadow(
                color: Color(red: brandR, green: brandG, blue: brandB).opacity(0.08),
                radius: 3, x: 0, y: 1
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color(red: brandR, green: brandG, blue: brandB).opacity(0.04), lineWidth: 1)
            )
    }

    /// Hover/elevated card shadow — equivalent to CSS `--shadow-card-hover`
    func brandShadowMd() -> some View {
        self
            .shadow(
                color: Color(red: brandR, green: brandG, blue: brandB).opacity(0.10),
                radius: 8, x: 0, y: 4
            )
            .shadow(
                color: Color(red: brandR, green: brandG, blue: brandB).opacity(0.06),
                radius: 2, x: 0, y: 1
            )
    }

    /// Large shadow — equivalent to CSS `--shadow-lg`
    func brandShadowLg() -> some View {
        self
            .shadow(
                color: Color(red: brandR, green: brandG, blue: brandB).opacity(0.12),
                radius: 20, x: 0, y: 8
            )
    }
}
```

### 3. Usage pattern

```swift
// Before (pure-black shadow, pure-white background)
RoundedRectangle(cornerRadius: 10)
    .fill(Color.white)
    .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)

// After (brand-tinted)
RoundedRectangle(cornerRadius: 10)
    .fill(Color.appSurface)
    .brandShadowSm()
```

### 4. Asset catalog alternative

If the project uses `.xcassets` for colors, add these as named color assets
with the hex values above. Use "Any Appearance" for light mode.
For dark mode, use the dark equivalents from the web's planned dark theme.

---

## Files to modify in iOS

1. Search for existing color definitions: `grep -ril "Color.white\|Color(.white)" --include="*.swift"`
2. Check for existing shadow modifiers: `grep -ril "\.shadow(" --include="*.swift"`
3. Replace `Color.white` backgrounds on cards/sheets with `Color.appSurface`
4. Replace `.shadow(color: .black.opacity(...)` with `brandShadowSm()` / `brandShadowMd()`

---

## Test: desaturate check

The article's validation test: desaturate the screen to greyscale. If hierarchy
still reads clearly, the temperature work is invisible and correct. The tints
should add warmth, not carry structural contrast weight.
