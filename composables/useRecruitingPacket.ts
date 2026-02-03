/**
 * useRecruitingPacket Composable
 * Orchestrates recruiting packet generation, distribution, and management
 * Aggregates data from multiple sources and coordinates HTML generation
 */

import { ref, computed } from "vue";
import { useSupabase } from "./useSupabase";
import { useUserStore } from "~/stores/user";
import { useSchools } from "./useSchools";
import { useCoaches } from "./useCoaches";
import { useInteractions } from "./useInteractions";
import type {
  RecruitingPacketData,
  AthletePacketData,
  SchoolGroupedByPriority,
  SchoolPacketData,
  ActivitySummary,
} from "~/utils/recruitingPacketExport";
import {
  generateRecruitingPacketHTML,
  generatePacketFilename,
} from "~/utils/recruitingPacketExport";
import type { School } from "~/types/models";

interface PacketGenerationResult {
  html: string;
  filename: string;
  data: RecruitingPacketData;
}

export const useRecruitingPacket = () => {
  const supabase = useSupabase();
  const userStore = useUserStore();
  const { schools } = useSchools();
  const { coaches } = useCoaches();
  const { interactions } = useInteractions();

  // State
  const loading = ref(false);
  const error = ref<string | null>(null);
  const generatedHtml = ref<string | null>(null);
  const generatedData = ref<RecruitingPacketData | null>(null);
  const showEmailModal = ref(false);

  // Derived state
  const hasGeneratedPacket = computed(() => !!generatedHtml.value);

  /**
   * Fetch athlete profile data from Supabase
   */
  const fetchAthleteData = async (): Promise<AthletePacketData> => {
    if (!userStore.user) {
      throw new Error("No user logged in");
    }

    // Fetch extended athlete profile
    const profileResponse = await supabase
      .from("user_profiles")
      .select(
        `
        *,
        athletes:athlete_profiles(*)
      `,
      )
      .eq("user_id", userStore.user.id)
      .single();
    const { data: profile, error: profileError } = profileResponse as {
      data: Record<string, unknown> | null;
      error: any;
    };

    if (profileError) {
      console.warn("Profile not found, using basic user data");
    }

    const athleteData: AthletePacketData = {
      id: userStore.user.id,
      email: userStore.user.email,
      full_name: userStore.user.full_name || "Athlete",
      profile_photo_url: userStore.user.profile_photo_url,
      height: profile ? (profile.height as string) : undefined,
      weight: profile ? (profile.weight as number) : undefined,
      position: profile ? (profile.position as string) : undefined,
      high_school: profile ? (profile.high_school as string) : undefined,
      graduation_year: profile
        ? (profile.graduation_year as number)
        : undefined,
      gpa: profile ? (profile.gpa as number) : undefined,
      sat_score: profile ? (profile.sat_score as number) : undefined,
      act_score: profile ? (profile.act_score as number) : undefined,
      video_links: (profile?.video_links as string[]) || [],
      social_media: (profile?.social_media as Record<string, string>[]) || [],
      core_courses: (profile?.core_courses as string[]) || [],
    };

    return athleteData;
  };

  /**
   * Group schools by priority tier
   */
  const groupSchoolsByTier = (
    schoolList: School[],
  ): SchoolGroupedByPriority => {
    const grouped: SchoolGroupedByPriority = {
      tier_a: [],
      tier_b: [],
      tier_c: [],
    };

    schoolList.forEach((school) => {
      const packetData: SchoolPacketData = {
        ...school,
        coachCount: school.id ? countCoachesForSchool(school.id) : 0,
        interactionCount: school.id ? countInteractionsForSchool(school.id) : 0,
      };

      // Tier by status and other signals
      if (
        school.status === "official_visit_scheduled" ||
        school.status === "recruited" ||
        school.status === "offer_received" ||
        school.status === "committed"
      ) {
        grouped.tier_a.push(packetData);
      } else if (
        school.status === "official_visit_invited" ||
        school.status === "camp_invite"
      ) {
        grouped.tier_b.push(packetData);
      } else {
        grouped.tier_c.push(packetData);
      }
    });

    return grouped;
  };

  /**
   * Count coaches for a school
   */
  const countCoachesForSchool = (schoolId: string): number => {
    return coaches.value.filter((c) => c.school_id === schoolId).length;
  };

  /**
   * Count interactions for a school
   */
  const countInteractionsForSchool = (schoolId: string): number => {
    return interactions.value.filter((i) => i.school_id === schoolId).length;
  };

  /**
   * Calculate activity summary
   */
  const calculateActivitySummary = (): ActivitySummary => {
    const breakdown = {
      emails: interactions.value.filter((i) => i.type === "email").length,
      calls: interactions.value.filter((i) => i.type === "phone_call").length,
      camps: interactions.value.filter(
        (i) => i.type === "camp" || i.type === "showcase",
      ).length,
      visits: interactions.value.filter((i) => i.type.includes("visit")).length,
      other: interactions.value.filter(
        (i) =>
          ![
            "email",
            "phone_call",
            "camp",
            "showcase",
            "in_person_visit",
            "virtual_meeting",
          ].includes(i.type),
      ).length,
    };

    // Get most recent interaction
    let recentContact: Date | undefined;
    if (interactions.value.length > 0) {
      const sorted = [...interactions.value].sort(
        (a, b) =>
          new Date(b.occurred_at || 0).getTime() -
          new Date(a.occurred_at || 0).getTime(),
      );
      recentContact = new Date(sorted[0].occurred_at || new Date());
    }

    return {
      totalSchools: schools.value.length,
      totalInteractions: interactions.value.length,
      recentContact,
      interactionBreakdown: breakdown,
    };
  };

  /**
   * Aggregate all athlete data from multiple sources
   */
  const aggregateAthleteData = async (): Promise<RecruitingPacketData> => {
    // Fetch in parallel
    const [athleteData] = await Promise.all([fetchAthleteData()]);

    const groupedSchools = groupSchoolsByTier(schools.value);
    const activitySummary = calculateActivitySummary();

    return {
      athlete: athleteData,
      schools: groupedSchools,
      activitySummary,
    };
  };

  /**
   * Generate recruiting packet (main entry point)
   */
  const generatePacket = async (): Promise<PacketGenerationResult> => {
    loading.value = true;
    error.value = null;

    try {
      // Aggregate all data
      const packetData = await aggregateAthleteData();
      generatedData.value = packetData;

      // Generate HTML
      const html = generateRecruitingPacketHTML(packetData);
      generatedHtml.value = html;

      // Generate filename
      const filename = generatePacketFilename(
        packetData.athlete.full_name || "athlete",
      );

      return {
        html,
        filename,
        data: packetData,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to generate recruiting packet";
      error.value = message;
      console.error("Packet generation error:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Open packet in new window for preview and printing
   */
  const openPacketPreview = async (): Promise<void> => {
    try {
      if (!generatedHtml.value) {
        const result = await generatePacket();
        generatedHtml.value = result.html;
      }

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(generatedHtml.value);
        printWindow.document.close();
      } else {
        throw new Error("Failed to open preview window");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to open packet preview";
      error.value = message;
      console.error("Preview error:", err);
      throw err;
    }
  };

  /**
   * Trigger browser print dialog (for PDF download)
   */
  const downloadPacket = (): void => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  /**
   * Convert HTML to PDF blob (for email attachment)
   * Note: Server-side PDF generation is handled by the API endpoint
   */
  const convertHtmlToPdfBlob = async (): Promise<Blob> => {
    if (!generatedHtml.value) {
      throw new Error("No packet generated");
    }

    // Create blob from HTML string
    return new Blob([generatedHtml.value], { type: "text/html" });
  };

  /**
   * Convert HTML to base64 for email attachment
   */
  const getPacketAsBase64 = async (): Promise<string> => {
    if (!generatedHtml.value) {
      throw new Error("No packet generated");
    }

    try {
      // For now, return HTML as base64 (actual PDF conversion handled by server)
      return btoa(unescape(encodeURIComponent(generatedHtml.value)));
    } catch (err) {
      console.error("Base64 encoding error:", err);
      throw err;
    }
  };

  /**
   * Email packet to coaches
   */
  const emailPacket = async (emailData: {
    recipients: string[];
    subject: string;
    body: string;
  }): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      if (!generatedHtml.value || !generatedData.value) {
        await generatePacket();
      }

      // Convert to base64 for transmission
      const pdfBase64 = await getPacketAsBase64();
      const filename = generatePacketFilename(
        generatedData.value!.athlete.full_name || "athlete",
      );

      // Call API endpoint
      await $fetch("/api/recruiting-packet/email", {
        method: "POST",
        body: {
          recipients: emailData.recipients,
          subject: emailData.subject,
          body: emailData.body,
          htmlContent: generatedHtml.value,
          pdfBase64,
          athleteName: generatedData.value!.athlete.full_name,
          filename,
        },
      });

      showEmailModal.value = false;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to send email";
      error.value = message;
      console.error("Email error:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Get default email subject
   */
  const getDefaultEmailSubject = (): string => {
    const athleteName = generatedData.value?.athlete.full_name || "Athlete";
    return `${athleteName} - Recruiting Profile`;
  };

  /**
   * Get default email body
   */
  const getDefaultEmailBody = (): string => {
    const athleteName = generatedData.value?.athlete.full_name || "Athlete";
    const graduationYear =
      generatedData.value?.athlete.graduation_year || "N/A";
    const position = generatedData.value?.athlete.position || "Baseball Player";

    return `Dear Coach,

I hope this email finds you well. I am excited to share my recruiting profile with you as I explore collegiate baseball opportunities.

${athleteName} is a ${position} graduating in ${graduationYear}. The attached recruiting packet includes my athletic profile, academic information, schools of interest, and recent recruiting activity.

I am very interested in learning more about your program and would welcome the opportunity to discuss how I might contribute to your team.

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
${athleteName}`;
  };

  /**
   * Reset generated packet
   */
  const resetPacket = (): void => {
    generatedHtml.value = null;
    generatedData.value = null;
    error.value = null;
    showEmailModal.value = false;
  };

  return {
    // State
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    generatedHtml: computed(() => generatedHtml.value),
    generatedData: computed(() => generatedData.value),
    showEmailModal: computed(() => showEmailModal.value),
    hasGeneratedPacket: computed(() => hasGeneratedPacket.value),
    defaultEmailSubject: computed(() => getDefaultEmailSubject()),
    defaultEmailBody: computed(() => getDefaultEmailBody()),

    // Methods
    generatePacket,
    openPacketPreview,
    downloadPacket,
    emailPacket,
    resetPacket,
    convertHtmlToPdfBlob,
    aggregateAthleteData,

    // Toggles
    setShowEmailModal: (show: boolean) => {
      showEmailModal.value = show;
    },
  };
};
