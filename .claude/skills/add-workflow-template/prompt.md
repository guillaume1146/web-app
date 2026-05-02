---
description: Create a new workflow template with statuses, transitions, and triggerable methods
user-invocable: true
---

# Add Workflow Template

Create a new workflow template for a provider type and service mode.

## Steps

1. **Choose provider type** (e.g., DOCTOR, NURSE, DENTIST) and **service mode** (office, home, video)

2. **Define steps** — each step has:
   - `status`: unique code (e.g., `pending`, `accepted`, `in_progress`, `completed`)
   - `label`: human-readable name
   - `order`: step number
   - `flags`: triggerable methods (see `.claude/rules/workflow-engine.md` for all flags)

3. **Define transitions** — each transition has:
   - `from`: source status
   - `to`: target status
   - `action`: action name (e.g., `accept`, `start`, `complete`)
   - `allowedRoles`: who can trigger (`patient`, `provider`, `system`)

4. **Link to PlatformService** (optional) — find service via `GET /api/services/catalog?providerType=X`

5. **Create template** via `POST /api/workflow/templates` with the regional admin's auth

6. **Test**: Create a booking → step through all transitions → verify triggers fire

## Example Template (Video Consultation)
```json
{
  "name": "Doctor Video Consultation",
  "slug": "doctor-video-consultation",
  "providerType": "DOCTOR",
  "serviceMode": "video",
  "steps": [
    { "status": "pending", "label": "Pending", "order": 1, "flags": {} },
    { "status": "accepted", "label": "Accepted", "order": 2, "flags": { "triggers_payment": true, "triggers_notification": true } },
    { "status": "in_session", "label": "Video Session", "order": 3, "flags": { "triggers_video_call": true } },
    { "status": "completed", "label": "Completed", "order": 4, "flags": { "triggers_review_request": true } }
  ],
  "transitions": [
    { "from": "pending", "to": "accepted", "action": "accept", "allowedRoles": ["provider"] },
    { "from": "accepted", "to": "in_session", "action": "start", "allowedRoles": ["provider"] },
    { "from": "in_session", "to": "completed", "action": "complete", "allowedRoles": ["provider"] }
  ]
}
```
