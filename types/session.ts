/**
 * Session management types and configuration
 */

export interface SessionPreferences {
  rememberMe: boolean;
  lastActivity: number;
  expiresAt: number;
}

export interface SessionTimeoutConfig {
  inactivityThresholdMs: number;
  warningBeforeLogoutMs: number;
  activityEvents: string[];
  activityThrottleMs: number;
}

export const DEFAULT_TIMEOUT_CONFIG: SessionTimeoutConfig = {
  inactivityThresholdMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  warningBeforeLogoutMs: 5 * 60 * 1000, // 5 minutes
  activityEvents: ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'],
  activityThrottleMs: 30 * 1000, // 30 seconds throttle
};
