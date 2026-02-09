/**
 * Social Media URL Handlers
 *
 * Utility functions for opening social media profiles and communication links.
 * Handles URL formatting, sanitization, and null safety.
 */

/**
 * Opens a Twitter profile in a new tab
 * @param handle - Twitter handle (with or without @)
 */
export const openTwitter = (handle: string | null | undefined): void => {
  if (!handle) return;

  const cleanHandle = handle.replace("@", "");
  window.open(`https://twitter.com/${cleanHandle}`, "_blank");
};

/**
 * Opens an Instagram profile in a new tab
 * @param handle - Instagram handle (with or without @)
 */
export const openInstagram = (handle: string | null | undefined): void => {
  if (!handle) return;

  const cleanHandle = handle.replace("@", "");
  window.open(`https://instagram.com/${cleanHandle}`, "_blank");
};

/**
 * Opens the default email client with the specified email address
 * @param email - Email address
 */
export const openEmail = (email: string | null | undefined): void => {
  if (!email) return;

  window.location.href = `mailto:${email}`;
};

/**
 * Opens the default SMS app with the specified phone number
 * @param phone - Phone number (any format)
 */
export const openSMS = (phone: string | null | undefined): void => {
  if (!phone) return;

  const cleanPhone = phone.replace(/\D/g, "");
  window.location.href = `sms:${cleanPhone}`;
};
