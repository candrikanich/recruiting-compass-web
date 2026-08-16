import { describe, it, expect } from "vitest";
import { resolveHostRedirect } from "~/middleware/host.global";

const admin = "admin.myrecruitingcompass.com";
const main = "myrecruitingcompass.com";

describe("resolveHostRedirect", () => {
  it("redirects /admin on the main host to the admin origin (external)", () => {
    expect(resolveHostRedirect(main, "/admin", admin)).toEqual({
      type: "external",
      to: "https://admin.myrecruitingcompass.com/admin",
    });
  });

  it("preserves the subpath on the external redirect", () => {
    expect(resolveHostRedirect(main, "/admin/users", admin)).toEqual({
      type: "external",
      to: "https://admin.myrecruitingcompass.com/admin/users",
    });
  });

  it("allows non-admin paths on the main host", () => {
    expect(resolveHostRedirect(main, "/schools", admin)).toBeNull();
  });

  it("allows /admin paths on the admin host", () => {
    expect(resolveHostRedirect(admin, "/admin/users", admin)).toBeNull();
  });

  it("redirects non-admin paths on the admin host to /admin (internal)", () => {
    expect(resolveHostRedirect(admin, "/schools", admin)).toEqual({
      type: "internal",
      to: "/admin",
    });
  });

  it("does nothing when host is empty (server/SPA pre-hydration)", () => {
    expect(resolveHostRedirect("", "/admin", admin)).toBeNull();
  });

  it("allows /login on the admin host (avoids redirect loop with auth middleware)", () => {
    expect(resolveHostRedirect(admin, "/login", admin)).toBeNull();
  });

  it("allows /verify-email on the admin host", () => {
    expect(resolveHostRedirect(admin, "/verify-email", admin)).toBeNull();
  });

  it("allows /reset-password on the admin host", () => {
    expect(resolveHostRedirect(admin, "/reset-password", admin)).toBeNull();
  });

  it("still redirects other non-admin, non-auth paths on the admin host to /admin", () => {
    expect(resolveHostRedirect(admin, "/schools", admin)).toEqual({
      type: "internal",
      to: "/admin",
    });
  });
});
