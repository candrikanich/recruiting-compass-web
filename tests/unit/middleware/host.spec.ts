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
});
