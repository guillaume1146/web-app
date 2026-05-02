---
description: Socket.IO event naming, room patterns, frontend/backend contracts
---

# Socket.IO Real-time

## Three gateways (NestJS, all on port 3001)

| Gateway | Namespace/path | Events |
|---|---|---|
| `WebRtcGateway` | default `/` | `join-room`, `leave-room`, `signal`, `heartbeat`, `recovery-info`, `user-joined`, `user-left` |
| `ChatGateway` | default `/` | `chat:join`, `chat:message:send`, `chat:message:new`, `chat:typing`, `chat:stop-typing`, `chat:read` |
| `NotificationsGateway` | default `/` | `chat:join` (subscribes to `user:{userId}` room), `notification:new`, `notification:read`, `notification:read-all` |

## Room naming convention (strict)

| Purpose | Room name |
|---|---|
| User's notifications | `user:{userId}` |
| Conversation messages | `convo:{conversationId}` |
| Video room | `room:{roomCode}` |

## Event naming convention

- `<feature>:<action>` — colon separates scope from verb.
- Actions are **verbs in present tense or past participle** (`send`, `read`, `joined`).
- Server → client: past tense / state (`joined`, `read`, `new`).
- Client → server: imperative (`send`, `join`, `mark-read`).

## Frontend contract

- One Socket.IO connection per app, lazy-initialized in `DashboardLayout` after login.
- Subscribe by emitting `chat:join { userId }` once on connect.
- All listeners are added in `useEffect` and cleaned up in the return.
- Connection URL: `process.env.NEXT_PUBLIC_SOCKET_URL || http://localhost:3001` (NEVER `window.location.origin` — Next.js runs on a different port).

## Backend rules

- Validate every payload at the start of `@SubscribeMessage`. Emit a typed `<event>-error` on bad input.
- Never trust `userId` from the payload for authorization — derive it from the JWT cookie via the gateway's auth guard if available.
- Idempotent event handlers — joining a room you're already in is a no-op, not an error.

## Forbidden

- ❌ Broadcasting to all clients (`server.emit(...)`) for user-specific data — always to a room
- ❌ Heavy DB queries in event handlers — defer to a service or queue
- ❌ Different event names per provider role (e.g., `doctor:joined`) — use generic role-agnostic names
