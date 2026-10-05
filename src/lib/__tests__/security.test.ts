import { describe, it, expect } from "vitest";
import { sanitizeInput, sanitizeObject, escapeHtml, appRateLimiter } from "../security";

describe("PPS Security Fortification & Sanitization Engine", () => {
  it("escapes dangerous HTML characters cleanly", () => {
    const raw = '<script>alert("hacked")</script>';
    const escaped = escapeHtml(raw);
    expect(escaped).not.toContain("<script>");
    expect(escaped).toContain("&lt;script&gt;");
  });

  it("strips active script tags, iframes, and javascript: pseudo-protocols", () => {
    const maliciousInput = '<script>alert(1)</script><iframe src="evil.com"></iframe>javascript:malicious()Hello';
    const cleaned = sanitizeInput(maliciousInput);

    expect(cleaned).not.toContain("<script");
    expect(cleaned).not.toContain("<iframe");
    expect(cleaned).not.toContain("javascript:");
    expect(cleaned).toContain("Hello");
  });

  it("strips inline event handlers like onerror and onload", () => {
    const maliciousImg = '<img src=x onerror="alert(1)">';
    const cleaned = sanitizeInput(maliciousImg);

    expect(cleaned).not.toContain("onerror");
  });

  it("deeply sanitizes complex objects and arrays before Supabase persistence", () => {
    const payload = {
      title: 'Workout <script>steal()</script>',
      nested: {
        description: 'Run 5km <iframe src="phish.com"></iframe>',
        tags: ['health', '<script>bad()</script>'],
      },
    };

    const sanitized = sanitizeObject(payload);
    expect(sanitized.title).not.toContain("<script>");
    expect(sanitized.nested.description).not.toContain("<iframe");
    expect(sanitized.nested.tags[1]).not.toContain("<script>");
  });

  it("enforces token-bucket rate limiting against flooding", () => {
    const bucketKey = "test_flood_protection";
    appRateLimiter.reset(bucketKey);

    // Allow first 3 requests in a 10s window
    expect(appRateLimiter.checkLimit(bucketKey, 3, 10000)).toBe(true);
    expect(appRateLimiter.checkLimit(bucketKey, 3, 10000)).toBe(true);
    expect(appRateLimiter.checkLimit(bucketKey, 3, 10000)).toBe(true);

    // 4th request should be denied
    expect(appRateLimiter.checkLimit(bucketKey, 3, 10000)).toBe(false);

    // Reset bucket
    appRateLimiter.reset(bucketKey);
    expect(appRateLimiter.checkLimit(bucketKey, 3, 10000)).toBe(true);
  });
});
