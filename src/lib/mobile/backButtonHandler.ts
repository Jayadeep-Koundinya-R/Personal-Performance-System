/**
 * 📱 Hardware Back-Button Hierarchical Dismissal Engine
 *
 * Dismiss hierarchy per PPS Master Specification Task 5.1:
 * 1. If any modal is open (Triage, Slicer, Syllabus, Vayu Studio, Radix Dialog), close top modal.
 * 2. If in a sub-section (habits, analytics, settings, tracker, social, calendar, reflections), navigate back to 'dashboard'.
 * 3. If on root dashboard ('/dashboard' or '/'), minimize app via CapApp.minimizeApp().
 */

export type BackButtonAction =
  | { type: "close_modal"; targetModalId?: string }
  | { type: "navigate_dashboard" }
  | { type: "minimize_app" };

export interface BackButtonContext {
  hasOpenModal: boolean;
  activeModalId?: string;
  currentPath?: string; // e.g. "/dashboard", "/analytics", "/social", "/settings"
  pathname?: string; // alias for currentPath
  activeSection?: string; // e.g. "dashboard", "habits", "analytics", "settings", "social"
  canGoBack?: boolean;
}

export function handleHardwareBackDecision(ctx: BackButtonContext): BackButtonAction {
  // Level 1: Active Modal Dismissal
  if (ctx.hasOpenModal) {
    return { type: "close_modal", targetModalId: ctx.activeModalId };
  }

  // Normalize path & active section
  const path = (ctx.currentPath || ctx.pathname || "/").toLowerCase();
  const section = (ctx.activeSection || "dashboard").toLowerCase();

  // Level 2: Sub-section Navigation back to root dashboard
  // Check if routed to a sub-page
  const isRootRoute = path === "/" || path === "/dashboard" || path === "";
  if (!isRootRoute) {
    return { type: "navigate_dashboard" };
  }

  // Check if inside Dashboard but navigated to an internal section other than 'dashboard'
  if (section !== "dashboard" && section !== "") {
    return { type: "navigate_dashboard" };
  }

  // Level 3: Root Dashboard — Minimize Native App (never abruptly kill the process)
  return { type: "minimize_app" };
}
