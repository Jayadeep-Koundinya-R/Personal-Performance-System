/**
 * 📊 Privacy-Preserving Production Telemetry Logger (v1.0 GA Scaffold)
 *
 * Tracks high-level product milestones with strict zero-PII policies.
 * Sensitive fields (email, names, passwords, cards, tokens) are stripped before storage or transmission.
 */

export type TelemetryEventName =
  | "habit_completed"
  | "sprint_finished"
  | "vayu_rebalanced"
  | "checkout_initiated"
  | string;

export interface TelemetryEvent {
  id: string;
  name: TelemetryEventName;
  timestamp: string;
  metadata: Record<string, any>;
}

const STORAGE_KEY = "pps_telemetry_events";
const MAX_STORED_EVENTS = 100;

// Sensitive keys to scrub to ensure zero PII leakage
const FORBIDDEN_KEYS = new Set([
  "email",
  "password",
  "name",
  "displayname",
  "phone",
  "token",
  "secret",
  "card",
  "cvv",
  "upi_id",
  "auth",
  "bearer",
]);

/**
 * Recursively sanitize metadata to remove personal identifiable information.
 */
export function sanitizeMetadata(data?: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== "object") return {};
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (FORBIDDEN_KEYS.has(lowerKey)) {
      continue;
    }

    if (typeof value === "string") {
      // Basic email regex pattern sanitization
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        continue;
      }
      cleaned[key] = value.slice(0, 150); // limit string length
    } else if (typeof value === "number" || typeof value === "boolean") {
      cleaned[key] = value;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      cleaned[key] = sanitizeMetadata(value);
    }
  }

  return cleaned;
}

/**
 * Retrieve stored telemetry events.
 */
export function getTelemetryEvents(): TelemetryEvent[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear stored telemetry events.
 */
export function clearTelemetryEvents(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Track a product event with zero PII leakage.
 */
export function trackEvent(
  name: TelemetryEventName,
  metadata?: Record<string, any>
): TelemetryEvent {
  const event: TelemetryEvent = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    timestamp: new Date().toISOString(),
    metadata: sanitizeMetadata(metadata),
  };

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const existing = getTelemetryEvents();
      existing.push(event);
      if (existing.length > MAX_STORED_EVENTS) {
        existing.splice(0, existing.length - MAX_STORED_EVENTS);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch (err) {
      console.warn("Telemetry storage warning:", err);
    }

    // Broadcast event for live in-app analytics or remote loggers
    window.dispatchEvent(
      new CustomEvent("pps_telemetry_event", { detail: event })
    );
  }

  return event;
}
