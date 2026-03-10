# Design Tokens

Source files: `assets/styles/theme.css` (semantic tokens), `assets/css/main.css` (brand palette via `@theme`).

## Semantic Tokens

These are CSS custom properties defined in `assets/styles/theme.css`. Use them for structural/layout concerns. Do not use raw brand colors for semantic roles.

| Token | Value | Use for | Avoid |
|-------|-------|---------|-------|
| `--background` | `#ffffff` | Page/app background | Card surfaces |
| `--foreground` | `oklch(0.145 0 0)` | Primary body text | Secondary text |
| `--card` | `#ffffff` | Card surface background | Page background |
| `--card-foreground` | `oklch(0.145 0 0)` | Text inside cards | — |
| `--popover` | `oklch(1 0 0)` | Dropdown/popover bg | — |
| `--popover-foreground` | `oklch(0.145 0 0)` | Dropdown/popover text | — |
| `--primary` | `#030213` | Rarely used directly; prefer brand-blue for interactive elements | — |
| `--primary-foreground` | `oklch(1 0 0)` | Text on `--primary` bg | — |
| `--secondary` | `oklch(0.95 0.0058 264.53)` | Secondary surfaces | — |
| `--secondary-foreground` | `#030213` | Text on secondary surfaces | — |
| `--muted` | `#ececf0` | Muted backgrounds, disabled state bg, inactive filter pills | Active/emphasis elements |
| `--muted-foreground` | `#717182` | Secondary/helper text, captions, metadata | Primary content |
| `--accent` | `#e9ebef` | Hover bg for secondary buttons | — |
| `--accent-foreground` | `#030213` | Text on accent bg | — |
| `--destructive` | `#d4183d` | Destructive action text/border (when not using brand-red) | Non-destructive contexts |
| `--destructive-foreground` | `#ffffff` | Text on destructive bg | — |
| `--border` | `rgba(0,0,0,0.1)` | Default borders on inputs, cards, dividers | Colored/semantic borders |
| `--input` | `transparent` | Input element border | — |
| `--input-background` | `#f3f3f5` | Input field background | Card backgrounds |
| `--switch-background` | `#cbced4` | Toggle/switch off-state bg | — |
| `--ring` | `oklch(0.708 0 0)` | Focus outline (auto-applied via `@layer base`) | Manual focus styles |

## Shadow Tokens

| Token | Use for |
|-------|---------|
| `--shadow-card` | Default card resting state |
| `--shadow-card-hover` | Card hover/elevated state |
| `--shadow-lg` | Large overlays, modals |

## Gradient Tokens

| Token | Use for |
|-------|---------|
| `--gradient-page` | Page/section background gradient (slate → blue → slate) |
| `--gradient-blue` | Blue accent gradient (135deg, blue-500 → blue-600) |
| `--gradient-purple` | Purple accent gradient |
| `--gradient-emerald` | Emerald accent gradient |
| `--gradient-orange` | Orange accent gradient |

Use gradients in `GradientCard` components and hero sections. Avoid in inline text or small elements.

## Brand Palette

Raw brand colors live in the `@theme` block in `assets/css/main.css`. They are available as both:
- **Tailwind utilities:** `bg-brand-blue-500`, `text-brand-emerald-700`, `border-brand-orange-200`, etc.
- **CSS custom properties:** `var(--color-brand-blue-500)` (via Tailwind v4's `:root` exposure)

Available palettes (each has steps 50–900):

| Palette | Tailwind prefix | Semantic role |
|---------|----------------|---------------|
| Blue | `brand-blue-*` | Primary actions, links, info |
| Emerald | `brand-emerald-*` | Success, positive, inbound |
| Purple | `brand-purple-*` | Secondary, outbound, premium |
| Orange | `brand-orange-*` | Warning, pending, reach |
| Slate | `brand-slate-*` | Neutral, disabled, default |
| Red | `brand-red-*` | Error, danger, destructive |
| Indigo | `brand-indigo-*` | Accent (Button component only) |

**Rule:** Always use the palette via Tailwind utilities (`bg-brand-blue-600`) or via the `BadgeColor`/`ButtonColor` type — never write `color: #3b82f6` directly in a Vue template.
