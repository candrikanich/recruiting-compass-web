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
  // Nuxt 3 with SSR disabled requires inline scripts for initialization
  // Note: script-src includes 'unsafe-inline' for both environments to support Nuxt's runtime
  // Vercel Speed Insights: Allow va.vercel-scripts.com for analytics and vitals.vercel-insights.com for beacon API
  // Supabase Storage: Allow frame-src and object-src for PDF previews
  const cspHeader = isProduction
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://xpxzhqghxecsjhvklsqg.supabase.co wss://xpxzhqghxecsjhvklsqg.supabase.co https://vitals.vercel-insights.com; frame-src 'self' https://xpxzhqghxecsjhvklsqg.supabase.co; object-src 'self' https://xpxzhqghxecsjhvklsqg.supabase.co; frame-ancestors 'none'"
    : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https: http://localhost:*; frame-src 'self' https://xpxzhqghxecsjhvklsqg.supabase.co; object-src 'self' https://xpxzhqghxecsjhvklsqg.supabase.co; frame-ancestors 'self'";

  setHeader(event, "Content-Security-Policy", cspHeader);
});
