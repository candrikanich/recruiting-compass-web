import type { Ref, ComputedRef } from "vue";
import type { School } from "~/types";
import type { HomeLocation, Offer, Interaction, Coach } from "~/types/models";
import {
  exportSchoolComparisonToCSV,
  generateSchoolComparisonPDF,
  type SchoolComparisonData,
} from "~/utils/exportUtils";
import { calculateDistance } from "~/utils/distance";

export const useSchoolExport = ({
  filteredSchools,
  offers,
  allInteractions,
  allCoaches,
  userHomeLocation,
}: {
  filteredSchools: ComputedRef<School[]>;
  offers: Ref<Offer[]> | ComputedRef<Offer[]>;
  allInteractions: Ref<Interaction[]> | ComputedRef<Interaction[]>;
  allCoaches: Ref<Coach[]> | ComputedRef<Coach[]>;
  userHomeLocation: ComputedRef<HomeLocation | null>;
}) => {
  const getExportData = (): SchoolComparisonData[] => {
    return filteredSchools.value.map((school) => {
      const schoolOffers = offers.value.filter(
        (o) => o.school_id === school.id,
      );
      const interactionCount = allInteractions.value.filter(
        (i) => i.school_id === school.id,
      ).length;
      const coachCount = allCoaches.value.filter(
        (c) => c.school_id === school.id,
      ).length;

      let distance: number | null = null;
      if (
        userHomeLocation.value?.latitude &&
        userHomeLocation.value?.longitude &&
        school.academic_info
      ) {
        const lat = school.academic_info["latitude"] as number | undefined;
        const lng = school.academic_info["longitude"] as number | undefined;
        if (lat && lng) {
          distance = calculateDistance(
            {
              latitude: userHomeLocation.value.latitude,
              longitude: userHomeLocation.value.longitude,
            },
            { latitude: lat, longitude: lng },
          );
        }
      }

      return {
        ...school,
        favicon_url: null,
        coachCount,
        interactionCount,
        offer: schoolOffers.length > 0 ? schoolOffers[0] : null,
        distance,
      };
    });
  };

  const handleExportCSV = () => {
    const data = getExportData();
    if (data.length === 0) return;
    exportSchoolComparisonToCSV(data);
  };

  const handleExportPDF = () => {
    const data = getExportData();
    if (data.length === 0) return;
    generateSchoolComparisonPDF(data);
  };

  return { handleExportCSV, handleExportPDF };
};
