import { describe, it, expect } from "vitest";
import { reconcileVisibility } from "~/server/api/player/profile.put";

describe("reconcileVisibility", () => {
  it("when section_config provided, derives show_* from it", () => {
    const out = reconcileVisibility(
      { section_config: [
        { key: "metrics", visible: true },
        { key: "film", visible: false },
        { key: "academics", visible: true },
      ] as never },
      { section_config: [], show_metrics: false, show_film: true, show_academics: false } as never,
    );
    expect(out.show_metrics).toBe(true);
    expect(out.show_film).toBe(false);
    expect(out.show_academics).toBe(true);
    expect(out.section_config).toHaveLength(6);
  });

  it("when only a legacy show_* provided, patches stored section_config's key", () => {
    const out = reconcileVisibility(
      { show_academics: false },
      { section_config: [
        { key: "academics", visible: true }, { key: "metrics", visible: true },
      ], show_academics: true } as never,
    );
    const acad = (out.section_config as { key: string; visible: boolean }[]).find(s => s.key === "academics");
    expect(acad?.visible).toBe(false);
  });

  it("no visibility fields → passes updates through untouched", () => {
    const out = reconcileVisibility({ bio: "hi" } as never, { section_config: [] } as never);
    expect(out).toEqual({ bio: "hi" });
  });
});
