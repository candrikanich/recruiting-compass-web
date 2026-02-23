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
  // XSS defence depth: input sanitized via sanitize-html, zero v-html usage, Zod validation on all inputs.
  //
  // Vercel Speed Insights: va.vercel-scripts.com, vitals.vercel-insights.com, blob: workers
  // Supabase Storage: frame-src/object-src for PDF previews, wss: for WebSocket
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || '';
  const supabaseWss = supabaseUrl.replace('https://', 'wss://');
  const cspHeader = isProduction
    ? `default-src 'self'; script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' ${supabaseUrl} ${supabaseWss} https://vitals.vercel-insights.com; worker-src 'self' blob:; frame-src 'self' ${supabaseUrl}; object-src 'self' ${supabaseUrl}; frame-ancestors 'none'`
    : `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https: http://localhost:*; worker-src 'self' blob:; frame-src 'self' ${supabaseUrl}; object-src 'self' ${supabaseUrl}; frame-ancestors 'self'`;

  setHeader(event, "Content-Security-Policy", cspHeader);
});
