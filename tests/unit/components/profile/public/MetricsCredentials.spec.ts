import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import MetricsCredentials from "~/components/profile/public/MetricsCredentials.vue";

describe("MetricsCredentials", () => {
  it("renders nothing when there is no NCAA ID and no services", () => {
    const w = mount(MetricsCredentials, {
      props: { credentials: { ncaaId: null, services: [] } },
    });
    expect(w.html()).toBe("<!--v-if-->");
  });

  it("renders the NCAA ID tag", () => {
    const w = mount(MetricsCredentials, {
      props: { credentials: { ncaaId: "1234567890", services: [] } },
    });
    expect(w.text()).toContain("NCAA ID: 1234567890");
  });

  it("renders one external-link badge per service", () => {
    const w = mount(MetricsCredentials, {
      props: {
        credentials: {
          ncaaId: null,
          services: [
            {
              key: "perfect_game_id",
              label: "Perfect Game",
              url: "https://www.perfectgame.org/Players/Playerprofile.aspx?ID=PG123",
            },
            {
              key: "prep_baseball_id",
              label: "Prep Baseball Report",
              url: "https://www.prepbaseballreport.com/profiles/TX/owen-a",
            },
          ],
        },
      },
    });
    const links = w.findAll("a");
    expect(links).toHaveLength(2);
    expect(links[0].text()).toContain("Perfect Game");
    expect(links[0].attributes("href")).toBe(
      "https://www.perfectgame.org/Players/Playerprofile.aspx?ID=PG123",
    );
    expect(links[0].attributes("target")).toBe("_blank");
    expect(links[0].attributes("rel")).toBe("noopener noreferrer");
    expect(links[1].text()).toContain("Prep Baseball Report");
  });
});
