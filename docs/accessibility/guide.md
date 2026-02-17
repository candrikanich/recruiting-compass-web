# Accessibility Guide

Recruiting Compass targets **WCAG 2.1 Level AA** compliance.

---

## Key Requirements

| Category | Requirement |
|---|---|
| Keyboard nav | All interactive elements reachable and operable via keyboard |
| Focus management | Visible focus rings, logical tab order, focus traps in modals |
| Screen readers | Semantic HTML, ARIA labels, live regions for dynamic content |
| Color contrast | 4.5:1 minimum for normal text, 3:1 for large text |
| Forms | Labels associated with inputs, error messages linked via `aria-describedby` |
| Images | Descriptive `alt` text; decorative images use `alt=""` |

---

## Vue/Nuxt Patterns

```vue
<!-- Form field with accessible error -->
<div>
  <label :for="fieldId">{{ label }}</label>
  <input
    :id="fieldId"
    :aria-describedby="error ? `${fieldId}-error` : undefined"
    :aria-invalid="error ? 'true' : undefined"
  />
  <p v-if="error" :id="`${fieldId}-error`" role="alert">{{ error }}</p>
</div>

<!-- Loading state -->
<div aria-live="polite" aria-atomic="true">
  <span v-if="loading" class="sr-only">Loading...</span>
</div>

<!-- Modal with focus trap -->
<ClientOnly>
  <Teleport to="body">
    <dialog aria-modal="true" aria-labelledby="modal-title">
      <!-- always wrap Teleport in ClientOnly for SSR safety -->
    </dialog>
  </Teleport>
</ClientOnly>
```

---

## Testing

**Automated:**
```bash
# Run a11y checks in Playwright tests
npm run test:e2e
```

**Manual checklist:**
- [ ] Navigate entire page with Tab only (no mouse)
- [ ] Test with screen reader (VoiceOver on macOS: Cmd+F5)
- [ ] Check color contrast with browser DevTools
- [ ] Verify all images have meaningful alt text
- [ ] Confirm dynamic content uses `aria-live`

**Tools:**
- axe DevTools (Chrome extension)
- Lighthouse accessibility audit
- VoiceOver (macOS), NVDA (Windows)

---

## Common Issues Fixed

| Issue | Fix |
|---|---|
| `<Teleport>` SSR crash | Wrap in `<ClientOnly>` |
| Missing form labels | Use `<label for="id">` or `aria-label` |
| Non-descriptive buttons | Add `aria-label` or visible text |
| Dynamic content not announced | Add `aria-live="polite"` to container |

---

## Reference Docs

- [ACCESSIBILITY_TESTING_CHECKLIST.md](ACCESSIBILITY_TESTING_CHECKLIST.md) — QA checklist
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
