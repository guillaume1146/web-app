---
description: Take an existing MediWyz feature and suggest SaaS-grade improvements by comparing against the best-in-class online SaaS patterns (Linear, Stripe, Notion, Oscar, Teladoc, Strava). Use when the user says "make feature X more professional" or "what are best practices for X".
---

# Suggest SaaS Improvements

A structured 15-minute pass that takes a feature from "functional" to "enterprise-grade" by applying patterns from the best SaaS on the market.

## When to use
- User says "make feature X feel more professional"
- You want to identify the next-level polish for an already-shipped feature
- You're planning a new feature and want to design it with SaaS maturity from day one

## Method

### 1. Scope the feature
- What does it do? (One sentence)
- Who uses it? (Role + context)
- What's the core user journey? (3-5 steps)

### 2. Map to the 8 pillars (from `.claude/rules/saas-best-practice.md`)
Rate current state 1-5 per pillar. Anything ≤3 is an improvement candidate.

### 3. Identify 3 external benchmarks
Name 3 specific products that do this feature well:
- Healthcare SaaS: **Oscar, Teladoc, Zocdoc, Maven Clinic**
- Enterprise SaaS: **Linear, Stripe, Vercel, Notion, Figma**
- Consumer health: **Strava, MyFitnessPal, Apple Health**
- Social / community: **Discord, Slack, Reddit**
- Marketplaces: **Airbnb, Fiverr, Upwork**

Use `WebFetch` to read specific pages (e.g., Oscar's booking flow, Stripe's empty state) if access helps.

### 4. Extract the transferable patterns
For each benchmark, list the *principle* (not the implementation):
- Oscar — "Reassurance language at every waiting step"
- Linear — "Keyboard shortcut hints inline with every button"
- Stripe — "Error copy names the specific validation rule broken"

### 5. Rank suggestions by impact / cost

| Suggestion | Impact | Cost | Priority |
|---|---|---|---|
| Add loading skeletons matching the list layout | HIGH | LOW | P0 |
| Keyboard shortcuts (?⌘K to search, N for new) | MEDIUM | MEDIUM | P1 |
| Streak tracking on health tracker dashboard | HIGH | MEDIUM | P0 |

Impact: HIGH (activation/retention moving metric) / MEDIUM (polish) / LOW (nice-to-have)
Cost: LOW (<1h) / MEDIUM (1-4h) / HIGH (day+)

### 6. Output — the plan
Produce a markdown report:
- **Feature audit** (table: pillar | score | gap)
- **External benchmark table** (table: product | pattern | transferable principle)
- **Ranked suggestions** (table: suggestion | impact | cost | priority | implementation sketch)
- **P0 execution plan** — a ≤1 hour fix list the user can start today

## Benchmark cheatsheet

### Booking / scheduling UX
- **Zocdoc**: same-day availability calendar view, insurance match visible on card
- **Calendly**: time slots respect buffer time; cancellation easy, no guilt copy
- **Oscar**: post-booking confirmation page lists what to prepare + reassurance
- **Teladoc**: pre-visit intake form is 5 questions, not 30

### Dashboards
- **Linear**: left-rail persistent, command palette (cmd+k), keyboard-first
- **Stripe**: stats on top, action on right, table below — predictable grid
- **Vercel**: deploys stream in real-time with log lines appearing
- **Notion**: empty database = template gallery, not blank state

### Settings pages
- **Vercel**: section-card layout, danger zone at the bottom
- **Linear**: inline save (no Save button), undo toast
- **Stripe**: each row has its own ?-tooltip explaining consequences

### Empty states
- **Stripe**: illustration + one-sentence explanation + primary CTA + "Learn more" link
- **Linear**: empty board = onboarding checklist that doubles as tutorial
- **Figma**: empty canvas = recent + templates in one glance

### Notifications
- **Linear**: inbox with threading + read/archive/done (not just list)
- **GitHub**: activity grouped by repo/PR, mark all read per group
- **Discord**: ping vs update differentiation, mute controls

### Error handling
- **Stripe**: "Your card was declined because…" (specific) + alternative action
- **GitHub**: 404 says "This file might have been moved. Search for…"
- **Slack**: "You're offline — messages will send when you reconnect" (not failure)

### Onboarding
- **Linear**: checklist on dashboard, ≤7 items, dismissible
- **Notion**: instant value — template picker before any config
- **Stripe**: progressive disclosure — keys first, webhooks later

### Trust & security
- **1Password**: explicit consent for every cross-device sync
- **Banks** (generic): session-based security badge in top-right
- **Apple**: privacy nutrition label

## Anti-patterns to reject
- Suggesting features a user didn't ask for just because Linear has them
- Proposing expensive tooling changes (migrate framework) when a small design tweak would do
- Recommending animation/chrome at the expense of speed
- Over-indexing on one benchmark (monoculture) — always cite 3
- Copying exact copy verbatim — translate to MediWyz's brand voice
