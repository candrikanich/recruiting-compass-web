import { BasePage } from "./BasePage";

export class CollaborationPage extends BasePage {
  async goto() {
    await super.goto("/settings/collaboration");
  }

  async navigateToCollaboration() {
    await this.click('[data-testid="nav-settings"]');
    await this.clickByText("Collaboration");
    await this.waitForURL("/settings/collaboration");
  }

  async inviteCollaborator(email: string) {
    await this.clickByText("Invite Family Member");
    await this.fillInput('[placeholder*="email"]', email);
    await this.selectOption('[data-testid="role-select"]', "Editor");
    await this.clickByText("Send Invite");
  }

  async expectInviteSent(email: string) {
    await this.expectVisible(`text=${email}`);
    await this.expectVisible("text=Pending");
  }

  async acceptInvite(inviteToken: string) {
    await this.page.goto(`/collaborate/accept/${inviteToken}`);
    await this.clickByText("Accept Invitation");
    await this.waitForURL("/dashboard");
  }

  async rejectInvite(inviteToken: string) {
    await this.page.goto(`/collaborate/accept/${inviteToken}`);
    await this.clickByText("Decline Invitation");
  }

  async viewCollaborators() {
    await this.goto();
    await this.expectVisible('[data-testid="collaborators-list"]');
  }

  async changeCollaboratorRole(collaboratorName: string, newRole: string) {
    await this.click(
      `[data-testid="collaborator-${collaboratorName}"] [data-testid="role-button"]`,
    );
    await this.clickByText(newRole);
  }

  async removeCollaborator(collaboratorName: string) {
    await this.click(
      `[data-testid="collaborator-${collaboratorName}"] [data-testid="remove-button"]`,
    );
    await this.clickByText("Confirm Remove");
  }

  async expectCollaborator(name: string) {
    await this.expectVisible(`text=${name}`);
  }

  async expectNotCollaborator(name: string) {
    await this.expectHidden(`text=${name}`);
  }

  async getCollaboratorCount(): Promise<number> {
    return await this.getCount('[data-testid="collaborator-card"]');
  }

  async linkAccount(email: string) {
    await this.clickByText("Link Existing Account");
    await this.fillInput('[placeholder*="email"]', email);
    await this.clickByText("Send Link Request");
  }

  async unlinkAccount(accountEmail: string) {
    await this.click(
      `[data-testid="account-${accountEmail}"] [data-testid="unlink-button"]`,
    );
    await this.clickByText("Confirm Unlink");
  }

  async viewLinkedAccounts() {
    await this.goto();
    await this.expectVisible('[data-testid="linked-accounts"]');
  }

  async getActivityLog() {
    return await this.getText('[data-testid="activity-log"]');
  }

  async expectActivityLogged(action: string) {
    await this.expectVisible(`text=${action}`);
  }
}
