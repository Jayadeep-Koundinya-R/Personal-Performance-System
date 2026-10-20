/**
 * 📡 Live Co-Work Squad Radar & Peer Presence Resolver
 *
 * Implements PPS Master Specification Task 5.3 & Zero Mock Policy:
 * Resolves active peer presence into radar pill status, counts, and
 * honest empty states ("Radar Quiet — Start a sprint to signal your squad").
 */

export interface PeerPresence {
  id?: string;
  userId?: string;
  name?: string;
  displayName?: string;
  avatar?: string;
  avatarEmoji?: string;
  status?: "sprinting" | "online" | "idle";
  isStudying?: boolean;
  currentTask?: string;
  streak?: number;
  onlineAt?: string;
  groupId?: string;
  groupName?: string;
  lastActive?: number;
}

export interface PresenceSummary {
  onlineCount: number;
  studyingCount: number;
  sprintingCount: number;
  activeCount: number;
  isQuiet: boolean;
  status: "active" | "quiet";
  statusText: string;
  pillLabel: string;
  pillSubtext: string;
  badgeColor: string;
  emptyStateMessage: string;
  activePeers: PeerPresence[];
}

export function resolvePresenceState(
  peers: PeerPresence[] = [],
  currentUserId?: string
): PresenceSummary {
  // Exclude current user from remote peer count to give genuine squad telemetry
  const remotePeers = peers.filter((p) => {
    if (!p) return false;
    const uid = p.userId || p.id;
    return Boolean(uid && uid !== currentUserId);
  });

  const studyingPeers = remotePeers.filter(
    (p) => p.isStudying === true || p.status === "sprinting"
  );
  const sprintingCount = studyingPeers.length;
  const onlineCount = remotePeers.filter(
    (p) => p.status === "online" || (!p.isStudying && p.status !== "sprinting")
  ).length;
  const activeCount = remotePeers.length;
  const isQuiet = activeCount === 0;

  // State A: One or more peers are actively in a focus sprint
  if (sprintingCount > 0) {
    return {
      onlineCount,
      studyingCount: sprintingCount,
      sprintingCount,
      activeCount,
      isQuiet: false,
      status: "active",
      statusText: `🟢 ${sprintingCount} Sprinting Now`,
      pillLabel: `🟢 ${sprintingCount} Sprinting`,
      pillSubtext: `${sprintingCount} squad member${sprintingCount > 1 ? "s" : ""} in focus sprint`,
      badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      emptyStateMessage: "",
      activePeers: remotePeers,
    };
  }

  // State B: One or more peers are online/active in the squad (not in a sprint)
  if (activeCount > 0) {
    return {
      onlineCount: activeCount,
      studyingCount: 0,
      sprintingCount: 0,
      activeCount,
      isQuiet: false,
      status: "active",
      statusText: `🟡 ${activeCount} Online`,
      pillLabel: `🟡 ${activeCount} Online`,
      pillSubtext: `${activeCount} squad member${activeCount > 1 ? "s" : ""} online`,
      badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      emptyStateMessage: "",
      activePeers: remotePeers,
    };
  }

  // State C: Zero Mock Honest Empty State (No peers online)
  return {
    onlineCount: 0,
    studyingCount: 0,
    sprintingCount: 0,
    activeCount: 0,
    isQuiet: true,
    status: "quiet",
    statusText: "Radar Quiet — Start a sprint to signal your squad",
    pillLabel: "Squad Radar",
    pillSubtext: "Radar Quiet",
    badgeColor: "bg-surface/70 text-muted-foreground border-border/80",
    emptyStateMessage: "Radar Quiet — Start a sprint to signal your squad",
    activePeers: [],
  };
}
