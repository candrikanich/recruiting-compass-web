# SEO Optimization Strategy

This guide outlines the SEO strategy for Recruiting Compass to improve organic discoverability and drive traffic from search engines.

---

## Keyword Research & Strategy

### Primary Keywords (High Priority)

These keywords are directly related to Recruiting Compass and should be the focus of content optimization.

| Keyword                     | Search Volume | Difficulty | Target         | Intent                   |
| --------------------------- | ------------- | ---------- | -------------- | ------------------------ |
| college recruiting          | 5,400         | High       | Landing page   | Commercial/Informational |
| recruiting platform         | 1,900         | Medium     | Features page  | Commercial               |
| college recruiting app      | 1,200         | Medium     | Landing page   | Commercial               |
| baseball recruiting         | 2,100         | Medium     | Landing page   | Commercial               |
| managing college recruiting | 480           | Low        | Blog posts     | Informational            |
| recruiting timeline         | 390           | Low        | Timeline docs  | Informational            |
| school fit score            | 150           | Low        | Fit score docs | Informational            |
| coach interaction tracker   | 90            | Low        | Features       | Commercial               |

### Secondary Keywords (Medium Priority)

Broader keywords to target through educational content.

| Keyword                         | Target | Strategy                |
| ------------------------------- | ------ | ----------------------- |
| college baseball recruiting     | Blog   | Multiple blog posts     |
| recruiting tips                 | Blog   | Educational content     |
| how to manage recruiting        | Blog   | How-to guides           |
| student athlete recruiting      | Blog   | Stories, guides         |
| parent college recruiting guide | Blog   | Parent-focused content  |
| recruiting advice               | Blog   | Expert tips             |
| school selection for athletes   | Blog   | How-to guides           |
| athlete fit analysis            | Docs   | Technical documentation |

### Long-Tail Keywords (High Conversion)

These specific queries have lower volume but higher intent to take action.

- "how to build target school list baseball"
- "college recruiting mistakes parents make"
- "understanding fit scores college recruiting"
- "coach interaction tracking system"
- "managing recruiting timeline 4 years"
- "free college recruiting tool"
- "best recruiting platform for students"
- "college recruiting organization app"

---

## On-Page SEO Optimization

### Landing Page (pages/index.vue)

**Meta Tags:**

```html
<title>
  Recruiting Compass: Free College Recruiting Platform for Student-Athletes
</title>
<meta
  name="description"
  content="Organize your entire college baseball recruiting journey in one platform. Track schools, manage coach interactions, follow your timeline. Free for students and families."
/>
<meta
  name="keywords"
  content="college recruiting, recruiting platform, baseball recruiting, student athlete"
/>
```

**Open Graph Tags:**

```html
<meta
  property="og:title"
  content="Recruiting Compass: Organize Your College Recruiting"
/>
<meta
  property="og:description"
  content="Free platform to manage schools, track coaches, and follow your 4-year recruiting timeline."
/>
<meta
  property="og:image"
  content="https://recruitingcompass.com/og-image.png"
/>
<meta property="og:url" content="https://recruitingcompass.com" />
<meta property="og:type" content="website" />
```

**Twitter Card Tags:**

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Recruiting Compass" />
<meta
  name="twitter:description"
  content="Free college recruiting platform for student-athletes and families."
/>
<meta
  name="twitter:image"
  content="https://recruitingcompass.com/twitter-image.png"
/>
```

**Schema Markup (JSON-LD):**

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Recruiting Compass",
  "description": "Free platform to organize college baseball recruiting",
  "url": "https://recruitingcompass.com",
  "image": "https://recruitingcompass.com/logo.png",
  "applicationCategory": "EducationalApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

### Blog Posts - Meta Template

**Structure:**

```
Title (60 characters max, keyword first): "How to Build Your Target School List in 10 Minutes"
Description (155 characters): "Step-by-step guide to identifying and organizing schools that are realistic opportunities. Free strategy for student-athletes and families."
```

**Headers:**

- H1: Include primary keyword naturally
- H2-H3: Secondary keywords, descriptive, helpful
- Keep header structure logical (don't skip levels)

**Internal Links:**

- Link to related blog posts (3-5 per post)
- Link to documentation pages
- Link to signup page
- Use descriptive anchor text (not "click here")

**Content Guidelines:**

- 800+ words minimum per post
- Natural keyword usage (1-2% keyword density)
- Bold important terms
- Use bullet points for scannability
- Include featured image with alt text

### Documentation Pages Meta

Apply SEO to all key documentation pages:

| Page       | Title                               | Description                                                                          |
| ---------- | ----------------------------------- | ------------------------------------------------------------------------------------ |
| Timeline   | Recruiting Timeline: 4-Year Roadmap | Follow a clear timeline with phase-specific tasks from freshman through senior year. |
| Fit Scores | Understanding Fit Scores            | Learn how we calculate school-athlete fit (1-10) using 5 key components.             |
| FAQ        | College Recruiting FAQ              | Answers to common questions about recruiting, our platform, and strategy.            |

---

## Internal Linking Strategy

### Link Architecture

**Tier 1 (Authority Pages):**

- Homepage (index.vue)
- Main features pages
- Core blog posts

**Tier 2 (Secondary Pages):**

- Blog category pages
- Feature detail pages
- How-to guides

**Tier 3 (Support Pages):**

- Documentation
- FAQ
- Team/About

**Link Flow:**

```
Homepage → Features → Blog Posts → Docs → FAQ
           ↓
        Signup CTA
```

### Internal Link Guidelines

**Blog to Blog:** Link related blog posts

```
"As mentioned in our guide on [Blog Post Title], ..."
"See our post on [Topic] for more details."
```

**Blog to Docs:** Link to deeper documentation

```
"For a detailed explanation, see our [Documentation Title] guide."
```

**Docs to Blog:** Link to relevant articles

```
"Learn more in our blog post: [Blog Title]"
```

**All to CTA:** Link to signup from key pages

```
"Ready to get started? Sign up for free."
```

### Link Targets

Each main page should link to:

- 3-5 related pages (internal)
- 1-2 signup CTAs
- Navigation menu items

Avoid:

- Broken links (check monthly)
- Dead-end pages
- Linking to same page from itself

---

## Technical SEO

### Site Structure

**URL Structure:**

```
recruitingcompass.com/                    (homepage)
recruitingcompass.com/blog/               (blog index)
recruitingcompass.com/blog/[article]/     (individual post)
recruitingcompass.com/docs/               (documentation index)
recruitingcompass.com/docs/[section]/     (doc section)
recruitingcompass.com/pricing/            (pricing page)
recruitingcompass.com/about/              (about page)
```

**Avoid:**

- Query parameters in URLs (use clean URLs)
- Deep nesting (max 3 levels)
- Special characters in URLs
- Inconsistent URL formats

### Page Speed Optimization

**Targets:**

- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1

**Optimization Techniques:**

- [ ] Image optimization (compress, lazy load, WebP format)
- [ ] Code splitting (load only needed JS)
- [ ] Minification (JS, CSS, HTML)
- [ ] Caching headers (browser cache, CDN)
- [ ] Remove unused CSS/JS
- [ ] Defer non-critical JavaScript
- [ ] Use modern image formats

**Tools to Monitor:**

- Google PageSpeed Insights
- GTmetrix
- WebPageTest
- Lighthouse (built into Chrome)

### Mobile Optimization

**Checklist:**

- [ ] Mobile-responsive design (test all viewports)
- [ ] Touch-friendly buttons (min 48px)
- [ ] Fast mobile load time
- [ ] Readable text (no pinch zoom needed)
- [ ] Proper viewport meta tag
- [ ] Mobile navigation functional

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

### Structured Data

**JSON-LD for Blog Posts:**

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Blog Post Title",
  "description": "Meta description here",
  "image": "image-url.jpg",
  "datePublished": "2026-01-27",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  }
}
```

**Test with:** Google Structured Data Testing Tool

### XML Sitemap

**Location:** `/public/sitemap.xml`

**Auto-generate using:**

- Nuxt sitemap module (nuxt-sitemap)
- Or manually create and update

**Content:**

- All pages (homepage, blog, docs, etc.)
- Update frequency (weekly for blog, monthly for static)
- Priority (homepage: 1.0, blog: 0.8, docs: 0.7)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://recruitingcompass.com/</loc>
    <lastmod>2026-01-27</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

### Robots.txt

**Location:** `/public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

Sitemap: https://recruitingcompass.com/sitemap.xml
```

---

## Analytics & Tracking Setup

### Google Analytics 4 Setup

**Installation:**

```typescript
// In nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@nuxtjs/google-analytics"],
  googleAnalytics: {
    id: "GA_MEASUREMENT_ID", // Replace with your ID
  },
});
```

**Key Events to Track:**

- Page views (automatic)
- Signup clicks
- Signup completions
- Blog post reads
- Documentation views
- CTA button clicks
- Video plays

**Custom Events:**

```typescript
// Example: Track signup
const trackSignup = () => {
  gtag.event("sign_up", {
    method: "email",
  });
};
```

### Google Search Console

**Setup:**

1. Go to Google Search Console (search.google.com/search-console)
2. Add property (your domain)
3. Verify ownership (DNS/file upload/meta tag)
4. Submit sitemap
5. Monitor search performance

**Monitor:**

- Total clicks and impressions
- Average position (CTR)
- Queries driving traffic
- Pages with most impressions
- Core Web Vitals
- Mobile usability issues

### Key Metrics to Track

| Metric            | Target       | Tool               |
| ----------------- | ------------ | ------------------ |
| Organic traffic   | 500+ monthly | GA4                |
| Avg position      | <5           | Search Console     |
| CTR               | >3%          | Search Console     |
| Page load time    | <3s          | PageSpeed Insights |
| Mobile score      | >90          | PageSpeed Insights |
| Blog post traffic | 50+ per post | GA4                |

---

## Content Strategy for SEO

### Blog Content Pillars

**Pillar 1: How-To / Tutorial (40%)**

- "How to build target school list"
- "How to track coach interactions"
- "How to understand fit scores"
- "How to manage recruiting timeline"

**Pillar 2: Educational / Explainer (30%)**

- "What is a fit score?"
- "Understanding the recruiting process"
- "College recruiting timeline explained"

**Pillar 3: Advice / Strategy (20%)**

- "5 mistakes parents make in recruiting"
- "Recruiting tips for student-athletes"
- "How to approach coaches"

**Pillar 4: News / Updates (10%)**

- Product updates
- Feature releases
- Success stories

### Publishing Schedule

**Consistency:** 2-3 blog posts per week
**Day:** Tuesday & Thursday (peak reading times)
**Time:** 10 AM or 3 PM

**Topics (First Month):**

- Week 1: How-to guides (3 posts)
- Week 2: Advice/strategy (2 posts)
- Week 3: Educational content (3 posts)
- Week 4: Success stories + updates (2 posts)

### Guest Posting & Backlinks

**Outreach Targets:**

- Baseball coaching blogs
- College recruiting websites
- Student-athlete forums
- Parent education sites

**Anchor text:** "college recruiting," "recruiting platform," "student athlete"

---

## Competitive Analysis

### Competitor Keywords

**Research:**

- Search "college recruiting app"
- Search "recruiting platform"
- Analyze top 3 competitors
- Identify keywords they rank for
- Find gaps they're missing

**Strategy:**

- Target long-tail keywords competitors miss
- Create better content on their topics
- Build authority in niche areas

---

## Monitoring & Maintenance

### Monthly SEO Audit

- [ ] Check all pages for broken links
- [ ] Verify meta tags are correct
- [ ] Check Google Search Console for issues
- [ ] Monitor top performing content
- [ ] Identify new keyword opportunities
- [ ] Check page speed metrics
- [ ] Review analytics data
- [ ] Update underperforming content

### Quarterly Review

- [ ] Competitive analysis update
- [ ] Keyword ranking check
- [ ] Backlink profile audit
- [ ] Content calendar planning
- [ ] Technical SEO audit
- [ ] User behavior analysis

### Tools

**Free Tools:**

- Google Search Console
- Google Analytics 4
- Google PageSpeed Insights
- Lighthouse (Chrome)
- MozBar (SEO toolbar)

**Paid Tools (Optional):**

- Semrush
- Ahrefs
- SE Ranking
- SurferSEO

---

## Implementation Checklist

### Before Launch

- [ ] Meta tags added to all pages
- [ ] Open Graph tags configured
- [ ] Schema markup implemented
- [ ] Sitemap created and submitted
- [ ] Robots.txt configured
- [ ] GA4 installed and tracking
- [ ] Search Console property created
- [ ] Internal linking strategy implemented
- [ ] 404 error page created
- [ ] Redirects configured (if any)

### Week 1 Post-Launch

- [ ] Verify GA4 is tracking data
- [ ] Submit sitemap to Search Console
- [ ] Check for crawl errors in Search Console
- [ ] Monitor page speed
- [ ] Check mobile usability
- [ ] Review first week's analytics

### Month 1

- [ ] Publish 8-12 blog posts
- [ ] Monitor keyword rankings
- [ ] Analyze referral traffic
- [ ] Check Search Console performance
- [ ] Fix any technical issues
- [ ] Build initial backlinks (guest posts, outreach)

### Ongoing

- [ ] Publish 2-3 blog posts weekly
- [ ] Monitor analytics
- [ ] Track keyword rankings
- [ ] Build quality backlinks
- [ ] Update top-performing content
- [ ] Monthly SEO audit
- [ ] Quarterly strategy review

---

## Expected Results Timeline

**Month 1:**

- Zero organic traffic initially
- GA4 data collection begins
- Organic search traffic: minimal (<100 visits)

**Months 2-3:**

- Blog content ranks for long-tail keywords
- Organic traffic: 100-500 visits/month
- Some keyword rankings appear

**Months 4-6:**

- Authority builds
- More keywords ranking
- Organic traffic: 500-1,500 visits/month

**Months 6-12:**

- Established presence
- Consistent organic traffic
- Target: 2,000+ organic visits/month

**Long-term (Year 2):**

- Authority domain
- 5,000+ organic visits/month
- Featured snippets, top 10 rankings
- Backlink authority

---

## Final Notes

SEO is a long-term strategy. Results won't be immediate, but consistent effort on keyword-targeted content will drive sustainable organic traffic. Focus on creating valuable content for your audience first, and SEO optimization second.

The best SEO is good content that people want to read and share.
