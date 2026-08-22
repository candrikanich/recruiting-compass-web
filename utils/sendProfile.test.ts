import { describe, it, expect } from "vitest";
import {
  sendProfileSubject,
  sendProfileEmailBody,
  sendProfileTextBody,
  sendProfileChannel,
} from "./sendProfile";

const url = "https://app.example.com/p/owen?ref=abcd1234";

describe("sendProfileSubject", () => {
  it("includes grad year, name, and positions", () => {
    expect(sendProfileSubject("Owen Andrikanich", 2028, "3B/2B")).toBe(
      "2028 Owen Andrikanich Recruiting Profile (3B/2B)",
    );
  });

  it("omits grad year when missing", () => {
    expect(sendProfileSubject("Owen Andrikanich", undefined, "3B/2B")).toBe(
      "Owen Andrikanich Recruiting Profile (3B/2B)",
    );
  });

  it("omits positions when blank", () => {
    expect(sendProfileSubject("Owen Andrikanich", 2028, "")).toBe(
      "2028 Owen Andrikanich Recruiting Profile",
    );
    expect(sendProfileSubject("Owen Andrikanich", 2028, "  ")).toBe(
      "2028 Owen Andrikanich Recruiting Profile",
    );
  });
});

describe("sendProfileEmailBody", () => {
  it("greets the coach by last name and includes the url", () => {
    const body = sendProfileEmailBody("Owen Andrikanich", "Smith", url);
    expect(body.startsWith("Hi Coach Smith,")).toBe(true);
    expect(body).toContain("Owen Andrikanich's recruiting profile");
    expect(body).toContain(url);
    expect(body).toContain("Thank you for your time.");
  });

  it("falls back to a generic greeting when last name is blank", () => {
    const body = sendProfileEmailBody("Owen Andrikanich", "  ", url);
    expect(body.startsWith("Hi Coach,")).toBe(true);
  });
});

describe("sendProfileTextBody", () => {
  it("is short and includes grad year, name, and url", () => {
    const body = sendProfileTextBody("Owen Andrikanich", 2028, url);
    expect(body).toContain("2028 Owen Andrikanich");
    expect(body).toContain(url);
  });

  it("omits grad year when missing", () => {
    const body = sendProfileTextBody("Owen Andrikanich", undefined, url);
    expect(body.startsWith("Owen Andrikanich —")).toBe(true);
  });
});

describe("sendProfileChannel", () => {
  it("returns email when only email present", () => {
    expect(sendProfileChannel("c@x.edu", null)).toBe("email");
  });
  it("returns text when only phone present", () => {
    expect(sendProfileChannel(null, "5551234")).toBe("text");
  });
  it("returns both when email and phone present", () => {
    expect(sendProfileChannel("c@x.edu", "5551234")).toBe("both");
  });
  it("returns none when neither present", () => {
    expect(sendProfileChannel(null, null)).toBe("none");
    expect(sendProfileChannel("  ", "")).toBe("none");
  });
});
