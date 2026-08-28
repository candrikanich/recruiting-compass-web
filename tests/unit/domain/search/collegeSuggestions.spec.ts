import { describe, expect, it } from "vitest";
import { mapCollegeSearchResults } from "~/domain/search";

describe("domain/search college suggestions", () => {
  it("dedupes by id and joins city/state", () => {
    const mapped = mapCollegeSearchResults([
      {
        id: 1,
        "school.name": "Stanford",
        "school.city": "Stanford",
        "school.state": "CA",
      },
      {
        id: 1,
        "school.name": "Stanford Duplicate",
        "school.city": "Stanford",
        "school.state": "CA",
      },
      {
        id: 2,
        "school.name": "Duke",
        "school.city": "Durham",
        "school.state": "NC",
      },
    ]);
    expect(mapped).toEqual([
      { id: "1", name: "Stanford", location: "Stanford, CA" },
      { id: "2", name: "Duke", location: "Durham, NC" },
    ]);
  });

  it("omits empty location parts", () => {
    expect(
      mapCollegeSearchResults([
        {
          id: 9,
          "school.name": "Unknown",
          "school.city": "",
          "school.state": "",
        },
      ]),
    ).toEqual([{ id: "9", name: "Unknown", location: "" }]);
  });
});
