/**
 * Shared branded HTML shell for every app-sent (Resend) email. Table-based,
 * inline-style layout for cross-client compatibility — Gmail/Outlook/Apple
 * Mail all strip external stylesheets, and Outlook (Word engine) ignores
 * most CSS outside inline `style` attributes.
 *
 * Pure function: no I/O, no Supabase/Resend imports. Each renderer supplies
 * its own body HTML and gets the logo header, card body slot, and
 * legal/social footer for free.
 */

export interface EmailLayoutOptions {
  /** Hidden preview text shown in the inbox list, before the body renders. */
  preheader?: string;
  /** Presence adds a "why you're receiving this" + Unsubscribe line to the footer. Omit for transactional emails (invites, feedback acks). */
  unsubscribeUrl?: string;
}

const SOCIAL_LINKS: ReadonlyArray<{ label: string; url: string }> = [
  { label: "Instagram", url: "https://www.instagram.com/therecruitingcompass" },
  { label: "X", url: "https://x.com/recruitCompass" },
  { label: "Facebook", url: "https://www.facebook.com/TheRecruitingCompass/" },
];

function baseUrl(): string {
  return process.env.PUBLIC_BASE_URL ?? "https://myrecruitingcompass.com";
}

function logoUrl(): string {
  // PNG, not SVG: Gmail/Outlook don't render <img src> SVGs reliably, so the
  // header showed no logo (Gmail falls back to its own generic sender icon).
  return `${baseUrl()}/assets/logos/recruiting-compass-horizontal.png`;
}

function legalAddress(): string {
  return process.env.EMAIL_LEGAL_ADDRESS ?? "The Recruiting Compass";
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "#";
    }
    return url;
  } catch {
    // Relative URLs (starting with /) are allowed as-is
    return url.startsWith("/") ? url : "#";
  }
}

function socialLinksHtml(): string {
  return SOCIAL_LINKS.map(
    (s) =>
      `<a href="${s.url}" style="color:#64748b;text-decoration:underline;margin:0 6px;font-size:12px;">${s.label}</a>`,
  ).join("");
}

function footerHtml(unsubscribeUrl?: string): string {
  const unsubscribeLine = unsubscribeUrl
    ? `You're receiving this because you have a Recruiting Compass account. <a href="${sanitizeUrl(unsubscribeUrl)}" style="color:#64748b;">Unsubscribe</a>.`
    : "";
  return `
    <tr>
      <td style="padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0 0 8px 0;">${socialLinksHtml()}</p>
        <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
          The Recruiting Compass &middot; ${legalAddress()}
        </p>
        <p style="margin:4px 0 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">${unsubscribeLine}</p>
      </td>
    </tr>`;
}

export function wrapEmailLayout(
  bodyHtml: string,
  opts: EmailLayoutOptions = {},
): string {
  const preheaderHtml = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>`
    : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <style>
      @media (prefers-color-scheme: dark) {
        .trc-email-bg { background:#0f172a !important; }
        .trc-email-card { background:#1e293b !important; }
        .trc-email-text { color:#e2e8f0 !important; }
        .trc-email-text h1, .trc-email-text h2, .trc-email-text h3,
        .trc-email-text p, .trc-email-text li, .trc-email-text strong { color:#e2e8f0 !important; }
        .trc-email-text h2.trc-urgent { color:#f87171 !important; }
        .trc-email-text a:not(.trc-email-btn) { color:#60a5fa !important; }
        .trc-email-text a.trc-email-btn { color:#ffffff !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    ${preheaderHtml}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="trc-email-bg" style="background:#f1f5f9;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="trc-email-card" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 32px 0 32px;text-align:left;">
                <img src="${logoUrl()}" alt="The Recruiting Compass" height="80" style="display:block;" />
              </td>
            </tr>
            <tr>
              <td class="trc-email-text" style="padding:24px 32px 32px 32px;color:#1e293b;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            ${footerHtml(opts.unsubscribeUrl)}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
