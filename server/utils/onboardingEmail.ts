/**
 * Renders the Day-3 re-engagement nudge email body. Returned HTML is passed
 * as `message` to sendNotificationEmail(), which wraps it in the shared
 * email chrome — this only renders the inner content, not a full document.
 */

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

export function renderOnboardingNudgeEmail(
  data: OnboardingNudgeEmailData,
): string {
  const itemsHtml = data.topIncompleteItems
    .map(
      (item) =>
        `<li style="margin-bottom: 8px;"><a href="${item.link}" style="color: #2563eb; text-decoration: none;">${item.label}</a></li>`,
    )
    .join("");

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 8px;">
        Hey ${data.userName}, your recruiting profile is waiting 👋
      </h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">
        You've completed <strong>${data.completedCount} of ${data.totalCount}</strong> getting-started steps.
        A few quick actions will unlock personalized school matches and coach outreach tools:
      </p>
      <ul style="color: #475569; font-size: 15px; line-height: 1.8; padding-left: 20px;">
        ${itemsHtml}
      </ul>
      <div style="margin-top: 24px;">
        <a href="${data.dashboardUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
          Continue where you left off →
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 13px; margin-top: 32px;">
        — The Recruiting Compass
      </p>
    </div>
  `;
}
