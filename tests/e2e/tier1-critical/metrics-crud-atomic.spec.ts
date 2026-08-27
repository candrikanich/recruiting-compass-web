import { test, expect } from "@playwright/test";

/**
 * Atomic CRUD — performance-metric lifecycle.
 *
 * Metrics are standalone (only user_id + family_unit_id, auto-injected), so no
 * parent entity to manage. The test walks one metric through
 * log → view → edit value → reload to confirm persistence → delete via the
 * ConfirmDialog.
 *
 * Metric type "other" is used because the type options are sport-registry
 * driven and this account's sport is unknown; "other" is always present and
 * takes the free-text name + editable unit path.
 *
 * The card is anchored by a UUID token dropped into Notes, which keeps the
 * locator unambiguous under fullyParallel sharding and the player's large
 * accumulated metric history.
 *
 * Auth: storageState (player.json, default project context).
 */
test.describe("Performance Metrics CRUD — atomic lifecycle", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("log → view → edit value → delete a metric", async ({ page }) => {
    const token = `e2e-metric-${crypto.randomUUID().slice(0, 8)}`;
    const initialValue = "42";
    const updatedValue = "57";

    // 1. LOG — open the modal, submit a real sport metric type
    await page.goto("/performance");
    // networkidle lets family context (activeFamilyId) hydrate — createMetric
    // throws "Family context not loaded" without it.
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "+ Log Metric" }).click();

    const dialog = page.getByRole("dialog", { name: "Log Performance Metric" });
    await expect(dialog).toBeVisible();

    // Pick the first real metric type (not the placeholder, not "other"). A
    // real type is chosen over "other" so the Edit modal's type select — which
    // only lists registry types — has a matching option and can save. The type
    // is sport-driven, so read it at runtime rather than hardcoding.
    const metricType = await dialog
      .locator("#metricType option")
      .evaluateAll((opts) => {
        const o = (opts as HTMLOptionElement[]).find(
          (e) => e.value && e.value !== "other",
        );
        return o ? o.value : null;
      });
    expect(metricType).toBeTruthy();
    await dialog.locator("#metricType").selectOption(metricType!);
    await dialog.locator("#value").fill(initialValue);
    // Notes render verbatim on the history card — the unique anchor for locating
    // exactly this metric among the player's existing rows of the same type.
    await dialog.locator("#notes").fill(token);
    // #date is pre-filled to today on mount

    const submit = dialog.getByRole("button", { name: "Log Metric" });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(dialog).toBeHidden();

    // 2. READ — the history card carrying our token is visible. The token also
    // appears in the Summary/Trends sections, so pin to the History card by its
    // Edit button (only history cards have one).
    const card = page
      .locator("div.rounded-lg.bg-white.p-6.shadow-sm")
      .filter({ hasText: token })
      .filter({ has: page.getByRole("button", { name: "Edit", exact: true }) });
    await expect(card).toBeVisible();
    await expect(card).toContainText(initialValue);

    // 3. UPDATE — open Edit on THAT card, change the value, save
    await card.getByRole("button", { name: "Edit", exact: true }).click();
    const editValue = page.locator("#editValue");
    await expect(editValue).toBeVisible();
    await editValue.fill(updatedValue);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(editValue).toBeHidden();

    // 4. Reload — confirm the new value persisted
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    const reloadedCard = page
      .locator("div.rounded-lg.bg-white.p-6.shadow-sm")
      .filter({ hasText: token })
      .filter({ has: page.getByRole("button", { name: "Edit", exact: true }) });
    await expect(reloadedCard).toContainText(updatedValue);

    // 5. DELETE — card Delete opens the ConfirmDialog; confirm inside it
    await reloadedCard
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Delete Metric" })
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    // 6. VERIFY — the metric is gone
    await expect(
      page
        .locator("div.rounded-lg.bg-white.p-6.shadow-sm")
        .filter({ hasText: token }),
    ).toHaveCount(0);
  });
});
