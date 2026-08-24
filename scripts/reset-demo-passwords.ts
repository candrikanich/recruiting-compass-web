/**
 * Reset the shared demo-account passwords to a known value.
 *
 * The demo families (player1/player2/parent1/parent2 @compassdemo.app) live on
 * the same Supabase project the local dev server points at, so a drifted
 * password (e.g. after a password-reset test) breaks every manual verification.
 * `createOneOffTestUser` now self-heals on re-seed, but this is the surgical
 * path: it resets ONLY the four passwords and touches no family data.
 *
 * Requires Node 22+ (native WebSocket) and SUPABASE_SERVICE_ROLE_KEY +
 * NUXT_PUBLIC_SUPABASE_URL in .env / .env.local.
 *
 *   npx tsx scripts/reset-demo-passwords.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import { getSupabaseAdmin } from "../tests/e2e/seed/helpers/supabase-admin";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") }); // .env.local overrides

const SHARED_PASSWORD = "DemoPass123!";
const DEMO_EMAILS = [
  "player1@compassdemo.app",
  "parent1@compassdemo.app",
  "player2@compassdemo.app",
  "parent2@compassdemo.app",
];

async function main(): Promise<void> {
  const supabase = getSupabaseAdmin();
  console.log(
    `Resetting demo passwords → ${process.env.NUXT_PUBLIC_SUPABASE_URL}`,
  );

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error(`listUsers failed: ${error.message}`);

  for (const email of DEMO_EMAILS) {
    const user = data.users.find((u) => u.email === email);
    if (!user) {
      console.warn(`⚠️  ${email} not found — skipping`);
      continue;
    }
    const { error: updErr } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: SHARED_PASSWORD,
        email_confirm: true,
      },
    );
    if (updErr) throw new Error(`update ${email} failed: ${updErr.message}`);
    console.log(`   ✅ ${email}`);
  }

  console.log(
    `\n✅ Done. Shared password for all demo accounts: ${SHARED_PASSWORD}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
