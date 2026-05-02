---
description: Shared design tokens between Tailwind (web) and Flutter theme — colours, spacing, radii
globs: "{mobile/lib/theme,app/globals.css,tailwind.config}/**/*"
---

# Design tokens — web ↔ Flutter synchronisation

A change to a colour, spacing scale, or corner radius must update BOTH the Tailwind config (web) and `mobile/lib/theme/mediwyz_theme.dart` (Flutter).

## Token map (current)

| Token | Web (Tailwind / CSS var) | Flutter (`MediWyzColors`) |
|---|---|---|
| Navy (primary text / headings) | `#001E40` | `MediWyzColors.navy` |
| Teal (primary action) | `#0C6780` | `MediWyzColors.teal` |
| Sky (accent / surfaces) | `#9AE1FF` | `MediWyzColors.sky` |
| White (background) | `#FFFFFF` | `MediWyzColors.white` |
| Emerald (success / billing) | `#10B981` | inline `Color(0xFF10B981)` |
| Red (destructive) | Tailwind `red-600` | `Colors.red.shade700` |

## Radii / spacing

| Token | Web (Tailwind) | Flutter |
|---|---|---|
| Card radius | `rounded-xl` (12 px) | `BorderRadius.circular(12)` |
| Button radius | `rounded-lg` (10 px) | `BorderRadius.circular(10)` |
| Pill / chip | `rounded-full` | `BorderRadius.circular(20)` |
| Base gutter | `p-4` (16 px) | `EdgeInsets.all(16)` |
| Tight gutter | `p-3` (12 px) | `EdgeInsets.all(12)` |

## How to add a token

1. Update Tailwind config (or `app/globals.css` CSS vars) — web.
2. Update `MediWyzColors` in `mobile/lib/theme/mediwyz_theme.dart` — Flutter.
3. Reference through the token name in code — never hex literals inline (except the rare cross-origin exception like emerald).

## Forbidden

- ❌ Colours hex-coded in components (`color: Color(0xFF0C6780)` → use `MediWyzColors.teal`)
- ❌ Inline Tailwind arbitrary values duplicated per component (`bg-[#0C6780]` → use a utility class or CSS var)
- ❌ Changing one side's token without the other — a PR that breaks brand consistency across clients is incomplete
