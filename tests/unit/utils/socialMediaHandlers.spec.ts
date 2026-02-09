import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  openTwitter,
  openInstagram,
  openEmail,
  openSMS,
} from "~/utils/socialMediaHandlers";

describe("utils/socialMediaHandlers", () => {
  beforeEach(() => {
    // Mock window.open
    global.window = Object.create(window);
    Object.defineProperty(window, "open", {
      writable: true,
      value: vi.fn(),
    });

    // Mock window.location
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("openTwitter", () => {
    it("should open Twitter profile with clean handle", () => {
      openTwitter("@coachsmith");

      expect(window.open).toHaveBeenCalledWith(
        "https://twitter.com/coachsmith",
        "_blank",
      );
    });

    it("should open Twitter profile without @ symbol", () => {
      openTwitter("coachsmith");

      expect(window.open).toHaveBeenCalledWith(
        "https://twitter.com/coachsmith",
        "_blank",
      );
    });

    it("should not open window when handle is null", () => {
      openTwitter(null);

      expect(window.open).not.toHaveBeenCalled();
    });

    it("should not open window when handle is undefined", () => {
      openTwitter(undefined);

      expect(window.open).not.toHaveBeenCalled();
    });

    it("should not open window when handle is empty string", () => {
      openTwitter("");

      expect(window.open).not.toHaveBeenCalled();
    });
  });

  describe("openInstagram", () => {
    it("should open Instagram profile with clean handle", () => {
      openInstagram("@coachsmith");

      expect(window.open).toHaveBeenCalledWith(
        "https://instagram.com/coachsmith",
        "_blank",
      );
    });

    it("should open Instagram profile without @ symbol", () => {
      openInstagram("coachsmith");

      expect(window.open).toHaveBeenCalledWith(
        "https://instagram.com/coachsmith",
        "_blank",
      );
    });

    it("should not open window when handle is null", () => {
      openInstagram(null);

      expect(window.open).not.toHaveBeenCalled();
    });

    it("should not open window when handle is undefined", () => {
      openInstagram(undefined);

      expect(window.open).not.toHaveBeenCalled();
    });

    it("should not open window when handle is empty string", () => {
      openInstagram("");

      expect(window.open).not.toHaveBeenCalled();
    });
  });

  describe("openEmail", () => {
    it("should set window.location.href to mailto link", () => {
      openEmail("coach@university.edu");

      expect(window.location.href).toBe("mailto:coach@university.edu");
    });

    it("should not set href when email is null", () => {
      const originalHref = window.location.href;
      openEmail(null);

      expect(window.location.href).toBe(originalHref);
    });

    it("should not set href when email is undefined", () => {
      const originalHref = window.location.href;
      openEmail(undefined);

      expect(window.location.href).toBe(originalHref);
    });

    it("should not set href when email is empty string", () => {
      const originalHref = window.location.href;
      openEmail("");

      expect(window.location.href).toBe(originalHref);
    });
  });

  describe("openSMS", () => {
    it("should set window.location.href to sms link with clean phone", () => {
      openSMS("555-1234");

      expect(window.location.href).toBe("sms:5551234");
    });

    it("should remove all non-digit characters from phone", () => {
      openSMS("(555) 123-4567");

      expect(window.location.href).toBe("sms:5551234567");
    });

    it("should handle phone with spaces", () => {
      openSMS("555 123 4567");

      expect(window.location.href).toBe("sms:5551234567");
    });

    it("should handle phone with dots", () => {
      openSMS("555.123.4567");

      expect(window.location.href).toBe("sms:5551234567");
    });

    it("should not set href when phone is null", () => {
      const originalHref = window.location.href;
      openSMS(null);

      expect(window.location.href).toBe(originalHref);
    });

    it("should not set href when phone is undefined", () => {
      const originalHref = window.location.href;
      openSMS(undefined);

      expect(window.location.href).toBe(originalHref);
    });

    it("should not set href when phone is empty string", () => {
      const originalHref = window.location.href;
      openSMS("");

      expect(window.location.href).toBe(originalHref);
    });
  });
});
