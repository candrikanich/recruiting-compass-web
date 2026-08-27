import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";
import ProfileAppearanceEditor from "../../../../components/profile/setup/ProfileAppearanceEditor.vue";
import { useProfileBanner } from "~/composables/useProfileBanner";

vi.mock("~/composables/useProfileBanner");

describe("ProfileAppearanceEditor", () => {
  beforeEach(() => {
    vi.mocked(useProfileBanner).mockReturnValue({
      uploading: ref(false),
      error: ref(null),
      uploadBanner: vi.fn().mockResolvedValue("https://example.com/banner.jpg"),
    });
  });

  it("emits update:headerColor when a swatch is clicked", async () => {
    const w = mount(ProfileAppearanceEditor, {
      props: { headerColor: "slate", bannerUrl: null } as never,
    });
    await w.find("[data-test='header-color-blue']").trigger("click");
    expect(w.emitted("update:headerColor")?.at(-1)?.[0]).toBe("blue");
  });

  it("uploads the picked file and emits update:bannerUrl with the returned URL", async () => {
    const w = mount(ProfileAppearanceEditor, {
      props: { headerColor: "slate", bannerUrl: null } as never,
    });
    const input = w.find("[data-test='banner-upload']")
      .element as HTMLInputElement;
    const file = new File(["banner"], "banner.jpg", { type: "image/jpeg" });
    Object.defineProperty(input, "files", { value: [file] });
    await w.find("[data-test='banner-upload']").trigger("change");

    const { uploadBanner } = useProfileBanner();
    expect(uploadBanner).toHaveBeenCalledWith(file);
    expect(w.emitted("update:bannerUrl")?.at(-1)?.[0]).toBe(
      "https://example.com/banner.jpg",
    );
  });
});
