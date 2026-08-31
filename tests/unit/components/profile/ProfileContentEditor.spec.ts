import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ProfileContentEditor from "../../../../components/profile/setup/ProfileContentEditor.vue";

describe("ProfileContentEditor", () => {
  it("adds a value tag on Enter and emits", async () => {
    const w = mount(ProfileContentEditor, {
      props: { bio: "", lookingFor: "", awards: [], valuesTags: [] } as never,
    });
    const input = w.find("[data-test='values-input']");
    await input.setValue("Academics");
    await input.trigger("keydown.enter");
    const emitted = w.emitted("update:valuesTags")?.at(-1)?.[0] as string[];
    expect(emitted).toContain("Academics");
  });

  it("adds an award row and emits", async () => {
    const w = mount(ProfileContentEditor, {
      props: { bio: "", lookingFor: "", awards: [], valuesTags: [] } as never,
    });
    await w.find("[data-test='add-award']").trigger("click");
    const emitted = w.emitted("update:awards")?.at(-1)?.[0] as unknown[];
    expect(emitted.length).toBe(1);
  });

  it("does not add a duplicate or blank value tag", async () => {
    const w = mount(ProfileContentEditor, {
      props: {
        bio: "",
        lookingFor: "",
        awards: [],
        valuesTags: ["Academics"],
      } as never,
    });
    const input = w.find("[data-test='values-input']");
    await input.setValue("   ");
    await input.trigger("keydown.enter");
    expect(w.emitted("update:valuesTags")).toBeFalsy();

    await input.setValue("Academics");
    await input.trigger("keydown.enter");
    expect(w.emitted("update:valuesTags")).toBeFalsy();
  });

  it("caps value tags at 12", async () => {
    const twelve = Array.from({ length: 12 }, (_, i) => `Tag${i}`);
    const w = mount(ProfileContentEditor, {
      props: {
        bio: "",
        lookingFor: "",
        awards: [],
        valuesTags: twelve,
      } as never,
    });
    const input = w.find("[data-test='values-input']");
    await input.setValue("Thirteenth");
    await input.trigger("keydown.enter");
    expect(w.emitted("update:valuesTags")).toBeFalsy();
  });

  it("removes a value tag on chip remove click", async () => {
    const w = mount(ProfileContentEditor, {
      props: {
        bio: "",
        lookingFor: "",
        awards: [],
        valuesTags: ["Academics", "Speed"],
      } as never,
    });
    const removeButtons = w.findAll("[data-test='remove-value-tag']");
    await removeButtons[0].trigger("click");
    const emitted = w.emitted("update:valuesTags")?.at(-1)?.[0] as string[];
    expect(emitted).toEqual(["Speed"]);
  });

  it("removes an award row", async () => {
    const w = mount(ProfileContentEditor, {
      props: {
        bio: "",
        lookingFor: "",
        awards: [
          { title: "MVP", year: 2024 },
          { title: "All-State", year: 2023 },
        ],
        valuesTags: [],
      } as never,
    });
    const removeButtons = w.findAll("[data-test='remove-award']");
    await removeButtons[0].trigger("click");
    const emitted = w.emitted("update:awards")?.at(-1)?.[0] as {
      title: string;
    }[];
    expect(emitted).toEqual([{ title: "All-State", year: 2023 }]);
  });

  it("enforces bio and looking_for character caps", () => {
    const w = mount(ProfileContentEditor, {
      props: {
        bio: "a".repeat(300),
        lookingFor: "b".repeat(600),
        awards: [],
        valuesTags: [],
      } as never,
    });
    const bioTextarea = w.find("[data-test='bio-textarea']");
    const lookingForTextarea = w.find("[data-test='looking-for-textarea']");
    expect(bioTextarea.attributes("maxlength")).toBe("300");
    expect(lookingForTextarea.attributes("maxlength")).toBe("600");
    expect(w.text()).toMatch(/300\/300/);
    expect(w.text()).toMatch(/600\/600/);
  });
});
