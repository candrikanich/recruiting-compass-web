import { d as defineEventHandler, a as createError } from '../../../nitro/nitro.mjs';
import { c as createServerSupabaseClient } from '../../../_/supabase.mjs';
import { r as requireAuth } from '../../../_/auth.mjs';
import { c as calculatePortfolioHealth } from '../../../_/fitScoreCalculation.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'crypto';
import '@supabase/supabase-js';

const portfolioHealth_get = defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const supabase = createServerSupabaseClient();
  try {
    const { data: schools, error: schoolsError } = await supabase.from("schools").select("id, name, fit_score, fit_score_data").eq("user_id", user.id).order("created_at", { ascending: false });
    if (schoolsError) {
      throw schoolsError;
    }
    const portfolioHealth = calculatePortfolioHealth(
      (schools || []).map((school) => ({
        fit_score: school.fit_score || 0,
        fit_tier: void 0
      }))
    );
    return {
      success: true,
      data: {
        portfolio: portfolioHealth,
        schoolCount: (schools == null ? void 0 : schools.length) || 0,
        schools: (schools || []).map((school) => ({
          id: school.id,
          name: school.name,
          fitScore: school.fit_score,
          fitScoreData: school.fit_score_data
        }))
      }
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to calculate portfolio health";
    console.error("Portfolio health error:", err);
    throw createError({
      statusCode: 500,
      statusMessage: message
    });
  }
});

export { portfolioHealth_get as default };
//# sourceMappingURL=portfolio-health.get.mjs.map
