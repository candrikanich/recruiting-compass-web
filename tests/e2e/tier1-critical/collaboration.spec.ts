import { test } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { CollaborationPage } from "../pages/CollaborationPage";
import { testUsers } from "../fixtures/testData";

test.describe("Tier 1: Family Collaboration - Critical Flows", () => {
  let authPage: AuthPage;
  let collaborationPage: CollaborationPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    collaborationPage = new CollaborationPage(page);

    await authPage.goto();
    await authPage.signup(
      testUsers.newUser.email,
      testUsers.newUser.password,
      testUsers.newUser.displayName,
    );
  });

  test("should invite family member", async ({ page }) => {
    await collaborationPage.navigateToCollaboration();
    await collaborationPage.inviteCollaborator(testUsers.collaborator.email);

    await collaborationPage.expectInviteSent(testUsers.collaborator.email);
  });

  test("should accept collaboration invite", async ({ page }) => {
    await collaborationPage.navigateToCollaboration();
    await collaborationPage.inviteCollaborator(testUsers.collaborator.email);

    // Get the real invitation token
    const token = await collaborationPage.getInvitationToken(
      testUsers.collaborator.email,
    );

    // Switch to collaborator and accept
    const newPage = await page.context().newPage();
    const newAuthPage = new AuthPage(newPage);
    await newAuthPage.goto();
    await newAuthPage.signup(
      testUsers.collaborator.email,
      testUsers.collaborator.password,
      testUsers.collaborator.displayName,
    );

    // Accept invite with real token
    const newCollabPage = new CollaborationPage(newPage);
    if (token) {
      await newCollabPage.acceptInvite(token);
      await newCollabPage.expectVisible('[data-testid="linked-accounts"]');
    }

    await newPage.close();
  });

  test("should reject collaboration invite", async ({ page }) => {
    await collaborationPage.navigateToCollaboration();
    await collaborationPage.inviteCollaborator(testUsers.collaborator.email);

    // Get the real invitation token
    const token = await collaborationPage.getInvitationToken(
      testUsers.collaborator.email,
    );

    // Reject invite
    const newPage = await page.context().newPage();
    const newAuthPage = new AuthPage(newPage);
    await newAuthPage.goto();
    await newAuthPage.signup(
      testUsers.collaborator.email,
      testUsers.collaborator.password,
      testUsers.collaborator.displayName,
    );

    const newCollabPage = new CollaborationPage(newPage);
    if (token) {
      await newCollabPage.rejectInvite(token);
    }

    await newPage.close();
  });

  test("should view collaborators list", async ({ page }) => {
    await collaborationPage.navigateToCollaboration();
    await collaborationPage.viewCollaborators();

    await collaborationPage.expectVisible('[data-testid="collaborators-list"]');
  });

  test("should change collaborator role", async ({ page }) => {
    await collaborationPage.navigateToCollaboration();
    await collaborationPage.inviteCollaborator(testUsers.collaborator.email);

    // Change role to admin
    await collaborationPage.changeCollaboratorRole(
      testUsers.collaborator.displayName,
      "Admin",
    );

    // Verify
    const count = await collaborationPage.getCollaboratorCount();
    test.expect(count).toBeGreaterThanOrEqual(1);
  });

  test("should remove collaborator", async ({ page }) => {
    await collaborationPage.navigateToCollaboration();
    await collaborationPage.inviteCollaborator(testUsers.collaborator.email);

    // Remove
    await collaborationPage.removeCollaborator(
      testUsers.collaborator.displayName,
    );

    await collaborationPage.expectNotCollaborator(
      testUsers.collaborator.displayName,
    );
  });

  test("should link existing account", async ({ page }) => {
    await collaborationPage.navigateToCollaboration();
    await collaborationPage.linkAccount(testUsers.collaborator.email);

    // Verify link request sent
    await collaborationPage.expectVisible('[data-testid="linked-accounts"]');
  });

  test("should unlink account", async ({ page }) => {
    await collaborationPage.navigateToCollaboration();
    await collaborationPage.linkAccount(testUsers.collaborator.email);

    // Unlink
    await collaborationPage.unlinkAccount(testUsers.collaborator.email);

    await collaborationPage.expectNotCollaborator(testUsers.collaborator.email);
  });

  test("should log collaboration activity", async ({ page }) => {
    await collaborationPage.navigateToCollaboration();
    await collaborationPage.inviteCollaborator(testUsers.collaborator.email);

    // Check activity log
    const log = await collaborationPage.getActivityLog();
    test.expect(log.length).toBeGreaterThan(0);
  });

  test("should show who made changes", async ({ page }) => {
    await collaborationPage.navigateToCollaboration();
    await collaborationPage.inviteCollaborator(testUsers.collaborator.email);

    // Verify activity shows inviter
    await collaborationPage.expectActivityLogged("invited");
  });

  test("should enforce 5-user limit", async ({ page }) => {
    await collaborationPage.navigateToCollaboration();

    // Invite 5 users
    for (let i = 1; i <= 5; i++) {
      await collaborationPage.inviteCollaborator(`user${i}@test.com`);
    }

    // Try to invite 6th user - should fail
    await collaborationPage.inviteCollaborator("user6@test.com");
    await collaborationPage.expectInvitationError("maximum of 5 linked accounts");
  });

  test("should prevent secondary user from editing interactions", async ({
    page,
  }) => {
    // Setup: Invite and accept collaboration
    await collaborationPage.navigateToCollaboration();
    await collaborationPage.inviteCollaborator(testUsers.collaborator.email);

    // Get the real invitation token
    const token = await collaborationPage.getInvitationToken(
      testUsers.collaborator.email,
    );

    // Switch to collaborator and accept
    const newPage = await page.context().newPage();
    const newAuthPage = new AuthPage(newPage);
    await newAuthPage.goto();
    await newAuthPage.signup(
      testUsers.collaborator.email,
      testUsers.collaborator.password,
      testUsers.collaborator.displayName,
    );

    // Accept invite
    const newCollabPage = new CollaborationPage(newPage);
    if (token) {
      await newCollabPage.acceptInvite(token);

      // Navigate to interactions page
      await newPage.goto("/interactions");

      // Try to edit an interaction - should be prevented or read-only
      const editButton = newPage.locator('[data-testid="edit-interaction"]');
      const isDisabled = await editButton.isDisabled();

      test.expect(isDisabled || (await editButton.isHidden())).toBeTruthy();
    }

    await newPage.close();
  });
});
