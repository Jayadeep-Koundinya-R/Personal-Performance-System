import { useEffect } from "react";
import { isNativeMobile } from "@/lib/native-notifications";

interface Metric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function PerformanceMonitor() {
  useEffect(() => {
    // Skip web-vitals on native mobile — PerformanceObserver may not be
    // fully supported in Android WebViews and can throw uncaught errors.
    if (isNativeMobile()) return;

    const logMetric = (metric: Metric) => {
      console.log(`[Performance] ${metric.name}:`, {
        value: metric.value,
        rating: metric.rating,
      });

      if (import.meta.env.PROD && window.gtag) {
        window.gtag("event", metric.name, {
          event_category: "Web Vitals",
          value: metric.value,
          custom_map: { metric_rating: metric.rating },
        });
      }
    };

    try {
      import("web-vitals").then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
        onLCP(logMetric);
        onINP(logMetric);
        onCLS(logMetric);
        onFCP(logMetric);
        onTTFB(logMetric);
      }).catch(() => {
        // Silently ignore — web-vitals not critical
      });
    } catch {
      // Silently ignore
    }
  }, []);

  return null;
}

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint (ms)
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
};
