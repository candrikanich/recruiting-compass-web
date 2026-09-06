import { describe, it, expect, vi } from "vitest";

const loadMock = vi.fn();
let capturedBuildUrl: ((opts?: unknown) => string) | undefined;

vi.mock("~/composables/useAdminResource", () => ({
  useAdminResource: (buildUrl: (opts?: unknown) => string) => {
    capturedBuildUrl = buildUrl;
    return {
      data: { value: { rows: [{ id: "evt-1" }], total: 1 } },
      loading: { value: false },
      error: { value: null },
      load: loadMock,
    };
  },
}));

import { useAdminEmailEvents } from "~/composables/useAdminEmailEvents";

describe("useAdminEmailEvents", () => {
  it("exposes rows/total from the resource data", () => {
    const { rows, total } = useAdminEmailEvents();
    expect(rows.value).toEqual([{ id: "evt-1" }]);
    expect(total.value).toBe(1);
  });

  it("builds the query string from filter options", () => {
    useAdminEmailEvents();
    const url = capturedBuildUrl!({
      limit: 25,
      eventType: "bounced",
      recipientEmail: "coach@",
    });
    expect(url).toBe(
      "/api/admin/email-events?limit=25&eventType=bounced&recipientEmail=coach%40",
    );
  });

  it("builds the bare URL with no options", () => {
    useAdminEmailEvents();
    expect(capturedBuildUrl!()).toBe("/api/admin/email-events");
  });
});
