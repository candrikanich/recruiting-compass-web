# Final Integrations Guide - Week 4

Complete checklist for integrating all Week 3-4 components into the app before launch.

---

## Overview

By Friday launch day, all Week 3-4 deliverables need to be integrated into the live app:

1. **Help System Components** - Integrated into key pages
2. **Video Links** - Embedded in documentation
3. **Email Signup Form** - Working on homepage
4. **Analytics Tracking** - GA4 events firing
5. **Error Monitoring** - Sentry tracking errors
6. **Social Meta Tags** - OG tags on all pages

---

## 1. Help System Integration

### Components Created (Week 3)

- `components/Help/HelpIcon.vue` ✅
- `components/Help/TooltipGuide.vue` ✅
- `components/Help/HelpModal.vue` ✅
- `components/Help/helpDefinitions.ts` ✅

### Integration Steps

#### Step 1: Add Help Icons to Dashboard

**File:** `pages/dashboard.vue` or `pages/index.vue` (authenticated dashboard)

```vue
<template>
  <div class="dashboard">
    <!-- Header with help -->
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">Dashboard</h1>
      <HelpIcon
        help-id="dashboard-overview"
        size="md"
        @click="showHelp('dashboard-overview')"
      />
    </div>

    <!-- Phase Progress -->
    <section class="phase-section">
      <div class="flex items-center">
        <h2>Current Phase: {{ currentPhase }}</h2>
        <HelpIcon
          help-id="freshman-phase"
          :help-id="getCurrentPhaseHelpId()"
          size="sm"
          variant="inline"
        />
      </div>
    </section>

    <!-- Progress Bar -->
    <section>
      <div class="flex items-center">
        <h3>Progress to Next Phase</h3>
        <HelpIcon help-id="progress-bar" size="sm" variant="inline" />
      </div>
      <ProgressBar :percentage="phaseProgress" />
    </section>

    <!-- Suggestions Widget -->
    <section>
      <div class="flex items-center">
        <h3>Next Steps for You</h3>
        <HelpIcon help-id="suggestions-widget" size="sm" variant="inline" />
      </div>
      <!-- Suggestions list -->
    </section>
  </div>
</template>

<script setup lang="ts">
const getCurrentPhaseHelpId = () => {
  const phase = userStore.currentPhase;
  const phaseMap = {
    freshman: "freshman-phase",
    sophomore: "sophomore-phase",
    junior: "junior-phase",
    senior: "senior-phase",
  };
  return phaseMap[phase] || "freshman-phase";
};
</script>
```

#### Step 2: Add Help Icons to Timeline Page

**File:** `pages/timeline.vue`

```vue
<template>
  <div class="timeline">
    <!-- Phase headers -->
    <div v-for="phase in phases" :key="phase.id" class="phase-card">
      <div class="flex items-center">
        <h3>{{ phase.name }} Phase</h3>
        <HelpIcon :help-id="`${phase.slug}-phase`" size="sm" variant="inline" />
      </div>
      <!-- Phase content -->
    </div>

    <!-- Task dependencies note -->
    <div class="flex items-center mt-8">
      <p>Some tasks are locked until others are complete</p>
      <HelpIcon help-id="task-dependencies" size="sm" variant="inline" />
    </div>
  </div>
</template>
```

#### Step 3: Add Help Icons to Schools Page

**File:** `pages/schools/index.vue`

```vue
<template>
  <div class="schools">
    <!-- Tier explanation -->
    <div class="flex items-center mb-4">
      <h2>Your Schools by Tier</h2>
      <HelpIcon help-id="priority-tiers" size="md" variant="block" />
    </div>

    <!-- School list for each tier -->
    <div v-for="tier in ['reach', 'target', 'safety']" :key="tier">
      <h3 class="capitalize">{{ tier }} Schools</h3>
      <!-- Schools -->
    </div>
  </div>
</template>
```

#### Step 4: Add Help Icons to School Detail

**File:** `pages/schools/[id].vue`

```vue
<template>
  <div class="school-detail">
    <!-- Fit Score section -->
    <div class="fit-score-card">
      <div class="flex items-center">
        <h3>Fit Score: {{ school.fitScore }}/10</h3>
        <HelpIcon help-id="fit-score" size="md" />
      </div>
      <p>{{ school.fitScoreExplanation }}</p>

      <!-- Breakdown -->
      <div class="fit-components">
        <FitComponent label="Academic (30%)" score="7" helpId="academic-fit" />
        <FitComponent label="Athletic (30%)" score="8" helpId="athletic-fit" />
        <FitComponent label="Location (15%)" score="6" helpId="location-fit" />
        <FitComponent label="Program (15%)" score="9" helpId="program-fit" />
        <FitComponent
          label="Financial (10%)"
          score="7"
          helpId="financial-fit"
        />
      </div>
    </div>

    <!-- Coach responsiveness -->
    <div class="coaches-section">
      <div class="flex items-center">
        <h3>Coaches</h3>
        <HelpIcon help-id="responsiveness-score" size="sm" variant="inline" />
      </div>
      <!-- Coaches list -->
    </div>
  </div>
</template>
```

#### Step 5: Add Help Icons to Interactions Page

**File:** `pages/interactions.vue`

```vue
<template>
  <div class="interactions">
    <!-- Recovery plan section (if applicable) -->
    <div v-if="silentCoaches.length" class="recovery-plan">
      <div class="flex items-center">
        <h3>Coaches Going Silent?</h3>
        <HelpIcon help-id="recovery-plan" size="md" />
      </div>
      <!-- Recovery suggestions -->
    </div>

    <!-- Interaction log -->
    <div class="interaction-log">
      <h2>Your Interaction History</h2>
      <!-- Log entries -->
    </div>
  </div>
</template>
```

#### Step 6: Add Help Icons to Coach Interest Calibration

**File:** `components/InteractionForm.vue` or `components/InterestCalibrationModal.vue`

```vue
<template>
  <div class="calibration-survey">
    <div class="flex items-center mb-4">
      <h2>Quick Interest Check</h2>
      <HelpIcon help-id="interest-calibration" size="md" />
    </div>

    <!-- Survey questions -->
    <div class="question-group">
      <label
        >How interested are you in {{ coach.school }}?
        <HelpIcon help-id="interest-calibration" size="sm" variant="inline" />
      </label>
      <!-- Scale 1-10 -->
    </div>
  </div>
</template>
```

### Help Icon Placement Summary

| Page/Feature         | Help ID              | Location         | Size |
| -------------------- | -------------------- | ---------------- | ---- |
| Dashboard            | dashboard-overview   | Header           | md   |
| Phase display        | [phase]-phase        | Phase header     | sm   |
| Progress bar         | progress-bar         | Progress section | sm   |
| Suggestions          | suggestions-widget   | Widget header    | sm   |
| Timeline phases      | [phase]-phase        | Phase cards      | sm   |
| Task dependencies    | task-dependencies    | Info text        | sm   |
| Schools list         | priority-tiers       | Section header   | md   |
| Fit score            | fit-score            | Score display    | md   |
| Fit components       | [component]-fit      | Component labels | sm   |
| Responsiveness       | responsiveness-score | Coach section    | sm   |
| Recovery plan        | recovery-plan        | Section header   | md   |
| Interest calibration | interest-calibration | Survey header    | md   |

---

## 2. Video Integration

### Where Videos Are Used

1. **Documentation/Help System**
   - Linked in help definitions (relatedLinks)
   - Embedded in tutorial docs
   - Available in help modals

2. **Blog Posts**
   - Embedded at top of relevant articles
   - "Watch this 3-minute tutorial" CTAs

3. **Onboarding (Future)**
   - Play first video on signup
   - Link to playlists in help

### Implementation

#### Step 1: Update Help Definitions with Video Links

**File:** `components/Help/helpDefinitions.ts`

```typescript
export const helpDefinitions: Record<string, HelpDefinition> = {
  // ... existing definitions ...

  fitScore: {
    id: "fit-score",
    title: "Fit Score",
    shortDescription: "How well you match with a school (1-10)",
    fullDescription: `...`,
    relatedLinks: [
      {
        label: "Watch: Understanding Fit Scores (4 min)",
        url: "https://www.youtube.com/watch?v=VIDEO_ID_8",
      },
      {
        label: "Read: Fit Score Guide",
        url: "/docs/fit-scores",
      },
    ],
  },

  timeline: {
    id: "timeline",
    title: "Your Recruiting Timeline",
    shortDescription: "4-year journey through recruiting phases",
    fullDescription: `...`,
    relatedLinks: [
      {
        label: "Watch: Understanding Your Timeline (4 min)",
        url: "https://www.youtube.com/watch?v=VIDEO_ID_4",
      },
    ],
  },

  // ... etc for all 10 videos
};
```

#### Step 2: Embed Videos in Documentation

**File:** `documentation/user/videos/README.md` (new file to link all videos)

```markdown
# Video Tutorials

All tutorials available on YouTube: [Recruiting Compass Channel](https://www.youtube.com/@RecruitingCompass)

## Tutorial Series

1. **Getting Started** (3 min)
   - Sign up, complete profile, add first school
   - [Watch on YouTube](https://www.youtube.com/watch?v=VIDEO_ID_1)

2. **Adding Your First School** (2 min)
   - Search schools, set tier, understand fit
   - [Watch on YouTube](https://www.youtube.com/watch?v=VIDEO_ID_2)

[... etc for all 10 videos ...]

## Where to Watch

- **YouTube:** [Recruiting Compass Tutorial Playlist](playlist-link)
- **In-App:** Help system links to videos
- **Blog:** Tutorials embedded in relevant articles
```

#### Step 3: Add Video Embed Component

**File:** `components/VideoEmbed.vue`

```vue
<script setup lang="ts">
interface Props {
  videoId: string;
  title?: string;
  width?: string;
  height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: "100%",
  height: "500px",
});

const youtubeUrl = computed(() => {
  return `https://www.youtube.com/embed/${props.videoId}`;
});
</script>

<template>
  <div class="video-embed">
    <iframe
      :src="youtubeUrl"
      :width="width"
      :height="height"
      title="YouTube video player"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
    />
  </div>
</template>

<style scoped>
.video-embed {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
}

.video-embed iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
</style>
```

#### Step 4: Use Video Component in Docs

**File:** `documentation/technical/ARCHITECTURE_DIAGRAMS.md` (or any doc)

```vue
<VideoEmbed video-id="VIDEO_ID_8" title="Understanding Fit Scores" />
```

---

## 3. Email Signup Integration

### Email Form Implementation

**File:** `components/EmailSignupForm.vue`

```vue
<script setup lang="ts">
import { ref, reactive } from "vue";

const loading = ref(false);
const message = ref("");

const form = reactive({
  firstName: "",
  email: "",
});

const submit = async () => {
  loading.value = true;
  try {
    await $fetch("/api/newsletter/subscribe", {
      method: "POST",
      body: form,
    });
    message.value = "Success! Check your email.";
    form.firstName = "";
    form.email = "";
  } catch (e) {
    message.value = "Error. Please try again.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <form @submit.prevent="submit" class="email-signup">
    <input
      v-model="form.firstName"
      type="text"
      placeholder="First Name"
      required
      class="input-field"
    />
    <input
      v-model="form.email"
      type="email"
      placeholder="Email Address"
      required
      class="input-field"
    />
    <button type="submit" :disabled="loading" class="submit-button">
      {{ loading ? "Subscribing..." : "Subscribe" }}
    </button>
    <p v-if="message" class="message">{{ message }}</p>
    <p class="privacy-note">
      We respect your privacy.
      <NuxtLink to="/privacy">Privacy Policy</NuxtLink>
    </p>
  </form>
</template>

<style scoped>
.email-signup {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-field {
  padding: 0.75rem 1rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  font-size: 1rem;
}

.submit-button {
  padding: 0.75rem 1.5rem;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-button:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message {
  font-size: 0.9rem;
  color: #059669;
}

.privacy-note {
  font-size: 0.75rem;
  color: #666;
}
</style>
```

### Newsletter Endpoint

**File:** `server/api/newsletter/subscribe.post.ts`

```typescript
export default defineEventHandler(async (event) => {
  const { firstName, email } = await readBody(event);

  // Validate
  if (!email || !firstName) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required fields",
    });
  }

  try {
    // Save to Supabase newsletter table
    const { error } = await supabase.from("newsletter").insert({
      first_name: firstName,
      email: email,
      subscribed_at: new Date(),
    });

    if (error) throw error;

    // Send welcome email (optional - requires email service)
    // await sendWelcomeEmail(email, firstName);

    return { success: true, message: "Subscribed successfully" };
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to subscribe",
    });
  }
});
```

---

## 4. Analytics Tracking Setup

### Google Analytics 4 Events

**File:** `utils/analytics.ts` (new utility file)

```typescript
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== "undefined" && window.gtag) {
    gtag.event(eventName, params || {});
  }
};

export const analyticsEvents = {
  // Signup
  signupClick: (location: string) =>
    trackEvent("sign_up_click", { button_location: location }),
  signupComplete: () => trackEvent("sign_up"),

  // School management
  schoolAdded: () => trackEvent("school_added"),
  schoolRemoved: () => trackEvent("school_removed"),
  tierChanged: (tier: string) => trackEvent("tier_changed", { tier }),

  // Interactions
  interactionLogged: (type: string) =>
    trackEvent("interaction_logged", { type }),

  // Timeline
  phaseAdvanced: (phase: string) => trackEvent("phase_advanced", { phase }),

  // Help system
  helpIconClicked: (helpId: string) =>
    trackEvent("help_clicked", { help_id: helpId }),
  helpModalOpened: (helpId: string) =>
    trackEvent("help_modal_opened", { help_id: helpId }),

  // Newsletter
  newsletterSignup: () => trackEvent("newsletter_signup"),

  // Videos
  videoPlayed: (videoId: string, title: string) =>
    trackEvent("video_play", { video_id: videoId, video_title: title }),
};
```

### Track Sign-ups

**File:** `pages/auth/signup.vue`

```typescript
import { analyticsEvents } from "~/utils/analytics";

const onSignupComplete = async () => {
  // ... signup logic ...
  analyticsEvents.signupComplete();
};
```

### Track Help Clicks

**File:** `components/Help/HelpIcon.vue`

```typescript
import { analyticsEvents } from "~/utils/analytics";

const handleClick = () => {
  analyticsEvents.helpIconClicked(props.helpId);
  showModal.value = true;
};
```

---

## 5. Error Monitoring (Sentry)

### Setup Sentry

**File:** `nuxt.config.ts`

```typescript
export default defineNuxtConfig({
  modules: ["@sentry/nuxt/module"],
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    enableClientErrorReporting: true,
    sourceMapsUploadOptions: {
      org: "your-org",
      project: "recruiting-compass",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    },
  },
});
```

**Environment Variables:**

```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx
```

### Test Error Tracking

```typescript
// In any component
const testError = () => {
  throw new Error("Test error from Recruiting Compass");
};
```

After throwing, check Sentry dashboard to verify it's captured.

---

## 6. Social Meta Tags

### Update All Pages

**Ensure each page has proper meta tags:**

```typescript
// pages/schools/[id].vue example
definePageMeta({
  title: computed(() => `${school.value.name} - Recruiting Compass`),
  meta: [
    {
      name: "description",
      content: `${school.value.name} - ${school.value.location}. Fit score: ${school.value.fitScore}/10`,
    },
    {
      property: "og:title",
      content: school.value.name,
    },
    {
      property: "og:description",
      content: `Check your fit score and coach interactions for ${school.value.name}`,
    },
    {
      property: "og:image",
      content: school.value.logoUrl || "/default-og-image.png",
    },
  ],
});
```

---

## Integration Checklist

### Help System

- [ ] HelpIcon component integrated on dashboard
- [ ] HelpIcon on timeline page
- [ ] HelpIcon on schools pages
- [ ] HelpIcon on coach detail
- [ ] HelpIcon on interactions page
- [ ] HelpIcon on calibration survey
- [ ] All 14 help definitions populated
- [ ] Modals display correctly
- [ ] Links in modals work

### Videos

- [ ] All 10 videos uploaded to YouTube
- [ ] YouTube playlist created
- [ ] Video links added to help definitions
- [ ] Video embeds work on docs pages
- [ ] Titles and descriptions set

### Email

- [ ] Email signup form on homepage
- [ ] Form submits without error
- [ ] Success message displays
- [ ] Unsubscribe works
- [ ] Newsletter table created in Supabase
- [ ] Privacy policy linked

### Analytics

- [ ] GA4 tag installed
- [ ] Events firing (test in dev)
- [ ] Sign-up tracking working
- [ ] Help clicks tracked
- [ ] Video plays tracked
- [ ] School actions tracked

### Error Monitoring

- [ ] Sentry configured
- [ ] DSN set correctly
- [ ] Test error captured
- [ ] Errors email to team

### Meta Tags

- [ ] Homepage meta tags set
- [ ] Blog post meta tags
- [ ] Documentation page meta tags
- [ ] OG images set
- [ ] Twitter card tags set

---

## Testing Instructions

### Help System

1. Navigate to dashboard
2. Click help icon
3. Verify tooltip appears on hover
4. Verify modal opens on click
5. Verify links in modal work
6. Test on mobile (tooltip positioning)

### Videos

1. Open documentation page with video embed
2. Verify video loads
3. Verify play works
4. Test responsiveness (should be responsive)

### Email Signup

1. Fill email form (use test email)
2. Verify form submits
3. Verify success message
4. Check Supabase newsletter table
5. Verify no errors in console

### Analytics

```
Open DevTools → Network → Filter "gtag" or "analytics"
Perform action (click help, signup, etc.)
Verify event fires with correct parameters
```

### Error Monitoring

1. Trigger test error in console
2. Wait 1-2 minutes
3. Check Sentry dashboard
4. Verify error appears with full stack trace

### Meta Tags

1. Open homepage
2. Right-click → View Page Source
3. Verify meta tags present
4. Test OG tags with Social Media Debuggers:
   - Facebook: facebook.com/sharing/debugger
   - Twitter: cards-dev.twitter.com/validator

---

## Launch Day Final Check

**Thursday Evening:**

- [ ] All integrations complete
- [ ] All tests passing
- [ ] All links work
- [ ] No console errors
- [ ] Analytics firing
- [ ] Sentry configured
- [ ] Error monitoring working

**Friday Morning (before 9 AM):**

- [ ] One final smoke test
- [ ] Help system working
- [ ] Videos accessible
- [ ] Email signup working
- [ ] Analytics tracking
- [ ] Ready for public!

---

**Status:** Integration guide ready
**Time to implement:** 4-6 hours
**Deadline:** Thursday before launch
