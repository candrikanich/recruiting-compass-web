/**
 * School Logo Utility
 * Provides multi-tiered fallback logic for school logos
 */

/**
 * Get the best available logo for a school
 * @param schoolName - The name of the school
 * @param schoolUrl - The website of the school (e.g., 'www.alabama.edu')
 * @returns {string} - The URL of the logo image
 */
export const getSchoolLogo = (schoolName: string, schoolUrl?: string | null): string => {
  if (!schoolName) return '';

  // 1. Clearbit Logo API (Excellent for high-quality institutional logos)
  if (schoolUrl) {
    try {
      // Remove protocol and trailing slashes
      const domain = schoolUrl
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '')
        .split('/')[0]; // Just the host
      
      return `https://logo.clearbit.com/${domain}?size=128&format=png`;
    } catch {
      // Fallback
    }
  }

  // 3. Fallback to a nice UI-friendly placeholder (UI Avatars)
  const bgColor = '3b82f6'; // Recruiting Compass Blue
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(schoolName)}&background=${bgColor}&color=fff&size=128`;
};
