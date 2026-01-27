# Contributing to Recruiting Compass

Thank you for your interest in contributing to Recruiting Compass! This guide will help you understand how to contribute code, report issues, and participate in development.

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. We expect all community members to:

- Be respectful and considerate in all interactions
- Welcome diversity in backgrounds, experience levels, and perspectives
- Provide constructive feedback and accept criticism gracefully
- Report unacceptable behavior to the project maintainers

Discrimination, harassment, and unprofessional conduct have no place in this community.

---

## Getting Started

### Prerequisites

- **Node.js:** 18.0 or higher
- **npm:** 9.0 or higher
- **Git:** For version control

### Setup Development Environment

1. **Fork the repository**
   ```bash
   # Navigate to https://github.com/chrisandrikanich/recruiting-compass-web
   # Click "Fork" to create your own copy
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/recruiting-compass-web.git
   cd recruiting-compass-web
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/chrisandrikanich/recruiting-compass-web.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

6. **Start development server**
   ```bash
   npm run dev
   # App runs at http://localhost:3000
   ```

### Environment Variables

Create `.env.local` in the project root:

```env
NUXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NUXT_PUBLIC_COLLEGE_SCORECARD_API_KEY=your_api_key_here
NUXT_PUBLIC_DEBUG_MODE=false
```

Contact the maintainers if you need credentials for development.

---

## Development Standards

### TypeScript

- **Strict mode required:** No `any` types except in test files
- **Type safety:** Prefer types over interfaces (except when extending external types)
- **Type imports:** Use `import type { Type }` for type-only imports

```typescript
// ✅ Correct
import type { Coach } from "~/types/coach";
import { useCoaches } from "~/composables/useCoaches";

// ❌ Wrong
import { Coach, useCoaches } from "~/composables/useCoaches";
```

### Vue 3 Composition API

- **Use `<script setup>` syntax** for all new components
- **Reactive state:** Return refs/computed from composables
- **Props & Emits:** Use `defineProps` and `defineEmits` with types

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{
  coach: Coach;
  selected?: boolean;
}>(), {
  selected: false,
});

const emit = defineEmits<{
  select: [coach: Coach];
}>();

const onSelect = () => {
  emit('select', props.coach);
};
</script>
```

### Code Organization

**Function size:** Keep functions under 50 lines
**Single responsibility:** Each function should do one thing well
**Naming:** Use clear, descriptive names; avoid abbreviations

```typescript
// ✅ Correct
const calculateCoachResponsiveness = (interactions: Interaction[]) => {
  const recentCount = interactions.filter(i => isRecent(i)).length;
  return (recentCount / interactions.length) * 10;
};

// ❌ Wrong
const calc = (i: any) => {
  return (i.filter(x => x.date > Date.now() - 30 * 24 * 60 * 60 * 1000).length / i.length) * 10;
};
```

### Composables Pattern

Composables should return refs, computed properties, and functions:

```typescript
export const useMyFeature = () => {
  const data = ref<MyData[]>([]);
  const loading = ref(false);

  const fetch = async () => {
    loading.value = true;
    try {
      data.value = await $fetch("/api/data");
    } finally {
      loading.value = false;
    }
  };

  onMounted(fetch);

  return {
    data: readonly(data),
    loading: readonly(loading),
    fetch,
  };
};
```

### Error Handling

- **Always use try/catch** for async operations
- **Set error state** for user-facing errors
- **Log critical errors** for debugging

```typescript
const fetch = async () => {
  loading.value = true;
  error.value = null;
  try {
    data.value = await $fetch("/api/data");
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Unknown error";
    console.error("[useMyFeature]", error.value);
  } finally {
    loading.value = false;
  }
};
```

---

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/) for consistent commit history.

**Format:** `type(scope): description`

**Types:**
- `feat` – New feature
- `fix` – Bug fix
- `docs` – Documentation
- `refactor` – Code refactoring
- `perf` – Performance improvement
- `test` – Test changes
- `chore` – Build, CI/CD, dependencies

**Scopes:**
- `coaches` – Coach-related features
- `schools` – School management
- `timeline` – Timeline/phases
- `interactions` – Interaction logging
- `templates` – Email templates
- `api` – API endpoints
- `ui` – UI/styling
- `types` – Type definitions

**Examples:**
```bash
git commit -m "feat(coaches): add coach responsiveness score"
git commit -m "fix(timeline): prevent phase advancement without tasks"
git commit -m "docs(readme): update setup instructions"
git commit -m "refactor(composables): extract school filtering logic"
```

### Commit Guidelines

1. **Atomic commits:** Each commit should be a single logical change
2. **Test first:** Run tests before committing
3. **Describe why:** Focus on the reason for the change, not just what changed
4. **Keep it concise:** Use imperative mood ("add" not "added")

---

## Testing Requirements

All new code must include tests. We use **Vitest** for unit tests and **Playwright** for E2E tests.

### Unit Tests

**Location:** `tests/unit/`
**Run:** `npm run test`

```typescript
import { describe, it, expect } from "vitest";
import { calculateFitScore } from "~/utils/fitScore";

describe("calculateFitScore", () => {
  it("should return 1-10 score", () => {
    const score = calculateFitScore(mockUser, mockSchool);
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(10);
  });

  it("should handle missing data", () => {
    const score = calculateFitScore({ ...mockUser, gpa: null }, mockSchool);
    expect(score).toBeDefined();
  });
});
```

### Integration Tests

Test composables with store interactions:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useCoaches } from "~/composables/useCoaches";
import { useCoachStore } from "~/stores/useCoachStore";

describe("useCoaches", () => {
  let store: ReturnType<typeof useCoachStore>;

  beforeEach(() => {
    store = useCoachStore();
    store.$reset();
  });

  it("should create coach and update store", async () => {
    const { createCoach } = useCoaches();
    await createCoach(schoolId, coachData);

    expect(store.coaches).toHaveLength(1);
    expect(store.coaches[0].name).toBe(coachData.name);
  });
});
```

### E2E Tests

**Location:** `tests/e2e/`
**Run:** `npm run test:e2e`

```typescript
import { test, expect } from "@playwright/test";

test("should create and view a coach", async ({ page }) => {
  await page.goto("/coaches");
  await page.fill('[data-testid="coach-name"]', "John Smith");
  await page.fill('[data-testid="coach-email"]', "john@duke.edu");
  await page.click('[data-testid="create-btn"]');

  await expect(page.locator("text=John Smith")).toBeVisible();
});
```

### Coverage Requirements

- **Core logic:** >80% coverage required
- **Utils/helpers:** >85% coverage
- **Components:** >70% coverage (UI changes less frequently)

Run coverage report:
```bash
npm run test:coverage
```

---

## Creating a Pull Request

### Before Creating PR

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes** following development standards

3. **Run all checks**
   ```bash
   npm run type-check    # TypeScript
   npm run lint          # ESLint
   npm run test          # Unit tests
   npm run test:e2e      # E2E tests (ensure dev server running)
   ```

4. **All checks must pass** before creating PR

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactoring
- [ ] Documentation
- [ ] Performance improvement

## Related Issues
Fixes #123

## Changes
- Detailed list of what changed
- Another change
- Another change

## Testing
Describe testing approach:
- Unit tests added for X
- E2E tests added for Y
- Manually tested Z

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests included
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] TypeScript strict mode passes
```

### PR Review Process

1. **Automated checks:** GitHub Actions runs type-check, lint, tests
2. **Code review:** Project maintainer reviews code
3. **Feedback:** Address feedback in new commits (don't force-push)
4. **Approval:** PR approved by maintainer
5. **Merge:** Maintainer merges PR to main

---

## Code Review Checklist

When reviewing code, check for:

- [ ] **Code style:** Follows conventions (TypeScript, Vue, CSS)
- [ ] **Tests:** All new code has tests with good coverage
- [ ] **Documentation:** Comments for non-obvious logic, README updated
- [ ] **Performance:** No obvious performance issues
- [ ] **Security:** No XSS, SQL injection, or security vulnerabilities
- [ ] **Breaking changes:** Documented if exists
- [ ] **Error handling:** Try/catch for async, proper error states

---

## Reporting Issues

### Bug Reports

1. **Search existing issues** to avoid duplicates
2. **Use clear title** describing the problem
3. **Provide reproduction steps** for consistent bugs
4. **Include environment info:**
   ```
   - Browser: Chrome 120
   - OS: macOS 14.3
   - Node version: 18.17
   ```
5. **Attach screenshots** if applicable

### Feature Requests

1. **Clear description** of desired behavior
2. **Use case** explaining why this feature is needed
3. **Related issues** if any exist

---

## Project Structure

```
recruiting-compass-web/
├── pages/              # File-based routing
├── components/         # Vue components
├── composables/        # Reusable logic
├── stores/            # Pinia state management
├── server/api/        # Backend API endpoints
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── tests/
│   ├── unit/         # Vitest unit tests
│   └── e2e/          # Playwright E2E tests
├── documentation/     # Project documentation
└── CLAUDE.md          # Development guidelines
```

---

## Useful Commands

```bash
# Development
npm run dev                # Start dev server
npm run preview           # Preview production build

# Code Quality
npm run type-check        # TypeScript type checking
npm run lint              # ESLint
npm run lint:fix          # Auto-fix linting issues
npm run format            # Format code with Prettier

# Testing
npm run test              # Run unit tests
npm run test:ui           # Interactive test UI
npm run test:coverage     # Coverage report
npm run test:e2e          # E2E tests
npm run test:e2e:ui       # Interactive E2E UI

# Building
npm run build             # Production build
npm run analyze           # Bundle analysis
```

---

## CI/CD Pipeline

The project uses **GitHub Actions** for automated testing and deployment:

1. **On Pull Request:**
   - Type checking passes
   - Linting passes
   - Unit tests pass
   - E2E tests pass

2. **On Merge to Main:**
   - All checks pass
   - Build succeeds
   - Deploy to Netlify

---

## Getting Help

- **Questions:** Create a GitHub Discussion
- **Bugs:** Create a GitHub Issue
- **Security:** Email security@recruitingcompass.dev (don't create public issue)
- **Documentation:** Check `/documentation` folder or CLAUDE.md

---

## Recognition

Contributors who submit PRs and have code merged will be recognized in:
- Git commit history
- Release notes (for significant contributions)
- CONTRIBUTORS.md file

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to Recruiting Compass! 🎉**

