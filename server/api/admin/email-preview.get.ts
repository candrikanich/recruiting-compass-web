/**
 * GET /api/admin/email-preview?template=invite|nudge|digest|deadline|notification|feedback
 * Renders one of the 6 app-sent email templates with fixture data, for
 * visual QA in dev/QA. No email is sent. Admin-gated, SELECT-free (no DB
 * reads — fixture data only).
 */
import { defineEventHandler, getQuery, createError, setHeader } from "h3";
import { requireAdmin } from "~/server/utils/auth";
import {
  renderWeeklyDigestEmail,
  renderDeadlineAlertEmail,
  renderInviteBody,
  renderNotificationBody,
} from "~/server/utils/emailService";
import { renderOnboardingNudgeEmail } from "~/server/utils/onboardingEmail";
import { renderFeedbackBody } from "~/server/api/feedback.post";
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
        renderInviteBody("Jordan", "Smith Family", "player", "#"),
        {
          preheader:
            "Jordan invited you to join Smith Family's recruiting profile",
        },
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
        renderNotificationBody(
          "Coach Martinez viewed your profile",
          "They spent 3 minutes on your highlight reel.",
          "normal",
        ),
        { preheader: "Coach Martinez viewed your profile" },
      );
    case "feedback":
      return wrapEmailLayout(
        renderFeedbackBody(
          "Bug Report",
          "Fixture User",
          "fixture@example.com",
          "fixture-user-id",
          undefined,
          "This is a fixture feedback message for preview purposes.",
        ),
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

  setHeader(event, "content-type", "text/html; charset=utf-8");
  return renderFixture(template);
});
