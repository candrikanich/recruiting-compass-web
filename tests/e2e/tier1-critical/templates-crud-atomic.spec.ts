import { test, expect } from "@playwright/test";

/**
 * Atomic CRUD — communication-template lifecycle.
 *
 * Templates are standalone (user_id + family_unit_id, auto-injected). The test
 * creates an OWNED template (predefined built-ins reroute to a "copy" flow and
 * have no Delete), then walks it through
 * create → view → edit name → delete via the editor's ConfirmDialog.
 *
 * The template name carries a UUID token so list assertions stay unambiguous
 * under fullyParallel sharding.
 *
 * Auth: storageState (player.json, default project context).
 */
test.describe("Communication Templates CRUD — atomic lifecycle", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("create → view → edit name → delete a template", async ({ page }) => {
    const token = crypto.randomUUID().slice(0, 8);
    const name = `E2E Template ${token}`;
    const renamed = `${name} edited`;
    const body = `Hi Coach, this is a test outreach ${token}.`;

    // 1. CREATE — switch to the Create New tab, fill the editor, save
    await page.goto("/settings/communication-templates");
    // networkidle lets family context (activeFamilyId) hydrate before create —
    // loadTemplates scopes the list by it, so acting too early hides the new row.
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Create New/ }).click();

    // Labels aren't bound (no for=/id), so target inputs by placeholder and by
    // the editor form's single select/textarea. Type defaults to "email".
    const editorForm = page.locator("form");
    await page.getByPlaceholder("e.g., Initial Outreach").fill(name);
    await editorForm.locator("textarea").fill(body);
    await page.getByRole("button", { name: "Save Template" }).click();

    // 2. READ — page returns to the list tab; our card is present
    //
    // In CI, the on-save refetch can take >5s (Supabase + network + parallel
    // workers), so explicitly wait for the editor to unmount and allow a
    // longer visible assertion window for the newly created template.
    await expect(
      page.getByRole("heading", { name: "Create Template", exact: true }),
    ).toBeHidden({ timeout: 15_000 });
    const card = page
      .locator("div.rounded-lg.bg-white.p-6.shadow-sm")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
    await expect(card.first()).toBeVisible({ timeout: 20_000 });

    // 3. UPDATE — open Edit, change the name, save
    await card.first().getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Edit Template" })).toBeVisible();
    await page.getByPlaceholder("e.g., Initial Outreach").fill(renamed);
    await page.getByRole("button", { name: "Save Template" }).click();

    // 4. VERIFY update — renamed card appears, old name gone
    await expect(
      page.getByRole("heading", { name: renamed, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toHaveCount(0);

    // 5. DELETE — Delete lives inside the editor; open Edit, then delete
    const renamedCard = page
      .locator("div.rounded-lg.bg-white.p-6.shadow-sm")
      .filter({ has: page.getByRole("heading", { name: renamed, exact: true }) });
    await renamedCard
      .first()
      .getByRole("button", { name: "Edit", exact: true })
      .click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Delete Template" })
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    // 6. VERIFY delete — template is gone from the list
    await expect(
      page.getByRole("heading", { name: renamed, exact: true }),
    ).toHaveCount(0);
  });
});
