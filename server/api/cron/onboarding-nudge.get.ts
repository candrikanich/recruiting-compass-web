/**
 * GET /api/cron/onboarding-nudge
 * Scheduled cron: send a Day-3 re-engagement email to users who signed up
 * 3-7 days ago and are still below 50% on the getting-started checklist.
 * Idempotent — marks `nux_progress.dismissals.onboarding_nudge_email` on
 * send so a user is never nudged twice.
 *
 * Security: Vercel sends CRON_SECRET as "Authorization: Bearer <secret>".
 * Manual callers may also pass it as "x-cron-secret: <secret>".
 */

import { defineEventHandler } from "h3";
import { withCronRun } from "~/server/utils/cronRunner";
import { useSupabaseAdmin } from "~/server/utils/supabase";
import { useLogger } from "~/server/utils/logger";
import { sendNotificationEmail } from "~/server/utils/emailService";
import { renderOnboardingNudgeEmail } from "~/server/utils/onboardingEmail";
import {
  NUX_CHECKLIST_KEYS,
  parseNuxProgress,
  type NuxChecklistKey,
} from "~/types/nux";

const CHECKLIST_LABELS: Record<NuxChecklistKey, string> = {
  sport: "Choose your sport",
  first_school: "Explore recommended schools",
  academics: "Complete your academics",
  first_coach: "Add your first coach",
  invite_family: "Invite your family",
  profile_80: "Complete your profile",
  preview_template: "Preview a coach outreach email",
  check_timeline: "Check your recruiting timeline",
};

const CHECKLIST_LINKS: Record<NuxChecklistKey, string> = {
  sport: "/settings/player-details",
  first_school: "/schools",
  academics: "/settings/player-details?tab=academics",
  first_coach: "/coaches",
  invite_family: "/settings/family-management",
  profile_80: "/settings/player-details",
  preview_template: "/settings/communication-templates",
  check_timeline: "/timeline",
};

const NUDGE_DISMISSAL_KEY = "onboarding_nudge_email";
const NUDGE_MIN_ACCOUNT_AGE_MS = 3 * 86_400_000;
// 7-day cap avoids emailing users who signed up months ago.
const NUDGE_MAX_ACCOUNT_AGE_MS = 7 * 86_400_000;
const NUDGE_COMPLETION_THRESHOLD = 50;

interface CronResult {
  total: number;
  sent: number;
  skipped: number;
  failed: number;
}

export default defineEventHandler(async (event) =>
  withCronRun(event, "onboarding-nudge", async (ctx) => {
    const logger = useLogger(event, "cron/onboarding-nudge");
    const supabase = useSupabaseAdmin();
    const threeDaysAgo = new Date(
      Date.now() - NUDGE_MIN_ACCOUNT_AGE_MS,
    ).toISOString();
    const sevenDaysAgo = new Date(
      Date.now() - NUDGE_MAX_ACCOUNT_AGE_MS,
    ).toISOString();

    // The generated Database type predates the nux_progress column
    // (migration 20260914000000); cast the select shape until types regen.
    const { data: users, error } = (await supabase
      .from("users")
      .select("id, email, full_name, nux_progress, created_at")
      .lte("created_at", threeDaysAgo)
      .gte("created_at", sevenDaysAgo)
      .not("email", "like", "%@test.com")) as {
      data: Array<{
        id: string;
        email: string | null;
        full_name: string | null;
        nux_progress: unknown;
        created_at: string;
      }> | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: any;
    };

    if (error || !users) {
      logger.error("Failed to fetch onboarding-nudge candidates", error);
      ctx.setFailed(1);
      return { total: 0, sent: 0, skipped: 0, failed: 1 };
    }

    const result: CronResult = {
      total: users.length,
      sent: 0,
      skipped: 0,
      failed: 0,
    };

    const baseUrl =
      process.env.NUXT_PUBLIC_SITE_URL ?? "https://myrecruitingcompass.com";

    for (const user of users) {
      try {
        if (!user.email) {
          result.skipped++;
          continue;
        }

        const progress = parseNuxProgress(user.nux_progress);
        if (progress.dismissals[NUDGE_DISMISSAL_KEY]) {
          result.skipped++;
          continue;
        }

        const completedCount = NUX_CHECKLIST_KEYS.filter(
          (k) => progress.checklist.items[k]?.completed,
        ).length;
        const percentage = Math.round(
          (completedCount / NUX_CHECKLIST_KEYS.length) * 100,
        );

        if (percentage >= NUDGE_COMPLETION_THRESHOLD) {
          result.skipped++;
          continue;
        }

        const incompleteItems = NUX_CHECKLIST_KEYS.filter(
          (k) => !progress.checklist.items[k]?.completed,
        )
          .slice(0, 3)
          .map((k) => ({
            label: CHECKLIST_LABELS[k],
            link: `${baseUrl}${CHECKLIST_LINKS[k]}`,
          }));

        const html = renderOnboardingNudgeEmail({
          userName: user.full_name?.split(" ")[0] ?? "there",
          completedCount,
          totalCount: NUX_CHECKLIST_KEYS.length,
          topIncompleteItems: incompleteItems,
          dashboardUrl: `${baseUrl}/dashboard`,
        });

        await sendNotificationEmail({
          to: user.email,
          subject: "Your recruiting profile is waiting 👋",
          title: "Continue your setup",
          message: html,
          priority: "low",
          idempotencyKey: `onboarding-nudge-${user.id}`,
        });

        const updatedProgress = {
          ...progress,
          dismissals: {
            ...progress.dismissals,
            [NUDGE_DISMISSAL_KEY]: new Date().toISOString(),
          },
        };

        const { error: updateError } = await supabase
          .from("users")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ nux_progress: updatedProgress } as any)
          .eq("id", user.id);

        if (updateError) {
          logger.error(
            `Sent onboarding nudge but failed to record dismissal for ${user.id}`,
            updateError,
          );
        }

        result.sent++;
      } catch (err) {
        result.failed++;
        logger.error(`Failed onboarding nudge for ${user.id}`, err);
      }
    }

    ctx.setProcessed(result.total);
    ctx.setFailed(result.failed);
    return result;
  }),
);
