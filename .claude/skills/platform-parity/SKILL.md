---
name: platform-parity
description: Keep the web app and the iOS app feature-, UX-, and data-symmetric. Use when adding, removing, renaming, or restyling a field, data pill, section, or option set on either platform, when the user says "add it to the web too", "add it back on iOS too", "replicate the iOS app on the web", "parity", or when a display bug is found on one platform.
---

# Web ↔ iOS Parity

Repos: `recruiting-compass-web` and `recruiting-compass-ios`. Chris treats them as one product. A change that lands on only one platform is incomplete work, not a finished task.

Parity flows both directions. iOS is often the reference implementation ("replicate the iOS app on the web"), web is sometimes the reference. Ask which platform is the source of truth for the layout only if the request doesn't say.

## Same-pass rule

When a field, data pill, section, or option set changes on one platform:

1. Locate the equivalent screen on the other platform before writing code.
2. Apply the same change there in the same pass.
3. Commit and push both repos in the same turn (Chris says "commit both and push both").
4. If the other platform is not editable from this session, produce an iOS handoff spec instead — use the `web-to-ios-handoff` skill — and say explicitly that iOS is still pending.

Don't ask whether to also do the other platform. Do it, then report both.

## What must match

- **Sections**: same set, same names, same order, same edit-vs-lookup behavior. Example landed state for school detail: two sections under the map on both platforms — `Contact & Social` (editable) and `College Data` (lookup).
- **Fields**: same fields present in each section. A field missing on one platform is a bug on that platform.
- **Data pills**: same pills, same placement (e.g. the school title header carries the pills; a sidebar status section shows title + control only).
- **Option sets / enums**: identical across platforms. When the two differ, **adopt the richer set and widen the simpler one** — never narrow the richer platform to match a simplified list.
- **Displayed values**: render the complete assembled value, not a partial one. Concrete case: the line under a school name is the full assembled school address (street, city, state, zip), not a campus-address fragment.

## Before reporting done

- [ ] Both platforms changed, or an iOS handoff spec written and the gap named
- [ ] Section list, field list, and option set diffed platform-to-platform, not just eyeballed on one
- [ ] Assembled/composite values render in full on both
- [ ] Build verified per platform (`npx tsc --noEmit` for web, `xcodebuild build -quiet` for iOS)
- [ ] Report states what shipped on web, what shipped on iOS, and what is left
