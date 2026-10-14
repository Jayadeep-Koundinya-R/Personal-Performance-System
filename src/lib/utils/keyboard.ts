/**
 * ⌨️ Global Keyboard Accessibility & Conflict Prevention Utilities
 *
 * Rule:
 * Space and single-letter hotkeys must NOT fire when:
 * 1. Focus is in an input, textarea, select, or button (or contenteditable)
 * 2. Any modal / dialog is currently open in the DOM
 */

export function isKeyboardTargetInteractive(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || tag === "button") {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  if (
    target.closest("button") ||
    target.closest("input") ||
    target.closest("textarea") ||
    target.closest("select") ||
    target.closest('[role="button"]')
  ) {
    return true;
  }
  return false;
}

export function isModalOpen(): boolean {
  if (typeof document === "undefined") return false;
  const dialog = document.querySelector(
    '[role="dialog"], [role="alertdialog"], [data-radix-portal] [role="dialog"], .modal-open'
  );
  return Boolean(dialog);
}

export function canFireGlobalShortcut(e: KeyboardEvent): boolean {
  if (isKeyboardTargetInteractive(e.target)) return false;
  if (isModalOpen()) return false;
  return true;
}
