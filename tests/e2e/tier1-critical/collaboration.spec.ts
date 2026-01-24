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

    // Switch to collaborator and accept
    const newPage = await page.context().newPage();
    const newAuthPage = new AuthPage(newPage);
    await newAuthPage.goto();
    await newAuthPage.signup(
      testUsers.collaborator.email,
      testUsers.collaborator.password,
      testUsers.collaborator.displayName,
    );

    // Accept invite (would need token in real scenario)
    const newCollabPage = new CollaborationPage(newPage);
    await newCollabPage.acceptInvite("test-token");

    await newPage.close();
  });

  test("should reject collaboration invite", async ({ page }) => {
    await collaborationPage.navigateToCollaboration();
    await collaborationPage.inviteCollaborator(testUsers.collaborator.email);

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
    await newCollabPage.rejectInvite("test-token");

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
});
