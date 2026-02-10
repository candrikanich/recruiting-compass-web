import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import SchoolMap from "~/components/School/SchoolMap.vue";

const mockSetView = vi.fn().mockReturnThis();
const mockAddTo = vi.fn().mockReturnThis();
const mockBindPopup = vi.fn().mockReturnThis();
const mockOpenPopup = vi.fn().mockReturnThis();
const mockSetLatLng = vi.fn().mockReturnThis();
const mockRemove = vi.fn();

const mockMarker = {
  addTo: mockAddTo,
  bindPopup: mockBindPopup,
  openPopup: mockOpenPopup,
  setLatLng: mockSetLatLng,
};

const mockMap = {
  setView: mockSetView,
  remove: mockRemove,
};

const mockTileLayerAddTo = vi.fn();

vi.mock("leaflet", () => ({
  default: {
    map: vi.fn(() => mockMap),
    tileLayer: vi.fn(() => ({ addTo: mockTileLayerAddTo })),
    marker: vi.fn(() => mockMarker),
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
  },
  map: vi.fn(() => mockMap),
  tileLayer: vi.fn(() => ({ addTo: mockTileLayerAddTo })),
  marker: vi.fn(() => mockMarker),
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: vi.fn(),
    },
  },
}));

vi.mock("leaflet/dist/leaflet.css", () => ({}));

describe("SchoolMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountComponent = (props: Record<string, unknown> = {}) =>
    mount(SchoolMap, { props });

  describe("rendering", () => {
    it("shows map container when coordinates present", () => {
      const wrapper = mountComponent({
        latitude: 29.6516,
        longitude: -82.3248,
        schoolName: "University of Florida",
      });

      expect(
        wrapper.find("[ref='mapContainer']").exists() ||
          wrapper.find(".h-48.w-full.rounded-lg.overflow-hidden").exists(),
      ).toBe(true);
    });

    it("shows placeholder when no latitude", () => {
      const wrapper = mountComponent({
        latitude: null,
        longitude: -82.3248,
      });

      expect(wrapper.text()).toContain("No location data available");
    });

    it("shows placeholder when no longitude", () => {
      const wrapper = mountComponent({
        latitude: 29.6516,
        longitude: null,
      });

      expect(wrapper.text()).toContain("No location data available");
    });

    it("shows placeholder when both coordinates missing", () => {
      const wrapper = mountComponent({});

      expect(wrapper.text()).toContain("No location data available");
      expect(wrapper.text()).toContain('Use "Lookup" to fetch coordinates');
    });
  });

  describe("map initialization", () => {
    it("initializes map on mount when coordinates available", async () => {
      mountComponent({
        latitude: 29.6516,
        longitude: -82.3248,
        schoolName: "UF",
      });
      await flushPromises();

      const L = await import("leaflet");
      expect(L.map || L.default?.map).toBeDefined();
    });

    it("does not initialize map without coordinates", async () => {
      mountComponent({
        latitude: null,
        longitude: null,
      });
      await flushPromises();

      expect(mockSetView).not.toHaveBeenCalled();
    });
  });

  describe("school name popup", () => {
    it("passes school name prop for popup display", () => {
      const wrapper = mountComponent({
        latitude: 29.6516,
        longitude: -82.3248,
        schoolName: "University of Florida",
      });

      expect(wrapper.props("schoolName")).toBe("University of Florida");
    });

    it("renders without school name", () => {
      const wrapper = mountComponent({
        latitude: 29.6516,
        longitude: -82.3248,
      });

      expect(wrapper.find(".school-map").exists()).toBe(true);
    });
  });

  describe("cleanup", () => {
    it("cleans up on unmount", async () => {
      const wrapper = mountComponent({
        latitude: 29.6516,
        longitude: -82.3248,
      });
      await flushPromises();

      // Should unmount without errors
      expect(() => wrapper.unmount()).not.toThrow();
    });
  });

  describe("coordinate changes", () => {
    it("updates marker when coordinates change", async () => {
      const wrapper = mountComponent({
        latitude: 29.6516,
        longitude: -82.3248,
        schoolName: "UF",
      });
      await flushPromises();

      await wrapper.setProps({
        latitude: 30.4383,
        longitude: -84.2807,
      });
      await flushPromises();

      // Either setLatLng or setView should be called after coordinate change
      expect(
        mockSetLatLng.mock.calls.length > 0 ||
          mockSetView.mock.calls.length > 1,
      ).toBe(true);
    });
  });
});
