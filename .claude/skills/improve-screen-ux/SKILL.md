---
description: Walk through a specific screen and systematically improve its UX using the 6 principles in .claude/rules/ux-excellence.md. Use when the user flags a screen as confusing, slow, or unprofessional.
---

# Improve Screen UX

A structured, 10-minute pass that takes a screen from "functional" to "comfortable and confident".

## When to use

- User says a specific screen feels confusing / slow / unprofessional
- You've just added a new feature and want to polish before shipping
- The ux-reviewer agent flagged a screen with multiple warnings

## The 7-step method

### 1. Read the rule first
Open `.claude/rules/ux-excellence.md`. The six principles are the scoring rubric.

### 2. Capture the current state
- List every element on the screen (header, CTA, cards, inputs, footer)
- Identify the primary user task in one sentence
- Read the file(s) and any shared component(s) it imports

### 3. Score against the 6 principles
| Principle | Current score (1-5) | Gap |
|---|---|---|
| One decision | | |
| Status beats jargon | | |
| Timeline visibility | | (N/A if not a stateful object) |
| Actions visible | | |
| Empty states teach | | |
| Errors are opportunities | | |

Anything ≤3 is a fix candidate.

### 4. Apply perceived-speed audit
- `await fetch` without <100ms loading indicator → add skeleton
- Binary toggles not optimistic → switch to optimistic update
- Blank-spinner loading → replace with skeleton matching real layout

### 5. Copy pass
- Replace status codes with human strings
- Rewrite empty-state copy to action-oriented ("Find a doctor" not "No data")
- Rewrite error messages to explain + offer recovery

### 6. Interaction pass
- Move primary CTA above the fold
- Demote competing CTAs to text-only
- Add `HapticFeedback.selectionClick()` on primary action (Flutter)
- Confirm destructive actions with inline undo (toast with "Undo" action) NOT a modal, unless the action is irreversible and high-stakes

### 7. Output the patch
Produce a single diff that addresses the ≤3-scored principles + speed + copy + interaction. Leave ≥4-scored items alone — this is a polish skill, not a rewrite.

## Template diff structure

```
// Before
<Button onPressed={doThing}>Submit</Button>

// After
<ElevatedButton
  onPressed={loading ? null : doThing}
  style: ElevatedButton.styleFrom(backgroundColor: MediWyzColors.teal),
  icon: loading ? SizedBox(child: CircularProgressIndicator(strokeWidth: 2)) : Icon(Icons.check),
  label: Text(loading ? 'Saving…' : 'Save changes'),
)
```

Every after-state should be:
- Visibly confident (bold weight on primary CTA)
- Self-explanatory (label says what will happen, not "Submit")
- Giving feedback (loading state, haptic, success toast)

## Anti-patterns to reject

- Rewriting layout instead of polishing
- Adding animations that delay the user (>300ms)
- Replacing clear English with clever copy
- Adding modals to a screen that had none
- Hiding existing functionality to "simplify" without asking the user

## Dual-target parity

When improving a screen, verify:
1. Is there a web equivalent (`app/**/page.tsx` or `components/**`)?
2. Is there a Flutter equivalent (`mobile/lib/screens/**`)?
3. Do my changes affect semantic parity? If yes, mirror to the other platform in the same pass (see `.claude/rules/web-mobile-parity.md`).

## Done when

- Each of the six principles scores ≥4
- Loading state shows within 100ms of any `await`
- Every string a user sees is written in plain, calm, specific language
- The screen works identically on 375×812 (iPhone mini) and 1440×900 (laptop)
- Running the ux-reviewer agent produces zero blockers
