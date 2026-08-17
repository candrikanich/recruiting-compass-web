import { describe, it, expect, vi, beforeEach } from "vitest";

const adminHost = "admin.myrecruitingcompass.com";
vi.mock("#app", () => ({
  useRuntimeConfig: () => ({ public: { adminHost } }),
}));

import { computeAppHost } from "~/composables/useAppHost";

describe("computeAppHost", () => {
  it("flags the admin host", () => {
    const r = computeAppHost("admin.myrecruitingcompass.com", adminHost);
    expect(r.isAdminHost).toBe(true);
    expect(r.adminOrigin).toBe("https://admin.myrecruitingcompass.com");
  });

  it("flags the main host as non-admin", () => {
    const r = computeAppHost("myrecruitingcompass.com", adminHost);
    expect(r.isAdminHost).toBe(false);
  });

  it("treats empty (server) host as non-admin", () => {
    expect(computeAppHost("", adminHost).isAdminHost).toBe(false);
  });

  it("builds an absolute admin url from a path", () => {
    const r = computeAppHost("myrecruitingcompass.com", adminHost);
    expect(r.toAdminUrl("/admin/users")).toBe(
      "https://admin.myrecruitingcompass.com/admin/users",
    );
  });

  it("matches when the configured admin host has a trailing dot (FQDN)", () => {
    const r = computeAppHost(
      "admin.myrecruitingcompass.com",
      "admin.myrecruitingcompass.com.",
    );
    expect(r.isAdminHost).toBe(true);
    expect(r.adminHost).toBe("admin.myrecruitingcompass.com");
    expect(r.adminOrigin).toBe("https://admin.myrecruitingcompass.com");
  });

  it("matches when the current host has a trailing dot", () => {
    const r = computeAppHost("admin.myrecruitingcompass.com.", adminHost);
    expect(r.isAdminHost).toBe(true);
    expect(r.currentHost).toBe("admin.myrecruitingcompass.com");
  });
});
