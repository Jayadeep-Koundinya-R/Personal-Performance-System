/**
 * 📲 WhatsApp Study Buddy Viral Invite Generator
 *
 * Implements PPS Master Specification Task 5.2:
 * Generates viral WhatsApp invite deep-links (`whatsapp://send?text=...`)
 * using the 6-character squad invite engine.
 */

export interface WhatsAppInviteOptions {
  squadName: string;
  squadCode: string; // 6-character squad code, e.g. "AGNI88"
  senderName?: string;
  studyTopic?: string;
  targetRoleOrGoal?: string;
  appUrl?: string;
  customMessage?: string;
}

/**
 * Builds the viral copy text for WhatsApp sharing.
 */
export function buildWhatsAppInviteMessage(options: WhatsAppInviteOptions): string {
  const code = options.squadCode.trim().toUpperCase();
  const name = options.squadName.trim() || "Mastery & Focus Squad";
  const topic = options.studyTopic?.trim() || options.targetRoleOrGoal?.trim() || "Deep Work & Habit Mastery";
  const sender = options.senderName?.trim() ? `${options.senderName.trim()} invited you to join` : "Join my";
  const goalText = ` focused on *${topic}*`;

  let baseUrl = "https://pps.app";
  if (typeof window !== "undefined" && window.location?.origin) {
    baseUrl = `${window.location.origin}${window.location.pathname}`;
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
  }
  const joinUrl = options.appUrl || `${baseUrl}/#/squads?join=${code}`;

  if (options.customMessage) {
    return `${options.customMessage.trim()}\n\n🔑 *Squad Code:* ${code}\n🚀 *Join here:* ${joinUrl}`;
  }

  return (
    `⚡ *Join my Study Squad on PPS!* ⚡\n\n` +
    `Hey! ${sender} the *"${name}"* squad${goalText}.\n\n` +
    `Let's co-work with synchronized Pomodoros, maintain daily focus streaks, and hit our goals together!\n\n` +
    `🔑 *Squad Code:* *${code}*\n` +
    `🚀 *1-Tap Join:* ${joinUrl}`
  );
}

/**
 * Generates native whatsapp:// URI for direct intent launch in Android/iOS apps.
 */
export function buildWhatsAppInviteUrl(options: WhatsAppInviteOptions): string {
  const message = buildWhatsAppInviteMessage(options);
  return `whatsapp://send?text=${encodeURIComponent(message)}`;
}

/**
 * Generates universal web https://api.whatsapp.com URL fallback for desktop/web.
 */
export function buildWebWhatsAppInviteUrl(options: WhatsAppInviteOptions): string {
  const message = buildWhatsAppInviteMessage(options);
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

/**
 * Executes 1-tap share with mobile-native intent priority and web fallback.
 */
export function shareViaWhatsApp(options: WhatsAppInviteOptions): { launched: boolean; url: string } {
  const nativeUrl = buildWhatsAppInviteUrl(options);
  const webUrl = buildWebWhatsAppInviteUrl(options);

  if (typeof window === "undefined") {
    return { launched: false, url: nativeUrl };
  }

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    // Attempt native protocol launch on mobile devices
    window.location.href = nativeUrl;
    return { launched: true, url: nativeUrl };
  } else {
    // Open WhatsApp Web in new tab on desktop
    window.open(webUrl, "_blank", "noopener,noreferrer");
    return { launched: true, url: webUrl };
  }
}
