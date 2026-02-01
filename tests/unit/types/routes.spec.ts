import { describe, it, expect } from "vitest";
import {
  isProtectedRoute,
  getPublicRoutes,
  getProtectedRoutes,
} from "~/types/routes";

describe("Route Protection Matrix", () => {
  describe("isProtectedRoute", () => {
    describe("public routes", () => {
      it("should allow access to home page", () => {
        expect(isProtectedRoute("/")).toBe(false);
      });

      it("should allow access to login page", () => {
        expect(isProtectedRoute("/login")).toBe(false);
      });

      it("should allow access to signup page", () => {
        expect(isProtectedRoute("/signup")).toBe(false);
      });

      it("should allow access to forgot-password page", () => {
        expect(isProtectedRoute("/forgot-password")).toBe(false);
      });

      it("should allow access to reset-password page", () => {
        expect(isProtectedRoute("/reset-password")).toBe(false);
      });

      it("should allow access to verify-email page", () => {
        expect(isProtectedRoute("/verify-email")).toBe(false);
      });
    });

    describe("protected routes", () => {
      it("should protect dashboard", () => {
        expect(isProtectedRoute("/dashboard")).toBe(true);
      });

      it("should protect coaches page", () => {
        expect(isProtectedRoute("/coaches")).toBe(true);
      });

      it("should protect nested coach routes", () => {
        expect(isProtectedRoute("/coaches/123")).toBe(true);
        expect(isProtectedRoute("/coaches/123/analytics")).toBe(true);
      });

      it("should protect schools page", () => {
        expect(isProtectedRoute("/schools")).toBe(true);
      });

      it("should protect nested school routes", () => {
        expect(isProtectedRoute("/schools/456")).toBe(true);
        expect(isProtectedRoute("/schools/456/coaches")).toBe(true);
      });

      it("should protect search page", () => {
        expect(isProtectedRoute("/search")).toBe(true);
      });

      it("should protect analytics page", () => {
        expect(isProtectedRoute("/analytics")).toBe(true);
      });

      it("should protect documents page", () => {
        expect(isProtectedRoute("/documents")).toBe(true);
      });

      it("should protect settings pages", () => {
        expect(isProtectedRoute("/settings")).toBe(true);
        expect(isProtectedRoute("/settings/account-linking")).toBe(true);
        expect(isProtectedRoute("/settings/dashboard")).toBe(true);
      });

      it("should protect events pages", () => {
        expect(isProtectedRoute("/events")).toBe(true);
        expect(isProtectedRoute("/events/create")).toBe(true);
      });

      it("should protect social pages", () => {
        expect(isProtectedRoute("/social")).toBe(true);
        expect(isProtectedRoute("/social/analytics")).toBe(true);
      });

      it("should protect admin pages", () => {
        expect(isProtectedRoute("/admin/batch-fetch-logos")).toBe(true);
      });
    });
  });

  describe("getPublicRoutes", () => {
    it("should return list of public routes", () => {
      const publicRoutes = getPublicRoutes();
      expect(publicRoutes).toContain("/");
      expect(publicRoutes).toContain("/login");
      expect(publicRoutes).toContain("/signup");
      expect(publicRoutes).toContain("/forgot-password");
      expect(publicRoutes.length).toBeGreaterThan(0);
    });
  });

  describe("getProtectedRoutes", () => {
    it("should return list of protected route prefixes", () => {
      const protectedRoutes = getProtectedRoutes();
      expect(protectedRoutes).toContain("/dashboard");
      expect(protectedRoutes).toContain("/coaches");
      expect(protectedRoutes).toContain("/schools");
      expect(protectedRoutes.length).toBeGreaterThan(0);
    });
  });
});
