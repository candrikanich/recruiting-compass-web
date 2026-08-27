# Coach Detail follow-up — header bar + analytics card + KPI rings

Follow-up to PR #475. Figma frame `4:4` (full) vs shipped `4:18` (content only). Three pieces to add/fix. Branch `feat/coach-detail-header-analytics` off develop.

All Figma hex → standard Tailwind utilities (audit:tokens bans only raw hex in style/inline). No raw hex.

## Piece 1 — Header toolbar (`components/Coach/detail/CoachDetailHeader.vue`) — NEW

Full-width white card ABOVE the two-column grid. From Figma node 4:5.

- Card: `bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center justify-between`.
- Left `coach-identity-summary` (`flex gap-3 items-center`): avatar-tiny 36px `rounded-full` (initials, same initials logic as CoachIdentityCard — first_name[0]+last_name[0], `bg-slate-100 text-slate-500` centered) + name/role stack (`flex-col gap-0.5`): name `text-base font-bold text-slate-900`; subtitle `text-xs text-slate-600`.
  - Subtitle text: render `{roleLabel} · {schoolName}` (e.g. "Head Coach · Wake Forest University"). NOTE: Figma literal was "Recruiting Candidate · Head Coach" — that "Recruiting Candidate" prefix is mockup filler for a coach; use role + school instead. roleLabel via existing role map (head→"Head Coach", assistant→"Assistant Coach", recruiting→"Recruiting Coordinator").
- Right `actions` (`flex gap-2.5 items-center`):
  - Edit Profile: `bg-blue-50 rounded-lg px-4 py-2 flex gap-1.5 items-center`; pencil icon 14px `text-blue-500`; label `text-[13px] font-semibold text-blue-500`. Emits `edit`.
  - Delete Coach: `bg-red-50 border border-red-300 rounded-lg px-4 py-2 flex gap-1.5 items-center`; trash icon 14px `text-red-500`; label `text-[13px] font-semibold text-red-500`. Emits `delete`.
- Props: `{ coach: Coach; schoolName?: string | null }`. Emits: `{ edit: []; delete: [] }`.
- Icons: `i-heroicons-pencil` / `i-heroicons-trash`.

Page wiring: render `<CoachDetailHeader :coach :school-name @edit=openEdit @delete=confirmDelete />` at the top of `pages/coaches/[id]/index.vue`, replacing the current plain Edit/Delete button strip. KEEP the "Back to All Coaches" link above it (app nav; not in the Figma component frame).

## Piece 2 — Communication analytics card (`components/Coach/detail/CoachCommunicationAnalytics.vue`) — NEW; REPLACES the CommunicationPanel on this page

From Figma node 4:104. Card: `bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3`.
- Header row (`flex items-center justify-between`): title "Communication History & Analytics" `text-sm font-bold text-slate-900`; "All Time" tag `bg-blue-50 text-blue-500 text-[11px] font-semibold rounded px-2 py-1`.
- Split (`flex gap-5 items-center`):
  - Metrics list (`flex-1 flex-col gap-3`):
    - Sent / Received row: label `text-[13px] text-slate-600` "Sent / Received" + value `text-[13px] font-bold text-slate-900` "{sent} / {received}"; below a track `bg-slate-100 h-1.5 rounded w-full` with a `bg-blue-500 h-full` segment whose width % = sent/(sent+received)*100 (0 when none).
    - Response Rate row: label "Response Rate" + value "{responseRate}%"; track `bg-slate-100 h-1.5 rounded w-full` (segment optional — design shows empty track, so just the track is fine).
    - Avg. Response Time row (`flex justify-between`): label "Avg. Response Time" + value `--` (not computed yet; hardcode "--").
  - Divider `w-px h-24 bg-slate-200`.
  - Circular gauge (`w-[180px] flex-col gap-1.5 items-center`): 72px ring showing responseRate% — SVG `<circle>` track `stroke-slate-200` + progress `stroke-emerald-500` (`stroke-linecap-round`, dasharray from responseRate), center labels: `{responseRate}%` `text-lg font-extrabold text-emerald-500` + "RESPONDED" `text-[8px] font-bold text-slate-400 uppercase`; caption below `text-[11px] text-emerald-500` = responseRate>=75?"Great Progress":responseRate>=40?"Building Momentum":"Needs Attention".
- Props: `{ sent: number; received: number; responseRate: number }`. Pure presentational.
- Ring SVG: use `viewBox="0 0 36 36"` circle pattern with `stroke-dasharray="{responseRate} 100"` on the progress circle (standard technique). Use `stroke="currentColor"` + a `text-emerald-500` wrapper so no raw hex.

Page wiring: REMOVE `<CommunicationPanel>` from `pages/coaches/[id]/index.vue` and its import/refs; place `<CoachCommunicationAnalytics :sent :received :response-rate>` where it was (between the KPI cards and the interactions section), fed from `insights.sentReceived.value` + `insights.responseRate.value`. Do NOT modify `components/CommunicationPanel.vue` (still used by other pages).

Log Interaction rewire: the CoachChannelActions "Log Interaction" button previously scrolled to the composer. With the composer gone, `@log-interaction` now navigates to the interaction-create page prefilled: `navigateTo('/interactions/add?coachId=' + coach.id + '&schoolId=' + (coach.school_id||''))`. Add minimal query prefill to `pages/interactions/add.vue` (read `coachId`/`schoolId` from route.query and pass as InteractionForm initial values IF InteractionForm exposes an initial/prefill prop; if it does not, add a small `initial` prop to InteractionForm for coach_id/school_id only). Keep it minimal. Remove now-dead composer handlers (`openCommunication`, `handleCoachInteractionLogged`, `communicationPanelEl` scroll) from the page — but KEEP the social-DM auto-log path (`handleOpenSocial`/`logSocialDm`) and the `handleCoachInteractionLogged`→refresh only if still referenced; if fully dead after composer removal, remove cleanly and update the page spec.

## Piece 3 — Encode KPI rings (`components/Coach/detail/CoachStatCards.vue`) — MODIFY

From Figma nodes 4:81/4:92/4:102. Currently plain empty circles. Encode:
- Days Since Contact card: 48px ring — when overdue, `stroke-red-500` track ring with a centered `i-heroicons-exclamation-circle` (or `-clock`) `text-red-500` icon (design shows an alert-circle in a red ring); when not overdue, `stroke-slate-300` ring, muted icon. Ring via SVG circle, decorative (full ring ok).
- Total Interactions card: 48px ring `stroke-blue-500` with the count centered `text-[12px] font-bold text-blue-500`.
- Preferred Channel card: KEEP existing 40px `bg-orange-500 rounded-full` badge with the channel icon (already correct).
- Rings: `stroke="currentColor"` + text-color utility, `fill-none`. No raw hex. Keep it simple/decorative — no need to encode a precise arc %, just filled colored rings matching the design's look.

## Constraints
`<script setup lang="ts">`, typed props/emits, no `any` outside tests, no prop mutation, no raw hex/rgba. `npm run audit:tokens && npm run type-check` green. Add/adjust unit tests: CoachDetailHeader (edit/delete emits), CoachCommunicationAnalytics (renders sent/received, responseRate, gauge %), and update the page spec for the removed CommunicationPanel + new header/analytics + Log Interaction navigation. Full: `npm run test`.
Commit trailer: `Claude-Session: https://claude.ai/code/session_01Bq11o1S44fVRH9kJWbfXgz`.
