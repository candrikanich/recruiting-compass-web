export const TEST_ACCOUNTS = {
  player: {
    email: "player@test.com",
    password: "TestPass123!",
    displayName: "Test Player",
    role: "player" as const,
  },
  parent: {
    email: "parent@test.com",
    password: "TestPass123!",
    displayName: "Test Parent",
    role: "parent" as const,
  },
  admin: {
    email: "admin@test.com",
    password: "TestPass123!",
    displayName: "Test Admin",
    role: "player" as const,
  },
  // iOS E2E test account — provisioned here so it exists when iOS CI runs
  iosParent: {
    email: "test@example.com",
    password: "TestPassword1",
    displayName: "iOS Test Parent",
    role: "parent" as const,
  },
} as const;

export type TestAccountType = keyof typeof TEST_ACCOUNTS;
