---
description: Propagate a brand token change (colour, spacing, radius, typography) across Tailwind (web) and the Flutter theme
---

# Sync design tokens

When a brand colour or spacing rule changes — run this to keep web and Flutter in lockstep.

## When to use

- Designer swaps the primary colour
- New accent colour gets added (e.g. a warning orange)
- Corner radius changes globally (e.g. 12 px → 16 px)
- Typography scale changes

## Process

1. **Identify the token being changed.**

2. **Update web source of truth:**
   - Tailwind colours: look for `tailwind.config.*` (or `app/globals.css` for CSS vars) and edit.
   - Grep for the old value: `rg "#OLDHEX" app components` — replace token-named usages, leave arbitrary values alone for now.
   - Run the web app and eyeball mobile viewport (Chrome DevTools 375 × 812).

3. **Update Flutter:**
   - Open `mobile/lib/theme/mediwyz_theme.dart`
   - Update the `MediWyzColors` constant
   - Grep for the old value: `rg "0xFFOLDHEX" mobile/lib` → replace with `MediWyzColors.X`
   - `flutter analyze` — 0 errors
   - `flutter build web --debug` — succeeds

4. **Verify visually side-by-side:**
   - Web mobile viewport vs `flutter run -d web-server` — same brand colour on both
   - Screenshots of 3 canonical screens: login, feed, more-menu

5. **Update `.claude/rules/flutter-design-tokens.md`** token map table with the new value.

## Conventions

- Name new tokens by role (teal, navy, sky) not by hex.
- Keep the token map table in `.claude/rules/flutter-design-tokens.md` in sync — that's the contract.
- Flutter's `Color(0xFFxxxxxx)` uses ARGB, Tailwind uses `#xxxxxx` — the 8 hex digits in Dart equal `FF` + the 6 digits on web.

## Forbidden

- ❌ Update web without Flutter (creates visual drift)
- ❌ Add a new accent colour to Flutter but not register it in Tailwind
- ❌ Leave the token map in the rules file stale
