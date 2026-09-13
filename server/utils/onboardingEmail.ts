/**
 * Renders the Day-3 re-engagement nudge email as a full HTML document.
 * Send with sendEmail({ html }) — not sendNotificationEmail(), which
 * HTML-escapes its `message` field and would double-encode this markup.
 */

import { wrapEmailLayout } from "~/server/utils/emailTemplates";

interface OnboardingNudgeEmailItem {
  label: string;
  link: string;
}

interface OnboardingNudgeEmailData {
  userName: string;
  completedCount: number;
  totalCount: number;
  topIncompleteItems: OnboardingNudgeEmailItem[];
  dashboardUrl: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderOnboardingNudgeEmail(
  data: OnboardingNudgeEmailData,
): string {
  const safeUserName = escapeHtml(data.userName);
  const itemsHtml = data.topIncompleteItems
    .map(
      (item) =>
        `<li style="margin-bottom:8px;"><a href="${escapeHtml(item.link)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(item.label)}</a></li>`,
    )
    .join("");

  const bodyHtml = `
    <h2 style="color:#1e293b;font-size:18px;margin:0 0 8px 0;">
      Hey ${safeUserName}, your recruiting profile is waiting 👋
    </h2>
    <p style="color:#475569;margin:0 0 16px 0;">
      You've completed <strong>${data.completedCount} of ${data.totalCount}</strong> getting-started steps.
      A few quick actions will unlock personalized school matches and coach outreach tools:
    </p>
    <ul style="color:#475569;line-height:1.8;padding-left:20px;margin:0 0 20px 0;">
      ${itemsHtml}
    </ul>
    <a href="${data.dashboardUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
      Continue where you left off →
    </a>
  `;

  return wrapEmailLayout(bodyHtml, {
    preheader: `You've completed ${data.completedCount} of ${data.totalCount} steps`,
  });
}
