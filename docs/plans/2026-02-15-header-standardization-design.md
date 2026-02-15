# Header Standardization Design

**Date:** 2026-02-15
**Status:** Approved

## Goal

Standardize all page headers to match the Dashboard/Timeline style using a shared `PageHeader` component.

## Decisions

- **Gradient background on all pages** — `bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200`
- **Buttons stay as buttons** — card badges only for data display (e.g., Timeline phase/status)
- **Description-only subtitles** — remove count subtitles; counts live in content area
- **Shared component** — `PageHeader.vue` with props + `#actions` slot to prevent drift

## PageHeader Component

**Location:** `components/PageHeader.vue`

**Props:**
- `title: string` (required) — the h1 text
- `description?: string` — subtitle text below the title

**Slots:**
- `#actions` — right-side content (buttons, badges, custom content)

**Markup:**
```html
<header class="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200" role="banner">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-3xl font-bold text-slate-900">{{ title }}</h1>
        <p v-if="description" class="text-slate-600 mt-1">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-3">
        <slot name="actions" />
      </div>
    </div>
  </div>
</header>
```

## Pages to Update

| Page | Title | Description | Right-side actions |
|------|-------|-------------|-------------------|
| Dashboard | Dashboard | Welcome back, {name}! | _(none)_ |
| Timeline | Recruiting Timeline | Track your 4-year recruiting journey | Phase + Status badges |
| Coaches | Coaches | Track and manage your coach contacts | Add, CSV, PDF |
| Schools | Schools | Track and evaluate your target schools | Add, CSV, PDF |
| Interactions | Interactions | Log and review your recruiting communications | Add, CSV, PDF |
| Events | Events | Track camps, showcases, visits, and games | Add Event |
| Offers | Offers | Track and compare your scholarship offers | Compare, Log Offer |
| Documents | Documents | Manage videos, transcripts, and recruiting documents | _(from current page)_ |
| Recommendations | Recommendation Letters | Track recommendation letter requests | _(from current page)_ |
| Search | Advanced Search | Search across your entire recruiting data | _(none)_ |
| Analytics | Analytics | Insights into your recruiting activity | _(none or date range)_ |
| Settings | Settings | Manage your account and preferences | _(none)_ |

## Per-Page Changes

1. Replace existing header markup with `<PageHeader title="..." description="...">`
2. Move right-side buttons/badges into `<template #actions>`
3. Ensure page background is `bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100`
4. Add skip link if missing
5. Remove count subtitles

## What Stays the Same

- Button styling and functionality
- Timeline's custom phase/status badges (via #actions slot)
- Dashboard's dynamic welcome message (via description prop)
- All page content below the header
