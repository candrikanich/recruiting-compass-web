import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import SchoolCard from "~/components/School/SchoolCard.vue"
import { createMockSchool } from "~/tests/fixtures/schools.fixture"

describe("SchoolCard - Priority Tier Badge", () => {
  it("should display priority tier A badge", () => {
    const school = createMockSchool({ priority_tier: "A" })
    const wrapper = mount(SchoolCard, {
      props: { school },
      global: {
        stubs: {
          SchoolLogo: true,
        },
      },
    })

    const badge = wrapper.find('[data-testid="priority-tier-badge-A"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain("A")
    expect(badge.text()).toContain("Top Choice")
  })

  it("should display priority tier B badge", () => {
    const school = createMockSchool({ priority_tier: "B" })
    const wrapper = mount(SchoolCard, {
      props: { school },
      global: {
        stubs: {
          SchoolLogo: true,
        },
      },
    })

    const badge = wrapper.find('[data-testid="priority-tier-badge-B"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain("B")
    expect(badge.text()).toContain("Strong Interest")
  })

  it("should display priority tier C badge", () => {
    const school = createMockSchool({ priority_tier: "C" })
    const wrapper = mount(SchoolCard, {
      props: { school },
      global: {
        stubs: {
          SchoolLogo: true,
        },
      },
    })

    const badge = wrapper.find('[data-testid="priority-tier-badge-C"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain("C")
    expect(badge.text()).toContain("Fallback")
  })

  it("should not display priority tier badge when null", () => {
    const school = createMockSchool({ priority_tier: null })
    const wrapper = mount(SchoolCard, {
      props: { school },
      global: {
        stubs: {
          SchoolLogo: true,
        },
      },
    })

    const badge = wrapper.find('[data-testid^="priority-tier-badge"]')
    expect(badge.exists()).toBe(false)
  })

  it("should apply correct styling for tier A", () => {
    const school = createMockSchool({ priority_tier: "A" })
    const wrapper = mount(SchoolCard, {
      props: { school },
      global: {
        stubs: {
          SchoolLogo: true,
        },
      },
    })

    const badge = wrapper.find('[data-testid="priority-tier-badge-A"]')
    expect(badge.classes()).toContain("bg-red-100")
    expect(badge.classes()).toContain("text-red-700")
  })

  it("should apply correct styling for tier B", () => {
    const school = createMockSchool({ priority_tier: "B" })
    const wrapper = mount(SchoolCard, {
      props: { school },
      global: {
        stubs: {
          SchoolLogo: true,
        },
      },
    })

    const badge = wrapper.find('[data-testid="priority-tier-badge-B"]')
    expect(badge.classes()).toContain("bg-amber-100")
    expect(badge.classes()).toContain("text-amber-700")
  })

  it("should apply correct styling for tier C", () => {
    const school = createMockSchool({ priority_tier: "C" })
    const wrapper = mount(SchoolCard, {
      props: { school },
      global: {
        stubs: {
          SchoolLogo: true,
        },
      },
    })

    const badge = wrapper.find('[data-testid="priority-tier-badge-C"]')
    expect(badge.classes()).toContain("bg-slate-100")
    expect(badge.classes()).toContain("text-slate-700")
  })

  it("should have tooltip with tier label", () => {
    const school = createMockSchool({ priority_tier: "A" })
    const wrapper = mount(SchoolCard, {
      props: { school },
      global: {
        stubs: {
          SchoolLogo: true,
        },
      },
    })

    const badge = wrapper.find('[data-testid="priority-tier-badge-A"]')
    expect(badge.attributes("title")).toBe("Priority: Top Choice")
  })

  it("should display priority tier badge alongside division badge", () => {
    const school = createMockSchool({
      priority_tier: "A",
      division: "D1",
    })
    const wrapper = mount(SchoolCard, {
      props: { school },
      global: {
        stubs: {
          SchoolLogo: true,
        },
      },
    })

    const tierBadge = wrapper.find('[data-testid="priority-tier-badge-A"]')
    const allText = wrapper.text()

    expect(allText).toContain("D1")
    expect(tierBadge.exists()).toBe(true)
    expect(allText).toContain("A")
  })

  it("should update badge when priority tier changes via props", async () => {
    const school = createMockSchool({ priority_tier: "A" })
    const wrapper = mount(SchoolCard, {
      props: { school },
      global: {
        stubs: {
          SchoolLogo: true,
        },
      },
    })

    expect(wrapper.find('[data-testid="priority-tier-badge-A"]').exists()).toBe(
      true,
    )
    expect(wrapper.find('[data-testid="priority-tier-badge-B"]').exists()).toBe(
      false,
    )

    // Update props
    const updatedSchool = createMockSchool({ priority_tier: "B" })
    await wrapper.setProps({ school: updatedSchool })

    expect(wrapper.find('[data-testid="priority-tier-badge-A"]').exists()).toBe(
      false,
    )
    expect(wrapper.find('[data-testid="priority-tier-badge-B"]').exists()).toBe(
      true,
    )
  })

  it("should display all badges when division, priority, and conference exist", () => {
    const school = createMockSchool({
      priority_tier: "A",
      division: "D1",
      conference: "ACC",
    })
    const wrapper = mount(SchoolCard, {
      props: { school },
      global: {
        stubs: {
          SchoolLogo: true,
        },
      },
    })

    const badges = wrapper.findAll("span.inline-block")
    expect(badges.length).toBeGreaterThanOrEqual(3)
    expect(wrapper.text()).toContain("D1")
    expect(wrapper.text()).toContain("A")
    expect(wrapper.text()).toContain("ACC")
  })
})
