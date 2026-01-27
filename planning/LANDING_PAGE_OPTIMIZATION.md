# Landing Page Optimization Guide

Detailed checklist and implementation guide for optimizing `pages/index.vue` for launch.

---

## Landing Page Structure

### Hero Section (Above Fold)

**Goal:** Immediate value proposition in first 3 seconds

**Content:**
```
Headline: "Organize Your College Recruiting"
Subheading: "Track schools, manage coaches, follow your timeline—all in one free platform"
CTA Button: "Sign Up Free" (primary color)
Hero Image: Screenshot or illustration showing dashboard
```

**Vue Component Example:**
```vue
<script setup lang="ts">
const heroTitle = "Organize Your College Recruiting";
const heroSubtitle = "Track schools, manage coaches, follow your timeline—all in one free platform";
const ctaButtonText = "Sign Up Free";
</script>

<template>
  <section class="hero bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <!-- Text -->
        <div>
          <h1 class="text-5xl font-bold mb-4">{{ heroTitle }}</h1>
          <p class="text-xl mb-8 opacity-90">{{ heroSubtitle }}</p>
          <button
            class="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition"
            @click="navigateTo('/auth/signup')"
          >
            {{ ctaButtonText }} →
          </button>
        </div>
        <!-- Image -->
        <div>
          <img
            src="/images/hero-dashboard.png"
            alt="Recruiting Compass Dashboard"
            class="rounded-lg shadow-2xl"
          />
        </div>
      </div>
    </div>
  </section>
</template>
```

---

### Problem Section

**Goal:** Validate the problem (60% read further if problem resonates)

**Content:**
```
Headline: "College Recruiting is Chaotic"
Problem Points:
• Juggling 15-20+ schools
• Losing track of coach interactions
• Unclear timeline and milestones
• Family can't stay involved
• Overwhelming decision to make
```

**Vue Component:**
```vue
<template>
  <section class="py-16 bg-gray-50">
    <div class="container mx-auto px-4">
      <h2 class="text-4xl font-bold text-center mb-12">The Problem</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <ProblemCard
          icon="📚"
          title="Too Many Schools"
          description="15-20+ schools to track across spreadsheets"
        />
        <ProblemCard
          icon="📧"
          title="Lost Emails"
          description="Coach emails buried in inbox, easy to miss"
        />
        <ProblemCard
          icon="❓"
          title="Confused Timeline"
          description="Unclear what to do each year"
        />
        <ProblemCard
          icon="👨‍👩‍👦"
          title="Family Out of Loop"
          description="Parents can't help without bugging you"
        />
        <ProblemCard
          icon="😰"
          title="Overwhelming"
          description="Stressful decisions with unclear picture"
        />
      </div>
    </div>
  </section>
</template>
```

---

### Solution Section

**Goal:** Show that there's a solution (transition to product)

**Content:**
```
Headline: "Meet Recruiting Compass"
Subheading: "Everything you need in one free platform"

Key Benefits:
• Organize all your schools in one place
• Track every coach interaction
• Follow a clear 4-year timeline
• Keep your family informed
• Get smart suggestions to stay on track
```

**Vue Component:**
```vue
<template>
  <section class="py-16">
    <div class="container mx-auto px-4">
      <h2 class="text-4xl font-bold text-center mb-4">Meet Recruiting Compass</h2>
      <p class="text-xl text-center text-gray-600 mb-12">
        Everything you need to manage your recruiting journey—free.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <BenefitCard
          icon="📌"
          title="School List"
          description="Organize schools with fit scores"
        />
        <BenefitCard
          icon="💬"
          title="Interactions"
          description="Log every coach conversation"
        />
        <BenefitCard
          icon="📅"
          title="Timeline"
          description="Follow your 4-year journey"
        />
        <BenefitCard
          icon="👥"
          title="Family"
          description="Keep parents informed"
        />
        <BenefitCard
          icon="✨"
          title="Suggestions"
          description="Get smart recommendations"
        />
      </div>
    </div>
  </section>
</template>
```

---

### Features Section

**Goal:** Show what they get (with screenshots)

**Content:**

**Feature 1: School Management**
```
Screenshot: School list with tiers
Title: "Organize Your Schools"
Description: "Add unlimited schools, set tier (reach/target/safety),
and see instant fit scores showing how well you match."
```

**Feature 2: Interaction Tracking**
```
Screenshot: Interaction log
Title: "Track Coach Interactions"
Description: "Log every email, call, text, and meeting.
See responsiveness scores and never miss an opportunity."
```

**Feature 3: Timeline**
```
Screenshot: Timeline phases
Title: "Follow Your Timeline"
Description: "Progress through 4 phases (freshman-senior) with
clear tasks and milestones for each year."
```

**Feature 4: Parent Collaboration**
```
Screenshot: Parent view
Title: "Keep Your Family Informed"
Description: "Invite parents to view your progress without
giving them control. Stay aligned and supported."
```

---

### Social Proof Section

**Goal:** Build credibility with testimonials and social proof

**Content:**
```
Section Headline: "Trusted by Student-Athletes"

Quote Cards:
1. "Recruiting Compass brought order to the chaos. Everything I need
is in one place." – Sarah, Class of 2026

2. "My son was scattered across 5 apps. Now he's organized and we're
on the same page." – Parent

3. "The fit scores helped me focus on realistic schools instead of
dreaming too big." – Alex, Junior

Bottom: "Join 100+ student-athletes managing their recruiting with
Recruiting Compass"
```

**Vue Component:**
```vue
<template>
  <section class="py-16 bg-blue-50">
    <div class="container mx-auto px-4">
      <h2 class="text-4xl font-bold text-center mb-12">What Users Say</h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <TestimonialCard
          quote="Recruiting Compass brought order to the chaos."
          author="Sarah"
          role="Class of 2026"
          rating="5"
        />
        <TestimonialCard
          quote="Now we're all on the same page and I can actually help."
          author="Parent"
          role="Supporting the journey"
          rating="5"
        />
        <TestimonialCard
          quote="The fit scores helped me focus on realistic schools."
          author="Alex"
          role="Junior athlete"
          rating="5"
        />
      </div>

      <div class="text-center mt-12">
        <p class="text-2xl font-bold">Join 100+ student-athletes organizing their recruiting</p>
      </div>
    </div>
  </section>
</template>
```

---

### FAQ Section

**Goal:** Answer common objections before they leave

**FAQs:**

**Q: Is it really free?**
A: Yes, 100% free. No credit card required. No hidden fees.

**Q: How do you make money then?**
A: We're currently free for everyone. In the future, we may offer
premium features, but core functionality will always be free.

**Q: Is my data safe?**
A: Yes. We use industry-standard encryption and security practices.
Your data is yours. See our privacy policy for details.

**Q: Can my parents see my data?**
A: Only if you invite them. You control what they can see.

**Q: How do fit scores work?**
A: We calculate fit based on your academics, athletics, location,
program fit, and financial aid availability.

**Q: Can I use this on my phone?**
A: Yes. Recruiting Compass works great on desktop, tablet, and mobile.

**Q: How do I get started?**
A: Sign up free, add your schools, and start logging interactions.
You'll be organized in 5 minutes.

**Vue Component:**
```vue
<template>
  <section class="py-16">
    <div class="container mx-auto px-4">
      <h2 class="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>

      <div class="max-w-3xl mx-auto">
        <Disclosure v-for="faq in faqs" :key="faq.id">
          <DisclosureButton class="faq-button">
            {{ faq.question }}
          </DisclosureButton>
          <DisclosurePanel class="faq-panel">
            {{ faq.answer }}
          </DisclosurePanel>
        </Disclosure>
      </div>
    </div>
  </section>
</template>

<script setup>
const faqs = [
  {
    id: 1,
    question: "Is it really free?",
    answer: "Yes, 100% free. No credit card required."
  },
  // ... more FAQs
];
</script>
```

---

### Email Capture Section

**Goal:** Build email list for post-launch marketing

**Content:**
```
Headline: "Get Recruiting Tips & Updates"
Subheading: "Join our mailing list for recruiting advice, feature updates,
and success stories"

Form Fields:
- First Name
- Email Address
- CTA: "Subscribe"
```

**Vue Component:**
```vue
<template>
  <section class="py-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
    <div class="container mx-auto px-4">
      <div class="max-w-md mx-auto text-center">
        <h2 class="text-3xl font-bold mb-4">Get Recruiting Tips</h2>
        <p class="mb-8 opacity-90">
          Join our mailing list for advice and updates
        </p>

        <form @submit.prevent="subscribeNewsletter" class="space-y-4">
          <input
            v-model="form.firstName"
            type="text"
            placeholder="First Name"
            class="w-full px-4 py-3 rounded text-gray-900"
            required
          />
          <input
            v-model="form.email"
            type="email"
            placeholder="Your Email"
            class="w-full px-4 py-3 rounded text-gray-900"
            required
          />
          <button
            type="submit"
            class="w-full bg-white text-blue-600 px-6 py-3 rounded font-bold hover:bg-gray-100 transition"
          >
            Subscribe
          </button>
        </form>
        <p class="text-xs mt-4 opacity-75">
          We respect your privacy. Unsubscribe anytime.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
const form = reactive({
  firstName: '',
  email: ''
});

const subscribeNewsletter = async () => {
  // Call API to save email
  await $fetch('/api/newsletter/subscribe', {
    method: 'POST',
    body: form
  });
  // Show success
};
</script>
```

---

### Call-to-Action (Final)

**Goal:** Last chance to convert before they leave

**Content:**
```
Primary CTA: "Start Organizing Your Recruiting" button
Secondary CTA: "Read our guides" link
Tertiary: "Contact us" link

All three should be visible and accessible
```

**Vue Component:**
```vue
<template>
  <section class="py-20 bg-gray-50">
    <div class="container mx-auto px-4 text-center">
      <h2 class="text-4xl font-bold mb-6">Ready to Get Organized?</h2>
      <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
        Join hundreds of student-athletes managing their recruiting
        with Recruiting Compass.
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          @click="navigateTo('/auth/signup')"
          class="px-8 py-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
        >
          Sign Up Free →
        </button>
        <button
          @click="navigateTo('/docs')"
          class="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-lg font-bold hover:bg-blue-50"
        >
          Learn More
        </button>
      </div>

      <p class="text-gray-600 mt-6">
        Questions? <NuxtLink to="/contact" class="text-blue-600 hover:underline">Contact us</NuxtLink>
      </p>
    </div>
  </section>
</template>
```

---

## Meta Tags & SEO

**Update `nuxt.config.ts`:**

```typescript
export default defineNuxtConfig({
  app: {
    head: {
      title: 'Recruiting Compass - Organize Your College Recruiting',
      meta: [
        {
          name: 'description',
          content: 'Free platform to organize your entire college recruiting journey. Track schools, manage coach interactions, follow your timeline—all in one place.'
        },
        {
          name: 'keywords',
          content: 'college recruiting, recruiting platform, baseball recruiting, student athlete'
        },
        {
          property: 'og:title',
          content: 'Recruiting Compass - Organize Your College Recruiting'
        },
        {
          property: 'og:description',
          content: 'Free platform to manage your entire recruiting journey.'
        },
        {
          property: 'og:image',
          content: '/og-image.png'
        },
        {
          name: 'twitter:card',
          content: 'summary_large_image'
        }
      ]
    }
  }
});
```

---

## Performance Optimization Checklist

- [ ] **Images Optimized:** Compressed, lazy-loaded, WebP format
- [ ] **CSS Minified:** No unused styles
- [ ] **JavaScript Code-split:** Only load needed JS
- [ ] **Fonts Optimized:** Use system fonts or preload web fonts
- [ ] **CTA buttons prominent:** 48px minimum, clear color
- [ ] **Form validation:** Clear error messages
- [ ] **Mobile responsive:** Test all breakpoints
- [ ] **Touch friendly:** All interactive elements 48px+

**Test Performance:**
```bash
# Build for production
npm run build

# Check Lighthouse
npm run preview
# Open DevTools > Lighthouse > Analyze page load
```

Target: >90 desktop, >85 mobile

---

## Conversion Optimization

### Above-the-Fold CTA
- Primary button visible without scrolling
- Clear value proposition
- Color contrasts with background

### Path to Signup
```
Hero CTA → Signup flow → Dashboard → Start organizing
         ↓
      FAQ CTA → Signup
         ↓
      Email CTA → Signup
         ↓
      Footer CTA → Signup
```

### Trust Signals
- Testimonials from real users
- User count ("100+ users")
- Free badge (prominently featured)
- Privacy policy link
- Contact/support email visible

### Mobile Optimization
- Single column layout
- Buttons full-width for easy tapping
- Text readable without zoom
- Forms simplified (fewer fields initially)

---

## Analytics Setup

**Add to landing page:**

```typescript
// Track page views
useRouter().afterEach((to, from) => {
  gtag.pageview({
    page_path: to.path,
    page_title: to.name
  });
});

// Track button clicks
const trackSignupClick = () => {
  gtag.event('sign_up_click', {
    button_location: 'hero'
  });
};

// Track form submission
const trackEmailSignup = () => {
  gtag.event('newsletter_signup', {
    email: form.email
  });
};
```

---

## Launch Day Verification

**Final checks before Friday 9 AM:**

- [ ] All sections render correctly
- [ ] Images load (check Network tab)
- [ ] Buttons clickable and navigate correctly
- [ ] Forms submit without error
- [ ] Mobile responsive (test on 3+ sizes)
- [ ] No console errors
- [ ] Lighthouse score >90
- [ ] Page load <3s
- [ ] CTA buttons prominent
- [ ] Email capture working
- [ ] Links to docs/blog working
- [ ] Video embeds work (if applicable)

---

## A/B Testing Ideas (Post-Launch)

1. **Headline test:** "Organize" vs "Simplify" vs "Manage"
2. **Button color:** Blue vs green vs orange
3. **Hero image:** Screenshot vs illustration vs video
4. **Social proof:** Testimonials vs user count vs both
5. **CTA text:** "Sign Up Free" vs "Get Started" vs "Try Free"

Track conversion rate for each variation.

---

**Status:** Ready to implement
**Estimated time:** 2-3 hours
**Deadline:** Thursday before launch

