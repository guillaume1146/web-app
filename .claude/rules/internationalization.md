---
description: Multi-country, multi-currency, multi-language conventions
---

# Internationalization (i18n)

MediWyz operates across **6 countries**: Mauritius (MU), Madagascar (MG), Kenya (KE), Togo (TG), Benin (BJ), Rwanda (RW).

## Country & Region

- Always store `regionCode` (ISO-2: `MU`, `MG`, `KE`, etc.) on user-related rows. Never assume single-country.
- Currency, phone format, address format, language defaults all derive from `Region`.
- Default region: `MU`. Default currency: MUR (Mauritian Rupee).

## Currency

- Use `useCurrency()` hook on the frontend — never hardcode `Rs ` prefix in components.
- Backend stores amounts in **the smallest unit of the region's currency** (cents/sen) as `Float` for now. Always format on display.
- Conversion rates loaded from `Region.exchangeRate`.

## Language

- 3 supported: `en` (default), `fr` (Mauritius/Madagascar/Togo/Benin/Rwanda), `mfe` (Mauritian Creole).
- User preference stored in `UserPreference.language`.
- Use `next-intl` or `i18next` keys, never inline strings in user-facing UI. (Many existing components use inline strings — extract on touch, don't refactor en-masse.)

## Date & Time

- Store as UTC `DateTime`. Display in the user's `UserPreference.timezone` (defaults to `Indian/Mauritius`).
- Frontend: use `Intl.DateTimeFormat` or `intl` (Flutter) — never `Date.toString()`.

## Phone Numbers

- Store with country prefix: `+230 5789 0123` (MU), `+254 700 000 001` (KE).
- Validate against region prefix before save.

## Address

- Free-text for now. Include city + country in user-visible labels.

## Forbidden

- ❌ Hardcoding `'Rs '` or `'$ '` in component code
- ❌ Assuming MU when no region context exists
- ❌ Storing localized timestamps in DB (always UTC)
- ❌ One-language UI strings without a translation key
