/**
 * GET /api/admin/email-preview?template=invite|nudge|digest|deadline|notification|feedback
 * Renders one of the 6 app-sent email templates with fixture data, for
 * visual QA in dev/QA. No email is sent. Admin-gated, SELECT-free (no DB
 * reads — fixture data only).
 */
import { defineEventHandler, getQuery, createError } from "h3";
import { requireAdmin } from "~/server/utils/auth";
import {
  renderWeeklyDigestEmail,
  renderDeadlineAlertEmail,
} from "~/server/utils/emailService";
import { renderOnboardingNudgeEmail } from "~/server/utils/onboardingEmail";
import { wrapEmailLayout } from "~/server/utils/emailTemplates";

const TEMPLATES = [
  "invite",
  "nudge",
  "digest",
  "deadline",
  "notification",
  "feedback",
] as const;
type TemplateName = (typeof TEMPLATES)[number];

function isTemplateName(v: unknown): v is TemplateName {
  return typeof v === "string" && (TEMPLATES as readonly string[]).includes(v);
}

function renderFixture(template: TemplateName): string {
  switch (template) {
    case "invite":
      return wrapEmailLayout(
        `<h1 style="margin:0 0 12px 0;font-size:20px;color:#1e293b;">Jordan invited you to join Smith Family's recruiting journey</h1>
         <p style="margin:0 0 20px 0;color:#475569;">Track your recruiting progress, message coaches, and manage deadlines — all in one place.</p>
         <a href="#" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Join Smith Family</a>`,
        { preheader: "Jordan invited you to join Smith Family's recruiting profile" },
      );
    case "nudge":
      return renderOnboardingNudgeEmail({
        userName: "Chris",
        completedCount: 2,
        totalCount: 8,
        topIncompleteItems: [
          { label: "Explore recommended schools", link: "#" },
          { label: "Complete your academics", link: "#" },
        ],
        dashboardUrl: "#",
      });
    case "digest":
      return renderWeeklyDigestEmail({
        lines: ["3 new school matches", "Coach Martinez viewed your profile"],
        upcomingDeadlines: [
          { label: "Offer from Ohio State", deadline_date: "2026-10-01" },
        ],
      });
    case "deadline":
      return renderDeadlineAlertEmail({
        label: "Offer from Ohio State",
        daysUntil: 3,
        deadline_date: "2026-10-01",
      });
    case "notification":
      return wrapEmailLayout(
        `<h1 style="margin:0 0 8px 0;font-size:18px;color:#1e293b;">Coach Martinez viewed your profile</h1>
         <p style="margin:12px 0 0 0;color:#475569;">They spent 3 minutes on your highlight reel.</p>`,
        { preheader: "Coach Martinez viewed your profile" },
      );
    case "feedback":
      return wrapEmailLayout(
        `<h2 style="color:#1e40af;font-size:18px;margin:0 0 12px 0;">[Feedback] Bug Report</h2>
         <p style="margin:0;color:#475569;"><strong>From:</strong> Fixture User (fixture@example.com)</p>`,
      );
  }
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const query = getQuery(event);
  const template = query.template;

  if (!isTemplateName(template)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid template. Expected one of: ${TEMPLATES.join(", ")}`,
    });
  }

  return { html: renderFixture(template) };
});
