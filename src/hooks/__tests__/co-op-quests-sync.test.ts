import { describe, it, expect, beforeEach } from "vitest";

export interface QuestParticipant {
  name: string;
  avatar: string;
  contributedXP: number;
}

export interface CoOpQuest {
  id: string;
  title: string;
  description: string;
  category: string;
  targetProgress: number;
  currentProgress: number;
  unit: string;
  rewardXP: number;
  rewardBadge: string;
  status: "active" | "completed";
  participants: QuestParticipant[];
}

export class SimulatedQuestManager {
  public quests: CoOpQuest[];

  constructor(initialQuests: CoOpQuest[]) {
    this.quests = JSON.parse(JSON.stringify(initialQuests));
  }

  // User A performs a habit completion that contributes to a shared squad quest
  public contributeToQuest(
    questId: string,
    delta: number,
    participant: QuestParticipant,
    emitBroadcast?: (event: string, payload: any) => void
  ) {
    this.applyQuestUpdate(questId, delta, participant);

    if (emitBroadcast) {
      emitBroadcast("squad_quest_update", {
        questId,
        delta,
        participant,
      });
    }
  }

  // Receive and apply broadcast from squad peer
  public applyQuestUpdate(questId: string, delta: number, participant: QuestParticipant) {
    this.quests = this.quests.map((q) => {
      if (q.id !== questId) return q;

      const newProgress = Math.min(q.targetProgress, q.currentProgress + delta);
      const isComplete = newProgress >= q.targetProgress;

      // Update or add participant
      const existingIdx = q.participants.findIndex((p) => p.name === participant.name);
      let updatedParticipants = [...q.participants];

      if (existingIdx >= 0) {
        updatedParticipants[existingIdx] = {
          ...updatedParticipants[existingIdx],
          contributedXP: updatedParticipants[existingIdx].contributedXP + participant.contributedXP,
        };
      } else {
        updatedParticipants.push(participant);
      }

      return {
        ...q,
        currentProgress: newProgress,
        status: isComplete ? "completed" : "active",
        participants: updatedParticipants,
      };
    });
  }
}

describe("Task 13 Multi-User Realtime Co-Op Quest Synchronization", () => {
  const sampleQuests: CoOpQuest[] = [
    {
      id: "quest_focus_marathon_100h",
      title: "100-Hour Deep Focus Marathon",
      description: "Log 100 collective hours of deep focus as a squad this week.",
      category: "Focus Sprints",
      targetProgress: 100,
      currentProgress: 20,
      unit: "hours",
      rewardXP: 500,
      rewardBadge: "🔥 Focus Marathoner",
      status: "active",
      participants: [{ name: "Alice (Host)", avatar: "👩‍💻", contributedXP: 20 }],
    },
    {
      id: "quest_flawless_habits",
      title: "Flawless Habit Streak",
      description: "Complete 50 collective daily habits without breaking streaks.",
      category: "Consistency",
      targetProgress: 50,
      currentProgress: 45,
      unit: "habits",
      rewardXP: 350,
      rewardBadge: "⚡ Unbreakable",
      status: "active",
      participants: [{ name: "Alice (Host)", avatar: "👩‍💻", contributedXP: 45 }],
    },
  ];

  let managerAlice: SimulatedQuestManager;
  let managerBob: SimulatedQuestManager;

  beforeEach(() => {
    managerAlice = new SimulatedQuestManager(sampleQuests);
    managerBob = new SimulatedQuestManager(sampleQuests);
  });

  it("13.1: User B logs focus sprint and User A receives real-time progress update", () => {
    // Broadcast pipeline from Bob to Alice
    const peerBroadcaster = (event: string, payload: any) => {
      if (event === "squad_quest_update") {
        managerAlice.applyQuestUpdate(payload.questId, payload.delta, payload.participant);
      }
    };

    // Bob contributes 10 focus hours
    managerBob.contributeToQuest(
      "quest_focus_marathon_100h",
      10,
      { name: "Bob (Peer)", avatar: "👨‍🎓", contributedXP: 10 },
      peerBroadcaster
    );

    // Verify Bob's state
    const bobQuest = managerBob.quests.find((q) => q.id === "quest_focus_marathon_100h")!;
    expect(bobQuest.currentProgress).toBe(30);
    expect(bobQuest.participants.length).toBe(2);

    // Verify Alice's state synced in real time
    const aliceQuest = managerAlice.quests.find((q) => q.id === "quest_focus_marathon_100h")!;
    expect(aliceQuest.currentProgress).toBe(30);
    expect(aliceQuest.participants.some((p) => p.name === "Bob (Peer)")).toBe(true);
    expect(aliceQuest.status).toBe("active");
  });

  it("13.2: Concurrent contributions trigger quest completion and reward state", () => {
    const peerBroadcasterToAlice = (event: string, payload: any) => {
      if (event === "squad_quest_update") {
        managerAlice.applyQuestUpdate(payload.questId, payload.delta, payload.participant);
      }
    };

    // Flawless habit quest is at 45/50. Bob logs 5 habits to finish it.
    managerBob.contributeToQuest(
      "quest_flawless_habits",
      5,
      { name: "Bob (Peer)", avatar: "👨‍🎓", contributedXP: 5 },
      peerBroadcasterToAlice
    );

    const bobQuest = managerBob.quests.find((q) => q.id === "quest_flawless_habits")!;
    const aliceQuest = managerAlice.quests.find((q) => q.id === "quest_flawless_habits")!;

    expect(bobQuest.currentProgress).toBe(50);
    expect(bobQuest.status).toBe("completed");

    expect(aliceQuest.currentProgress).toBe(50);
    expect(aliceQuest.status).toBe("completed");
  });
});
