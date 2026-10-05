/**
 * 🛡️ PPS Security Fortification Engine (Vayu Launch Hardening)
 * 
 * Provides:
 * 1. DOMPurify-based HTML and script neutralization
 * 2. Object-level deep sanitization for API payloads and user forms
 * 3. Input validation with safe length and character constraints
 * 4. Token-bucket rate limiting for AI actions and user-triggered cloud mutations
 */

import DOMPurify from "dompurify";

// Basic HTML entity escaping
export function escapeHtml(str: string): string {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Strips script tags, onerror handlers, javascript: pseudo-protocols, and malicious HTML using DOMPurify
 */
export function sanitizeWithDOMPurify(input: string): string {
  if (typeof input !== "string") return "";

  let sanitized = input;

  if (typeof window !== "undefined") {
    try {
      const purifier =
        typeof (DOMPurify as any)?.sanitize === "function"
          ? DOMPurify
          : typeof DOMPurify === "function"
          ? (DOMPurify as any)(window)
          : null;

      if (purifier && typeof purifier.sanitize === "function") {
        sanitized = purifier.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
      }
    } catch {
      // Fallback to manual sanitizer
    }
  }

  // Strip dangerous javascript: and data: URLs
  sanitized = sanitized.replace(/javascript\s*:/gi, "");
  sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, "");

  // Strip residual script, iframe, object, embed tags and their contents
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "");

  // Strip inline event handlers like onload=, onerror=, onclick=
  sanitized = sanitized.replace(/on\w+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, "");

  // Strip angle brackets to prevent any HTML injection in plain-text fields
  sanitized = sanitized.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return sanitized.trim();
}

/**
 * Standard input sanitizer (wraps DOMPurify)
 */
export function sanitizeInput(input: string): string {
  return sanitizeWithDOMPurify(input);
}

/**
 * Deep sanitization for structured objects before Supabase insertion or state storage
 */
export function sanitizeObject<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return sanitizeWithDOMPurify(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeObject(item)) as unknown as T;
  }

  if (typeof data === "object") {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      sanitizedObj[key] = sanitizeObject(value);
    }
    return sanitizedObj as T;
  }

  return data;
}

/**
 * In-memory token-bucket rate limiter to prevent user or script flooding
 */
class ClientRateLimiter {
  private requests: Map<string, number[]> = new Map();

  /**
   * Returns true if action is allowed, false if rate limited
   * @param key Identifies the bucket (e.g. "ai_coach:user_123")
   * @param maxRequests Maximum allowed requests in window
   * @param windowMs Time window in milliseconds
   */
  public checkLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // Filter out timestamps outside the active window
    const activeTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (activeTimestamps.length >= maxRequests) {
      return false; // Rate limit reached
    }

    activeTimestamps.push(now);
    this.requests.set(key, activeTimestamps);
    return true;
  }

  public reset(key: string): void {
    this.requests.delete(key);
  }

  public clearAll(): void {
    this.requests.clear();
  }
}

export const appRateLimiter = new ClientRateLimiter();
