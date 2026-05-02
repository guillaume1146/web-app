---
description: Run the parallel functionality audit pattern across user dashboards and produce a punch list
---

# Audit Functionality

When the user asks "what's broken?" or "what's missing?" or wants a punch list before a release.

## Process

1. **Spawn 4 Explore agents in parallel** (one message, multiple tool calls):
   - Patient dashboard
   - Provider dashboard (`/provider/[slug]/`)
   - Insurance + Corporate + Regional Admin (3 in one)
   - Cross-cutting (search, video, chat, notifications, health shop)

2. **Each agent does static analysis only** (do not run the app):
   - Walk every page in the assigned area
   - Identify the API endpoint(s) called
   - Confirm endpoint exists in `backend/src/**/*.controller.ts`
   - Compare frontend response shape vs backend response shape
   - Flag hardcoded role checks (`userType === 'DOCTOR'`)
   - Flag stub handlers (empty `onClick`, `() => {}`, TODO comments)

3. **Each agent reports under 400 words**, grouped by:
   - **BROKEN** (would crash, missing endpoint)
   - **STUB** (UI exists, action does nothing)
   - **SHAPE-MISMATCH** (frontend expects X, backend returns Y)
   - **HARDCODED-ROLE** (violates dynamic-roles rule)
   - **WORKING** (brief)

4. **Consolidate** into a single P0/P1/P2 punch list:
   - **P0** — blockers (crashes, security, missing endpoints)
   - **P1** — integration gaps that affect users but don't crash
   - **P2** — polish and tech debt

5. **Estimate effort** per item (rough: 5m / 30m / 1h / half-day).

## Output

A single markdown table the user can tick through, plus a "what to fix in one pass" recommendation.

## DO NOT

- ❌ Read the agents' raw transcripts — they're huge. Trust the summary.
- ❌ Make code changes during the audit — audit first, fix in a separate pass.
- ❌ Spawn more than 4 agents in parallel — token budget overload.
