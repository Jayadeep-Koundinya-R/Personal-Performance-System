/**
 * 🚩 Central Feature Flags Configuration
 * 
 * Controls module visibility for phased rollouts.
 * Unreleased or beta infrastructure is hidden from beta users to ensure
 * a rock-solid, zero-distraction experience during Sprint 1.
 */
export const FEATURE_FLAGS = {
  ENABLE_VIDEO_ROOMS: false,
  ENABLE_WHITEBOARD: false,
  ENABLE_TEACHER_MARKETPLACE: false,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
