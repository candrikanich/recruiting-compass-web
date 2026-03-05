import { describe, it, expect } from 'vitest';
import { getSchoolLogo } from '~/utils/school-logo';

describe('getSchoolLogo', () => {
  it('should return Clearbit URL for a valid website', () => {
    const logo = getSchoolLogo('Alabama', 'https://www.ua.edu');
    expect(logo).toBe('https://logo.clearbit.com/www.ua.edu?size=128&format=png');
  });

  it('should handle website without protocol', () => {
    const logo = getSchoolLogo('Alabama', 'www.ua.edu');
    expect(logo).toBe('https://logo.clearbit.com/www.ua.edu?size=128&format=png');
  });

  it('should handle website with trailing slash', () => {
    const logo = getSchoolLogo('Alabama', 'https://www.ua.edu/');
    expect(logo).toBe('https://logo.clearbit.com/www.ua.edu?size=128&format=png');
  });

  it('should fallback to UI Avatars if no website is provided', () => {
    const logo = getSchoolLogo('University of Alabama');
    expect(logo).toContain('ui-avatars.com/api/?name=University%20of%20Alabama');
  });

  it('should return empty string if no school name is provided', () => {
    const logo = getSchoolLogo('');
    expect(logo).toBe('');
  });

  it('should handle complex domains with paths', () => {
    const logo = getSchoolLogo('Test', 'https://sub.domain.com/path/to/page');
    expect(logo).toBe('https://logo.clearbit.com/sub.domain.com?size=128&format=png');
  });
});
