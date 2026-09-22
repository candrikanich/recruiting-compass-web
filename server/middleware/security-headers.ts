/**
 * Security Headers Middleware
 * Adds HTTP security headers to all responses
 */

import { setHeader } from "h3";

export default defineEventHandler((event) => {
  const isProduction = process.env.NODE_ENV === "production";

  // Strict-Transport-Security: Force HTTPS and prevent downgrade attacks
  setHeader(
    event,
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );

  // X-Content-Type-Options: Prevent MIME type sniffing
  setHeader(event, "X-Content-Type-Options", "nosniff");

  // X-Frame-Options: Prevent clickjacking attacks
  setHeader(event, "X-Frame-Options", "SAMEORIGIN");

  // X-XSS-Protection: Enable XSS filtering in older browsers
  setHeader(event, "X-XSS-Protection", "1; mode=block");

  // Referrer-Policy: Control how much referrer information is shared
  setHeader(event, "Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy: Disable unnecessary APIs
  setHeader(
    event,
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()",
  );

  // Content-Security-Policy: Prevent XSS and injection attacks
  //
  // KNOWN LIMITATION — 'unsafe-inline' in script-src:
  // This app runs in SPA mode (ssr: false). With SSR disabled, Nuxt cannot inject per-request
  // nonces at render time, so 'unsafe-inline' is genuinely required for Nuxt to function.
  // To eliminate this, enable SSR and use nonce-based CSP (https://nuxt.com/docs/getting-started/seo-meta).
  // XSS defence depth: input sanitized via sanitize-html, Zod validation on
  // all inputs, and only one v-html in the whole app (pages/index.vue:104,
  // a hardcoded static SVG literal, never user data).
  //
  // No explicit CORS allowlist here (#914, verified): this is a same-origin
  // SPA+API, so the browser's default same-origin policy already blocks a
  // cross-origin page's JS from reading these responses -- there's no
  // Access-Control-Allow-Origin to loosen that. Cookie-authenticated
  // state-changing requests (POST/PUT/PATCH/DELETE) are additionally gated
  // by CSRF token validation (server/middleware/csrf.ts), which a
  // cross-origin attacker page can't satisfy even if it fired a blind
  // request. The iOS app authenticates via Authorization: Bearer instead of
  // cookies, and CORS is a browser-only mechanism -- native network
  // requests aren't subject to it at all, so it needs no allowlist entry
  // either.
  //
  // Vercel Speed Insights: va.vercel-scripts.com, vitals.vercel-insights.com, blob: workers
  // Supabase Storage: frame-src/object-src for PDF previews, wss: for WebSocket
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || "";
  const supabaseWss = supabaseUrl.replace("https://", "wss://");
  // Cloudflare Turnstile (public-profile Contact/Interest anti-abuse): loads
  // its script (script-src), renders the challenge in an iframe (frame-src),
  // and calls home during the challenge (connect-src). Without these the
  // widget is CSP-blocked and no token can be minted → every submit 403s.
  const turnstile = "https://challenges.cloudflare.com";
  const cspHeader = isProduction
    ? `default-src 'self'; script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com ${turnstile}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' ${supabaseUrl} ${supabaseWss} https://vitals.vercel-insights.com ${turnstile}; worker-src 'self' blob:; frame-src 'self' ${supabaseUrl} ${turnstile}; object-src 'self' ${supabaseUrl}; frame-ancestors 'none'`
    : `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com ${turnstile}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https: http://localhost:*; worker-src 'self' blob:; frame-src 'self' ${supabaseUrl} ${turnstile}; object-src 'self' ${supabaseUrl}; frame-ancestors 'self'`;

  setHeader(event, "Content-Security-Policy", cspHeader);
});
