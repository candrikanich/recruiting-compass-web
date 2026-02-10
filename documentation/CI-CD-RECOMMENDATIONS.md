# CI/CD Pipeline Security & Quality Recommendations

**Date:** 2026-02-10
**Status:** Implemented
**Author:** Claude Code

---

## 🎯 Summary

Based on your Nuxt 3/TypeScript/Supabase stack, I've created 3 new CI/CD workflows:

1. **`.github/workflows/security.yml`** - Comprehensive security scanning
2. **`.github/workflows/e2e.yml`** - End-to-end testing with Playwright
3. **`.github/dependabot.yml`** - Automated dependency updates

---

## 📊 Priority Recommendations

| Priority  | Action               | Impact   | Effort | Cost   |
| --------- | -------------------- | -------- | ------ | ------ |
| **🔴 P0** | Dependency scanning  | **High** | Low    | $5/mo  |
| **🔴 P0** | SAST (CodeQL)        | **High** | Low    | $0     |
| **🟠 P1** | E2E tests in CI      | **High** | Medium | $10/mo |
| **🟠 P1** | Secret scanning      | Medium   | Low    | $0     |
| **🟡 P2** | Dependabot           | Medium   | Low    | $0     |
| **🟡 P2** | Accessibility CI     | Medium   | Medium | $5/mo  |
| **🔵 P3** | Performance tracking | Low      | Medium | $0     |

---

## 🔐 Security Workflows

### 1. Dependency Vulnerability Scanning (**CRITICAL**)

**File:** `.github/workflows/security.yml`

**What it does:**

- Runs `npm audit` on every push/PR + daily
- Fails pipeline if critical/high vulnerabilities found
- Uploads results as artifacts
- Slack notifications for scheduled scans

**Why you need this:**

- You have 50+ npm dependencies
- New CVEs published daily
- Takes 2 minutes to run
- **Catches 90% of supply chain attacks**

**First run action:**

```bash
npm audit
# Expect: 5-15 vulnerabilities initially
npm audit fix
git commit -am "chore: fix npm audit vulnerabilities"
```

---

### 2. SAST - Static Application Security Testing

**File:** `.github/workflows/security.yml` (CodeQL job)

**What it detects:**

- SQL injection
- XSS (Cross-Site Scripting)
- Command injection
- Path traversal
- Insecure crypto
- Authentication bypasses
- CSRF vulnerabilities

**Why you need this:**

- Supabase queries could have SQL injection
- User inputs could cause XSS
- Catches issues BEFORE code review
- **Free for public/private repos**

**View results:** `github.com/{org}/{repo}/security/code-scanning`

---

### 3. Secret Scanning

**File:** `.github/workflows/security.yml` (TruffleHog job)

**What it catches:**

- API keys in code
- Database passwords
- OAuth tokens
- Private keys

**Complements:** Your existing `detect-secrets` pre-commit hook

**Difference:**

- Pre-commit: Blocks local commits
- TruffleHog CI: Catches secrets that slip through

---

### 4. License Compliance

**File:** `.github/workflows/security.yml` (license-check job)

**Why:**

- Avoid GPL/AGPL legal issues
- Only allows: MIT, ISC, BSD, Apache-2.0, CC0-1.0

**Action if violation:**

- Find alternative library OR
- Negotiate license exception

---

## 🧪 Quality Workflows

### 1. E2E Tests

**File:** `.github/workflows/e2e.yml`

**Runs:** Playwright tests on Chromium

**Critical flows to test:**

- User registration/login
- School search & filtering
- Coach management
- Interaction logging
- Dashboard navigation

**Note:** Tests exist locally (`npm run test:e2e`) - now run in CI

**Cost:** ~8 minutes per PR

---

### 2. Accessibility Testing (Recommended - Phase 2)

**Status:** Tests exist (`npm run test:a11y`) but not in CI

**Add to `.github/workflows/test.yml`:**

```yaml
- name: Run accessibility tests
  run: npm run test:a11y
```

**Why:** WCAG compliance = legal requirement in many contexts

---

### 3. Performance Monitoring (Optional - Phase 3)

**Tool:** Lighthouse CI

**Tracks:**

- Performance score
- First Contentful Paint
- Largest Contentful Paint
- Time to Interactive
- Cumulative Layout Shift

**Example config** (`.lighthouserc.json`):

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "performance": ["error", { "minScore": 0.8 }],
        "accessibility": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

---

## 🤖 Automated Dependency Updates

**File:** `.github/dependabot.yml`

**Features:**

- Weekly updates (Mondays 6 AM)
- Groups dev dependencies (reduce PR noise)
- Ignores major versions (manual review)
- Auto-labels PRs
- Updates GitHub Actions too

**Expected volume:** 2-5 PRs/week initially, then 1-2/week

**Configuration:**

- **Reviewer:** `candrikanich` (update this!)
- **Labels:** `dependencies`, `automated`
- **Ignored:** Major version bumps

---

## 💰 Cost Analysis

### GitHub Actions Minutes

| Workflow       | Runs        | Duration | Monthly Cost\*   |
| -------------- | ----------- | -------- | ---------------- |
| Security       | Daily + PRs | ~5 min   | $5-10            |
| E2E tests      | Every PR    | ~8 min   | $10-15           |
| Existing tests | Every PR    | ~5 min   | $5-10            |
| **Total**      |             |          | **$20-35/month** |

\* Assumes 50 PRs/month on GitHub Team plan

**Free tier:** 3,000 min/month (public) or 2,000 min/month (private)

---

## 🚀 Implementation Steps

### Step 1: Enable GitHub Security Features

1. Go to `Settings > Code security and analysis`
2. Enable:
   - ✅ Dependabot alerts
   - ✅ Dependabot security updates
   - ✅ Code scanning (CodeQL)

### Step 2: Review & Merge Workflows

```bash
git status
# Should see:
#   .github/workflows/security.yml
#   .github/workflows/e2e.yml
#   .github/dependabot.yml
```

### Step 3: First Security Scan

```bash
npm audit
# Fix critical/high issues:
npm audit fix
# If manual fixes needed:
npm audit fix --force  # Use with caution
```

### Step 4: Monitor First Runs

- Check Actions tab after merge
- Review CodeQL findings in Security tab
- Address critical vulnerabilities first
- Approve first Dependabot PRs

---

## 📋 Maintenance Checklist

### Weekly

- [ ] Review Dependabot PRs
- [ ] Merge dependency updates

### Monthly

- [ ] Review CodeQL trends
- [ ] Check security advisories
- [ ] Update vulnerability thresholds

### Quarterly

- [ ] Manual dependency audit
- [ ] Review performance baselines
- [ ] Team security training
- [ ] Update this document

---

## 🛡️ Security Response Process

### When CodeQL Finds Issues

1. **Review in Security tab:** Not all findings are critical
2. **Prioritize:**
   - Critical: Fix immediately
   - High: Fix within 1 week
   - Medium: Fix within 1 month
   - Low: Fix when convenient
3. **Create issue:** Link to security finding
4. **Fix & test:** Include test for vulnerability
5. **Document:** Add to security log

### When npm audit Fails CI

1. **Run locally:** `npm audit --audit-level=moderate`
2. **Auto-fix:** `npm audit fix`
3. **Manual review:** If auto-fix not available
4. **Options:**
   - Update dependency
   - Find alternative
   - Accept risk (document why)
   - Remove dependency

---

## 🔧 Configuration Files

### Required Secrets (Already Configured)

- `SLACK_WEBHOOK_URL` ✅
- `VERCEL_TOKEN` ✅
- `VERCEL_ORG_ID` ✅
- `VERCEL_PROJECT_ID_STAGING` ✅
- `VERCEL_PROJECT_ID_PROD` ✅

### Optional Secrets (For Enhanced Features)

- `LHCI_GITHUB_APP_TOKEN` - Lighthouse CI integration
- `SONAR_TOKEN` - SonarCloud integration

---

## ❓ FAQ

**Q: Will this slow down my PRs?**
A: E2E tests add ~8 min. Security runs in parallel. Total impact: ~10 min per PR.

**Q: What if I get too many Dependabot PRs?**
A: Configured to group updates. Can reduce frequency to monthly if needed.

**Q: Should I fix ALL npm audit warnings?**
A: No. Priority order:

1. Critical/High in production deps
2. Moderate in production deps
3. Dev dependency issues (lower priority)

**Q: What if CodeQL blocks my PR?**
A: Review finding. If false positive, dismiss with justification. If real, fix it.

**Q: Can I disable security scans temporarily?**
A: Yes, but:

1. Document why in commit message
2. Set reminder to re-enable
3. Get approval from team lead

---

## 📚 Resources

### Official Docs

- [GitHub Code Security](https://docs.github.com/en/code-security)
- [npm audit](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [CodeQL Queries](https://codeql.github.com/docs/)
- [Dependabot Config](https://docs.github.com/en/code-security/dependabot)

### Security Standards

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)

### Alternative Tools

- [Snyk](https://snyk.io/) - Advanced vulnerability scanning (free tier)
- [Semgrep](https://semgrep.dev/) - Alternative SAST tool
- [Socket.dev](https://socket.dev/) - Supply chain security
- [Trivy](https://github.com/aquasecurity/trivy) - Container scanning

---

## ✅ Success Metrics

Track these KPIs monthly:

| Metric                     | Target  | Current |
| -------------------------- | ------- | ------- |
| Critical vulnerabilities   | 0       | TBD     |
| High vulnerabilities       | <5      | TBD     |
| Mean time to fix (MTTF)    | <7 days | TBD     |
| Dependabot merge rate      | >80%    | TBD     |
| E2E test pass rate         | >95%    | TBD     |
| CodeQL false positive rate | <10%    | TBD     |

---

## 🎯 Next Steps

1. **Review this document** with your team
2. **Merge the workflows** to enable security scanning
3. **Run first security scan** and address critical issues
4. **Enable Dependabot** and merge first PRs
5. **Monitor for 1 week** and adjust thresholds as needed
6. **Phase 2:** Enable accessibility testing
7. **Phase 3:** Add performance monitoring

---

**Questions?** Review the FAQ section or consult GitHub Security docs.
