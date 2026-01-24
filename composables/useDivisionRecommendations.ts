import type { DivisionRecommendation } from "~/types/timeline";

/**
 * Division Recommendation Composable
 * Provides logic to recommend alternative divisions based on fit scores
 */
export const useDivisionRecommendations = () => {
  /**
   * Get division recommendations based on current division and fit score
   * @param currentDivision The school's division (D1, D2, D3, NAIA, JUCO)
   * @param fitScore The calculated fit score (0-100)
   * @returns DivisionRecommendation object with recommendations and message
   */
  const getRecommendedDivisions = (
    currentDivision: string | null | undefined,
    fitScore: number | null | undefined,
  ): DivisionRecommendation => {
    // Handle missing data
    if (!currentDivision || fitScore === null || fitScore === undefined) {
      return {
        shouldConsiderOtherDivisions: false,
        recommendedDivisions: [],
        message: "",
      };
    }

    // Normalize division name
    const normalizedDivision = currentDivision.toUpperCase();

    // High fit scores don't need recommendations
    if (fitScore >= 70) {
      return {
        shouldConsiderOtherDivisions: false,
        recommendedDivisions: [],
        message: "",
      };
    }

    // Low fit scores (<50) warrant division recommendations
    if (fitScore < 50) {
      switch (normalizedDivision) {
        case "D1":
          return {
            shouldConsiderOtherDivisions: true,
            recommendedDivisions: ["D2", "D3"],
            message:
              "Based on your current profile, you might have stronger opportunities at D2 or D3 programs. Consider building your recruitment profile for these divisions as well.",
          };
        case "D2":
          return {
            shouldConsiderOtherDivisions: true,
            recommendedDivisions: ["D3", "NAIA"],
            message:
              "Based on your current profile, you might have stronger opportunities at D3 or NAIA programs. Consider broadening your college search to include these divisions.",
          };
        case "D3":
          return {
            shouldConsiderOtherDivisions: true,
            recommendedDivisions: ["NAIA"],
            message:
              "Consider also exploring NAIA programs which may be a better fit for your current profile.",
          };
        case "NAIA":
        case "JUCO":
          return {
            shouldConsiderOtherDivisions: false,
            recommendedDivisions: [],
            message: "",
          };
        default:
          return {
            shouldConsiderOtherDivisions: false,
            recommendedDivisions: [],
            message: "",
          };
      }
    }

    // Fit scores 50-69 (Reach schools) might benefit from additional options
    if (fitScore < 70) {
      switch (normalizedDivision) {
        case "D1":
          return {
            shouldConsiderOtherDivisions: true,
            recommendedDivisions: ["D2"],
            message:
              "While this is a solid reach school, consider adding D2 programs to your list for more realistic opportunities.",
          };
        case "D2":
          return {
            shouldConsiderOtherDivisions: true,
            recommendedDivisions: ["D3"],
            message:
              "While this is a solid reach school, consider adding D3 programs to your list for more realistic opportunities.",
          };
        default:
          return {
            shouldConsiderOtherDivisions: false,
            recommendedDivisions: [],
            message: "",
          };
      }
    }

    return {
      shouldConsiderOtherDivisions: false,
      recommendedDivisions: [],
      message: "",
    };
  };

  return { getRecommendedDivisions };
};
