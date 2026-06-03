# Multi-Step Workflow Patterns

Read when building invite / confirm / hand-off flows (anything with sender + receiver + pending state).

## State buckets

Track four states:

- `sentItems` — I initiated
- `receivedItems` — sent to me
- `pendingItems` — awaiting confirmation
- `completedItems` — done

## Notifications

- **Step 2** — HIGH priority to the next actor
- **Step 3** — MEDIUM priority to both parties
- Include `action_url` in every notification
- Don't block the main flow on notification failure (fire-and-forget)

## Settings Page Layout

Organize the settings/management page by action, one card component per state:

1. **Pending Confirmations** — amber
2. **Received Invitations** — blue
3. **Sent Invitations** — gray
4. **Completed** — green
