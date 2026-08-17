import { describe, it, expect } from "vitest";
import {
  formatPhoneNational,
  formatPhoneDisplay,
  toE164US,
  toStoredPhone,
  toTelHref,
  toSmsHref,
} from "~/utils/phone";
import { phoneSchema } from "~/utils/validation/validators";

describe("formatPhoneNational", () => {
  it("formats as the user types", () => {
    expect(formatPhoneNational("")).toBe("");
    expect(formatPhoneNational("4")).toBe("4");
    expect(formatPhoneNational("440")).toBe("440");
    expect(formatPhoneNational("4405")).toBe("(440) 5");
    expect(formatPhoneNational("440555")).toBe("(440) 555");
    expect(formatPhoneNational("4405550")).toBe("(440) 555-0");
    expect(formatPhoneNational("4405550134")).toBe("(440) 555-0134");
  });

  it("strips a leading country code and caps at 10 national digits", () => {
    expect(formatPhoneNational("+14405550134")).toBe("(440) 555-0134");
    expect(formatPhoneNational("1440555013499")).toBe("(440) 555-0134");
  });

  it("re-formats pasted punctuation", () => {
    expect(formatPhoneNational("440-555-0134")).toBe("(440) 555-0134");
    expect(formatPhoneNational("(440) 555-0134")).toBe("(440) 555-0134");
  });
});

describe("toE164US", () => {
  it("normalizes US numbers to +1XXXXXXXXXX", () => {
    expect(toE164US("4405550134")).toBe("+14405550134");
    expect(toE164US("(440) 555-0134")).toBe("+14405550134");
    expect(toE164US("440-555-0134")).toBe("+14405550134");
    expect(toE164US("440.555.0134")).toBe("+14405550134");
    expect(toE164US("+1 440 555 0134")).toBe("+14405550134");
    expect(toE164US("14405550134")).toBe("+14405550134");
    expect(toE164US("+14405550134")).toBe("+14405550134");
  });

  it("returns null for empty or incomplete input", () => {
    expect(toE164US("")).toBeNull();
    expect(toE164US("440-555")).toBeNull();
    expect(toE164US("555-1234")).toBeNull();
  });
});

describe("toStoredPhone", () => {
  it("stores complete numbers as E.164 and empty as null", () => {
    expect(toStoredPhone("(440) 555-0134")).toBe("+14405550134");
    expect(toStoredPhone("")).toBeNull();
    expect(toStoredPhone("   ")).toBeNull();
    expect(toStoredPhone(null)).toBeNull();
  });

  it("keeps incomplete typed values so mid-edit autosave does not wipe them", () => {
    expect(toStoredPhone("440-555")).toBe("440-555");
  });
});

describe("formatPhoneDisplay", () => {
  it("shows a national mask for complete numbers and leaves leftovers alone", () => {
    expect(formatPhoneDisplay("+14405550134")).toBe("(440) 555-0134");
    expect(formatPhoneDisplay("440-555-0134")).toBe("(440) 555-0134");
    expect(formatPhoneDisplay("555-1234")).toBe("555-1234");
  });
});

describe("toTelHref / toSmsHref", () => {
  it("uses E.164 for complete numbers (iOS tel:/sms:)", () => {
    expect(toTelHref("(440) 555-0134")).toBe("tel:+14405550134");
    expect(toSmsHref("440-555-0134")).toBe("sms:+14405550134");
    expect(toSmsHref("+14405550134", "Hi coach")).toBe(
      "sms:+14405550134?body=Hi%20coach",
    );
  });

  it("falls back for incomplete legacy values", () => {
    expect(toTelHref("555-1234")).toBe("tel:555-1234");
    expect(toSmsHref("555-1234")).toBe("sms:5551234");
  });
});

describe("phoneSchema", () => {
  it("accepts common US formats and transforms to E.164", () => {
    const formats = [
      "555-123-4567",
      "(555) 123-4567",
      "555.123.4567",
      "5551234567",
      "+15551234567",
    ];
    for (const phone of formats) {
      expect(phoneSchema.parse(phone)).toBe("+15551234567");
    }
  });

  it("allows empty optional values", () => {
    expect(phoneSchema.parse("")).toBe("");
    expect(phoneSchema.parse(null)).toBeNull();
    expect(phoneSchema.parse(undefined)).toBeUndefined();
  });

  it("rejects garbage", () => {
    expect(() => phoneSchema.parse("invalid")).toThrow();
    expect(() => phoneSchema.parse("555-1234")).toThrow();
  });
});
