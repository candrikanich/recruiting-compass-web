import { test, expect } from "@playwright/test";
import {
  getSupabaseAdmin,
  createOneOffTestUser,
  deleteOneOffTestUser,
  randomInboundToken,
} from "./seed/helpers/supabase-admin";

/**
 * Regression coverage for the `enforce_minor_requires_invite` RLS-visibility
 * bug (fixed in 20260925000020_fix_minor_invite_trigger_rls.sql).
 *
 * The trigger ran SECURITY INVOKER, so its EXISTS(...) check against
 * `family_invitations` was filtered by the CALLER's own RLS — a brand-new
 * minor accepting their very first invite isn't a `family_members` row yet,
 * so the check always saw zero matching invitations and always raised
 * "Players under 18 must join through a parent or guardian family
 * invitation," even with a real, matching, pending invite. This blocked
 * EVERY minor signing up via a family invite.
 *
 * This spec drives the exact broken path end-to-end through the real UI:
 * a brand-new minor (13-17) creates an account from `/join?token=...` with
 * a pending player invite waiting for their email, at the moment the
 * `users` upsert (which sets date_of_birth and fires the trigger) happens
 * BEFORE the family_members row exists. Pre-fix this raises; post-fix it
 * succeeds and the player lands in family_members + onboarding.
 */

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

const RUN = Date.now();
const PARENT_PASSWORD = "SeedPass123!";
const MINOR_PASSWORD = "MinorPass123!";

async function seedParentWithFamily(supabase: SupabaseAdmin) {
  const parentEmail = `minor-invite-parent-${RUN}@example.com`;
  const authUser = await createOneOffTestUser({
    email: parentEmail,
    password: PARENT_PASSWORD,
    displayName: "Minor Invite Parent",
    role: "parent",
  });
  const parentUserId = authUser?.id;
  if (!parentUserId)
    throw new Error("seedParentWithFamily: no auth id returned");

  await supabase.from("users").upsert(
    {
      id: parentUserId,
      email: parentEmail,
      full_name: "Minor Invite Parent",
      role: "parent",
      onboarding_completed: true,
    },
    { onConflict: "id" },
  );

  const { data: unit, error: unitError } = await supabase
    .from("family_units")
    .insert({
      family_name: `Minor Invite ${RUN} Family`,
      created_by_user_id: parentUserId,
      inbound_token: randomInboundToken(),
    })
    .select("id")
    .single();
  if (unitError || !unit)
    throw new Error(
      `seedParentWithFamily: family_units insert failed: ${unitError?.message}`,
    );

  const { error: memberError } = await supabase.from("family_members").insert({
    family_unit_id: unit.id,
    user_id: parentUserId,
    role: "parent",
  });
  if (memberError)
    throw new Error(
      `seedParentWithFamily: family_members insert failed: ${memberError.message}`,
    );

  return { parentEmail, parentUserId, familyUnitId: unit.id as string };
}

test.describe("Minor accepts a family invite (join.vue signup path)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const supabase = getSupabaseAdmin();
  const createdUserEmails: string[] = [];
  const createdUnitIds: string[] = [];

  test.afterAll(async () => {
    for (const unitId of createdUnitIds) {
      await supabase
        .from("family_invitations")
        .delete()
        .eq("family_unit_id", unitId);
      await supabase.from("family_members").delete().eq("family_unit_id", unitId);
      await supabase.from("family_units").delete().eq("id", unitId);
    }
    for (const email of createdUserEmails) {
      await deleteOneOffTestUser(email).catch(() => {});
    }
  });

  test("brand-new minor (13-17) can create an account from a pending player invite", async ({
    page,
  }) => {
    const { parentEmail, familyUnitId } = await seedParentWithFamily(supabase);
    createdUserEmails.push(parentEmail);
    createdUnitIds.push(familyUnitId);

    const minorEmail = `minor-invite-target-${RUN}@example.com`;
    const token = randomInboundToken();
    const { error: inviteError } = await supabase
      .from("family_invitations")
      .insert({
        family_unit_id: familyUnitId,
        invited_email: minorEmail,
        role: "player",
        token,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    expect(inviteError).toBeNull();

    await page.goto(`/join?token=${token}`);
    await expect(page.getByTestId("signup-section")).toBeVisible();

    // 15 years ago: old enough for COPPA (13+), still a minor (<18) — exactly
    // the age band the trigger's `date_of_birth > now() - 18 years` branch
    // gates.
    const fifteenYearsAgo = new Date();
    fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15);
    const dob = fifteenYearsAgo.toISOString().split("T")[0];

    await page.fill("#firstName", "Minor");
    await page.fill("#lastName", "Invitee");
    await page.fill("#invite-dob", dob);
    // Email is prefilled read-only from the invite (#769) — don't fill it.
    await expect(page.locator("#invite-email")).toHaveValue(minorEmail);
    await page.fill("#password", MINOR_PASSWORD);
    await page.fill("#confirmPassword", MINOR_PASSWORD);
    await page.check("#invite-terms");

    await page.getByRole("button", { name: /create account and connect/i }).click();

    // Pre-fix: the trigger raised on the `users` upsert and signupError
    // rendered "Players under 18 must join through a parent or guardian
    // family invitation." Post-fix: acceptance succeeds and we land on
    // onboarding.
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    createdUserEmails.push(minorEmail);

    const minorUserId = await supabase
      .from("users")
      .select("id, date_of_birth")
      .eq("email", minorEmail)
      .maybeSingle()
      .then(({ data }) => data);
    expect(minorUserId).not.toBeNull();
    expect(minorUserId?.date_of_birth).toBe(dob);

    const { data: membership } = await supabase
      .from("family_members")
      .select("family_unit_id, role")
      .eq("user_id", minorUserId?.id)
      .maybeSingle();
    expect(membership?.family_unit_id).toBe(familyUnitId);
    expect(membership?.role).toBe("player");

    const { data: acceptedInvite } = await supabase
      .from("family_invitations")
      .select("status")
      .eq("token", token)
      .single();
    expect(acceptedInvite?.status).toBe("accepted");
  });
});
