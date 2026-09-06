import { describe, it, expect } from "vitest";
import {
  generateInboundToken,
  resolveFamilyByInboundToken,
  parseInboundToken,
} from "~/server/utils/familyInboundToken";

function buildAdminMock(existingTokens: string[], familyByToken: Record<string, string>) {
  return {
    from: (table: string) => {
      if (table !== "family_units") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: (_col: string, value: string) => ({
            maybeSingle: async () => {
              if (existingTokens.includes(value)) {
                return { data: { id: "collide" }, error: null };
              }
              const familyId = familyByToken[value];
              return {
                data: familyId ? { id: familyId } : null,
                error: null,
              };
            },
          }),
        }),
      };
    },
  } as never;
}

describe("parseInboundToken", () => {
  it("extracts the token from a valid inbound address", () => {
    expect(
      parseInboundToken("family-ab3d9f2c@inbound.therecruitingcompass.com"),
    ).toBe("ab3d9f2c");
  });

  it("returns null for a malformed local-part", () => {
    expect(parseInboundToken("notfamily-ab3d9f2c@inbound.therecruitingcompass.com")).toBeNull();
    expect(parseInboundToken("family-short@inbound.therecruitingcompass.com")).toBeNull();
    expect(parseInboundToken("garbage")).toBeNull();
  });
});

describe("generateInboundToken", () => {
  it("retries on collision and returns a fresh 8-char token", async () => {
    const admin = buildAdminMock(["aaaaaaaa"], {});
    const token = await generateInboundToken(admin);
    expect(token).toMatch(/^[a-z0-9]{8}$/);
  });
});

describe("resolveFamilyByInboundToken", () => {
  it("resolves a family_unit_id when token is found", async () => {
    const admin = buildAdminMock([], { "valid123": "fam-123" });
    const familyId = await resolveFamilyByInboundToken(admin, "valid123");
    expect(familyId).toBe("fam-123");
  });

  it("returns null when token is not found", async () => {
    const admin = buildAdminMock([], {});
    const familyId = await resolveFamilyByInboundToken(admin, "unknown00");
    expect(familyId).toBeNull();
  });

  it("returns null for invalid token format", async () => {
    const admin = buildAdminMock([], {});
    const familyId = await resolveFamilyByInboundToken(admin, "toolong1234");
    expect(familyId).toBeNull();
  });
});
