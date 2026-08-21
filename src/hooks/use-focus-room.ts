import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { ambientAudio, AmbienceType } from "@/lib/audio/ambientSynthesizer";
import { toast } from "sonner";

export interface FocusParticipant {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  role: string;
  cameraOn: boolean;
  isMuted: boolean;
  isSharingScreen: boolean;
  currentTask: string;
  streak: number;
  joinedAt: string;
}

export type PomodoroMode = "work" | "break";

const WORK_DURATION = 25 * 60; // 25 mins (1500 sec)
const BREAK_DURATION = 5 * 60; // 5 mins (300 sec)

function groupSessionCacheKey(groupId: string) {
  return `pps_group_focus_session_${groupId}`;
}

export function useFocusRoom(groupId: string, groupName: string) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const isGuestUser = !user?.id || user?.id === "guest_local" || user?.id.startsWith("guest");

  const [isInRoom, setIsInRoom] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [currentTask, setCurrentTask] = useState("Deep Work & Revision");

  // Web Streams (media mock/stub in stage 2)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Real Presence Participants
  const [participants, setParticipants] = useState<FocusParticipant[]>([]);
  const presenceChannelRef = useRef<any>(null);

  // Synced Group Pomodoro State
  const [pomodoroMode, setPomodoroMode] = useState<PomodoroMode>("work");
  const [timeLeft, setTimeLeft] = useState<number>(WORK_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [targetEndAt, setTargetEndAt] = useState<string | null>(null);
  const [startedByName, setStartedByName] = useState<string>("Squad Member");
  const [completedCycles, setCompletedCycles] = useState(0);

  // Ambient Soundscape
  const [ambience, setAmbience] = useState<AmbienceType>("none");
  const [ambienceVolume, setAmbienceVolume] = useState(0.4);

  // Room Privacy
  const [isRoomLocked, setIsRoomLocked] = useState(false);

  // ── 1. Calculate Real Remaining Time From Epoch Timestamps ──
  const calculateRemaining = useCallback((endAtIso: string | null, pausedSec?: number | null, isRunning?: boolean) => {
    if (!isRunning) {
      return typeof pausedSec === "number" ? Math.max(0, pausedSec) : WORK_DURATION;
    }
    if (!endAtIso) return WORK_DURATION;

    const endMs = new Date(endAtIso).getTime();
    const nowMs = Date.now();
    const remainingSec = Math.max(0, Math.ceil((endMs - nowMs) / 1000));
    return remainingSec;
  }, []);

  // ── 2. Load Group Focus Session from Cloud / Cache ──
  const loadGroupSession = useCallback(async () => {
    if (!groupId) return;

    // Fast initial render from cache
    try {
      const cached = localStorage.getItem(groupSessionCacheKey(groupId));
      if (cached) {
        const parsed = JSON.parse(cached);
        setPomodoroMode(parsed.mode || "work");
        setIsTimerRunning(Boolean(parsed.is_running));
        setTargetEndAt(parsed.target_end_at || null);
        setStartedByName(parsed.started_by_name || "Squad Member");
        const remaining = calculateRemaining(parsed.target_end_at, parsed.paused_remaining_sec, parsed.is_running);
        setTimeLeft(remaining);
      }
    } catch {}

    if (isGuestUser) return;

    try {
      const { data, error } = await supabase
        .from("group_focus_sessions")
        .select("*")
        .eq("group_id", groupId)
        .maybeSingle();

      if (error) {
        console.warn("Error fetching group focus session:", error);
        return;
      }

      if (data) {
        setPomodoroMode(data.mode as PomodoroMode || "work");
        setIsTimerRunning(Boolean(data.is_running));
        setTargetEndAt(data.target_end_at || null);
        setStartedByName(data.started_by_name || "Squad Member");
        const remaining = calculateRemaining(data.target_end_at, data.paused_remaining_sec, data.is_running);
        setTimeLeft(remaining);

        try {
          localStorage.setItem(groupSessionCacheKey(groupId), JSON.stringify(data));
        } catch {}
      }
    } catch (err) {
      console.warn("Failed to load group session:", err);
    }
  }, [groupId, isGuestUser, calculateRemaining]);

  // Initial load
  useEffect(() => {
    loadGroupSession();
  }, [loadGroupSession]);

  // ── 3. Realtime Subscription for Group Pomodoro Live Sync ──
  useEffect(() => {
    if (!groupId || isGuestUser) return;

    const channelName = `group-timer-realtime-${groupId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const timerChannel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_focus_sessions",
          filter: `group_id=eq.${groupId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;

          setPomodoroMode((row.mode as PomodoroMode) || "work");
          setIsTimerRunning(Boolean(row.is_running));
          setTargetEndAt(row.target_end_at || null);
          setStartedByName(row.started_by_name || "Squad Member");

          const remaining = calculateRemaining(row.target_end_at, row.paused_remaining_sec, row.is_running);
          setTimeLeft(remaining);

          try {
            localStorage.setItem(groupSessionCacheKey(groupId), JSON.stringify(row));
          } catch {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(timerChannel);
    };
  }, [groupId, isGuestUser, calculateRemaining]);

  // ── 4. High-Precision Local Ticker with Zero-Drift Recalculation ──
  useEffect(() => {
    let interval: any = null;

    if (isTimerRunning && targetEndAt) {
      // Immediate sync calculation
      const initialRemaining = calculateRemaining(targetEndAt, null, true);
      setTimeLeft(initialRemaining);

      interval = setInterval(() => {
        const remaining = calculateRemaining(targetEndAt, null, true);
        setTimeLeft(remaining);

        if (remaining <= 0) {
          clearInterval(interval);
          setIsTimerRunning(false);

          if (pomodoroMode === "work") {
            setPomodoroMode("break");
            setTimeLeft(BREAK_DURATION);
            setCompletedCycles((c) => c + 1);
            toast.success("🎉 Focus Sprint Complete! Take a 5-minute break. (+25 XP)", {
              description: `Great job studying together in ${groupName}!`,
            });
          } else {
            setPomodoroMode("work");
            setTimeLeft(WORK_DURATION);
            toast.info("Break ended! Ready for the next Group Focus Sprint. 🎯");
          }
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, targetEndAt, pomodoroMode, groupName, calculateRemaining]);

  // ── 5. Real Presence Tracking (No Fake Participants) ──
  const setupPresence = useCallback(() => {
    if (!groupId) return;

    // Clean up any stale channel for this topic first
    try {
      const existing = supabase.getChannels().filter((c) => c.topic === `realtime:group-presence-${groupId}`);
      existing.forEach((c) => supabase.removeChannel(c));
    } catch {}

    const myUserId = user?.id || `guest_${Date.now()}`;
    const myName = profile?.displayName || "You";
    const myAvatar = profile?.avatarEmoji || "🌟";

    const channel = supabase.channel(`group-presence-${groupId}`, {
      config: {
        presence: {
          key: myUserId,
        },
      },
    });

    presenceChannelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const livePeers: FocusParticipant[] = [];

        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            const p = presences[0];
            const isSelf = p.userId === myUserId;
            livePeers.push({
              id: `presence_${p.userId}`,
              userId: p.userId,
              name: isSelf ? `${p.name} (You)` : p.name,
              avatar: p.avatar || "👤",
              role: p.role || "member",
              cameraOn: Boolean(p.cameraOn),
              isMuted: Boolean(p.isMuted),
              isSharingScreen: Boolean(p.isSharingScreen),
              currentTask: p.currentTask || "Focus Sprint",
              streak: p.streak || 1,
              joinedAt: p.joinedAt || new Date().toISOString(),
            });
          }
        });

        // Ensure current user is always included if in room
        if (livePeers.length > 0) {
          setParticipants(livePeers);
        } else {
          setParticipants([
            {
              id: `p_you_${Date.now()}`,
              userId: myUserId,
              name: `${myName} (You)`,
              avatar: myAvatar,
              role: "Host",
              cameraOn: isCameraOn,
              isMuted: isMuted,
              isSharingScreen: isSharingScreen,
              currentTask,
              streak: profile?.streak || 1,
              joinedAt: new Date().toISOString(),
            },
          ]);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: myUserId,
            name: myName,
            avatar: myAvatar,
            role: "member",
            cameraOn: isCameraOn,
            isMuted: isMuted,
            isSharingScreen: isSharingScreen,
            currentTask,
            streak: profile?.streak || 1,
            joinedAt: new Date().toISOString(),
          });
        }
      });
  }, [groupId, user, profile, isCameraOn, isMuted, isSharingScreen, currentTask]);

  // Join Room
  const joinRoom = useCallback(async () => {
    setIsInRoom(true);
    const myUserId = user?.id || "local_user";
    const myName = profile?.displayName || "You";
    const myAvatar = profile?.avatarEmoji || "🌟";

    const you: FocusParticipant = {
      id: `p_you_${Date.now()}`,
      userId: myUserId,
      name: `${myName} (You)`,
      avatar: myAvatar,
      role: "Host",
      cameraOn: isCameraOn,
      isMuted: isMuted,
      isSharingScreen: false,
      currentTask,
      streak: profile?.streak || 1,
      joinedAt: new Date().toISOString(),
    };

    // Set genuine participant list (ONLY real user, zero fake participants)
    setParticipants([you]);

    // Setup Supabase Realtime Presence
    setupPresence();

    // Mark studying in group_members table
    if (!isGuestUser && user?.id && groupId) {
      try {
        await supabase
          .from("group_members")
          .update({ is_studying: true })
          .eq("group_id", groupId)
          .eq("user_id", user.id);
      } catch {}
    }

    toast.success(`Joined ${groupName} Focus Room! 🎯`, {
      description: "Live presence active. Start a synced group Pomodoro sprint with your squad.",
    });
  }, [user, profile, isCameraOn, isMuted, currentTask, groupName, setupPresence, isGuestUser, groupId]);

  // Leave Room
  const leaveRoom = useCallback(async () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
    }
    ambientAudio.stop();
    setAmbience("none");
    setIsInRoom(false);
    setIsCameraOn(false);
    setIsSharingScreen(false);
    setParticipants([]);

    // Untrack presence
    if (presenceChannelRef.current) {
      try {
        presenceChannelRef.current.untrack();
        supabase.removeChannel(presenceChannelRef.current);
      } catch {}
      presenceChannelRef.current = null;
    }

    // Mark is_studying = false in group_members table
    if (!isGuestUser && user?.id && groupId) {
      try {
        await supabase
          .from("group_members")
          .update({ is_studying: false })
          .eq("group_id", groupId)
          .eq("user_id", user.id);
      } catch {}
    }

    toast.info("Left the Focus Room.");
  }, [localStream, screenStream, isGuestUser, user, groupId]);

  // Camera Toggle
  const toggleCamera = useCallback(async () => {
    if (isCameraOn) {
      if (localStream) {
        localStream.getVideoTracks().forEach((t) => t.stop());
      }
      setIsCameraOn(false);
      setParticipants((prev) =>
        prev.map((p) => (p.name.includes("(You)") ? { ...p, cameraOn: false } : p))
      );
      if (presenceChannelRef.current) {
        presenceChannelRef.current.track({ cameraOn: false });
      }
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: !isMuted });
          setLocalStream(stream);
          setIsCameraOn(true);
          setParticipants((prev) =>
            prev.map((p) => (p.name.includes("(You)") ? { ...p, cameraOn: true } : p))
          );
          if (presenceChannelRef.current) {
            presenceChannelRef.current.track({ cameraOn: true });
          }
          toast.success("Camera enabled 🎥");
        } else {
          setIsCameraOn(true);
          toast.info("Camera simulation mode active (privacy avatar feed)");
        }
      } catch {
        setIsCameraOn(true);
        toast.info("Camera active in avatar privacy mode");
      }
    }
  }, [isCameraOn, localStream, isMuted]);

  // Mic Toggle
  const toggleMic = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = !next));
    }
    setParticipants((prev) =>
      prev.map((p) => (p.name.includes("(You)") ? { ...p, isMuted: next } : p))
    );
    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({ isMuted: next });
    }
    toast.info(next ? "Microphone muted 🔇" : "Microphone active 🎙️");
  }, [isMuted, localStream]);

  // Screen Share Toggle
  const toggleScreenShare = useCallback(async () => {
    if (isSharingScreen) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setIsSharingScreen(false);
      setParticipants((prev) =>
        prev.map((p) => (p.name.includes("(You)") ? { ...p, isSharingScreen: false } : p))
      );
      if (presenceChannelRef.current) {
        presenceChannelRef.current.track({ isSharingScreen: false });
      }
      toast.info("Stopped sharing screen");
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          setScreenStream(stream);
          setIsSharingScreen(true);
          setParticipants((prev) =>
            prev.map((p) => (p.name.includes("(You)") ? { ...p, isSharingScreen: true } : p))
          );
          if (presenceChannelRef.current) {
            presenceChannelRef.current.track({ isSharingScreen: true });
          }
          toast.success("Screen sharing active 🖥️");

          stream.getVideoTracks()[0].onended = () => {
            setIsSharingScreen(false);
            setScreenStream(null);
            if (presenceChannelRef.current) {
              presenceChannelRef.current.track({ isSharingScreen: false });
            }
          };
        } else {
          setIsSharingScreen(true);
          toast.info("Screen share mode active");
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, [isSharingScreen, screenStream]);

  // Ambient Sound Handler
  const handleSetAmbience = useCallback((type: AmbienceType) => {
    setAmbience(type);
    ambientAudio.play(type);
    if (type !== "none") {
      toast.success(`Playing ${type.toUpperCase()} ambient study soundscape 🎧`);
    } else {
      toast.info("Ambience turned off");
    }
  }, []);

  const handleSetVolume = useCallback((val: number) => {
    setAmbienceVolume(val);
    ambientAudio.setVolume(val);
  }, []);

  // ── 6. Group Pomodoro Cloud Synchronization Actions ──
  const startPomodoro = useCallback(
    async (durationSec: number = WORK_DURATION, mode: PomodoroMode = "work", task: string = "Group Focus Sprint") => {
      const now = new Date();
      const endAt = new Date(now.getTime() + durationSec * 1000).toISOString();
      const userName = profile?.displayName || "Squad Member";

      setIsTimerRunning(true);
      setPomodoroMode(mode);
      setTimeLeft(durationSec);
      setTargetEndAt(endAt);
      setStartedByName(userName);

      const sessionPayload = {
        group_id: groupId,
        is_running: true,
        started_at: now.toISOString(),
        target_end_at: endAt,
        total_sec: durationSec,
        paused_remaining_sec: null,
        mode,
        task_name: task,
        started_by: user?.id || null,
        started_by_name: userName,
        last_updated: now.toISOString(),
      };

      try {
        localStorage.setItem(groupSessionCacheKey(groupId), JSON.stringify(sessionPayload));
      } catch {}

      if (!isGuestUser && groupId) {
        try {
          await supabase.from("group_focus_sessions").upsert(sessionPayload, { onConflict: "group_id" });
        } catch (err) {
          console.warn("Failed to sync group pomodoro start to cloud:", err);
        }
      }

      toast.success(`Squad Pomodoro Sprint Started! ⏱️ ${Math.floor(durationSec / 60)}:00`, {
        description: `Synced live for all members in ${groupName}.`,
      });
    },
    [groupId, groupName, user, profile, isGuestUser]
  );

  const pausePomodoro = useCallback(async () => {
    const currentRemaining = calculateRemaining(targetEndAt, timeLeft, isTimerRunning);
    setIsTimerRunning(false);
    setTimeLeft(currentRemaining);
    setTargetEndAt(null);

    const now = new Date();
    const sessionPayload = {
      group_id: groupId,
      is_running: false,
      started_at: null,
      target_end_at: null,
      total_sec: WORK_DURATION,
      paused_remaining_sec: currentRemaining,
      mode: pomodoroMode,
      task_name: currentTask,
      started_by: user?.id || null,
      started_by_name: profile?.displayName || "Squad Member",
      last_updated: now.toISOString(),
    };

    try {
      localStorage.setItem(groupSessionCacheKey(groupId), JSON.stringify(sessionPayload));
    } catch {}

    if (!isGuestUser && groupId) {
      try {
        await supabase.from("group_focus_sessions").upsert(sessionPayload, { onConflict: "group_id" });
      } catch (err) {
        console.warn("Failed to sync group pomodoro pause:", err);
      }
    }

    toast.info("Squad Pomodoro Paused ⏸️");
  }, [targetEndAt, timeLeft, isTimerRunning, calculateRemaining, groupId, pomodoroMode, currentTask, user, profile, isGuestUser]);

  const resetPomodoro = useCallback(
    async (durationSec: number = WORK_DURATION) => {
      setIsTimerRunning(false);
      setPomodoroMode("work");
      setTimeLeft(durationSec);
      setTargetEndAt(null);

      const now = new Date();
      const sessionPayload = {
        group_id: groupId,
        is_running: false,
        started_at: null,
        target_end_at: null,
        total_sec: durationSec,
        paused_remaining_sec: durationSec,
        mode: "work",
        task_name: currentTask,
        started_by: user?.id || null,
        started_by_name: profile?.displayName || "Squad Member",
        last_updated: now.toISOString(),
      };

      try {
        localStorage.setItem(groupSessionCacheKey(groupId), JSON.stringify(sessionPayload));
      } catch {}

      if (!isGuestUser && groupId) {
        try {
          await supabase.from("group_focus_sessions").upsert(sessionPayload, { onConflict: "group_id" });
        } catch (err) {
          console.warn("Failed to sync group pomodoro reset:", err);
        }
      }

      toast.info(`Squad Pomodoro Reset to ${Math.floor(durationSec / 60)}:00 🔄`);
    },
    [groupId, currentTask, user, profile, isGuestUser]
  );

  const updateCurrentTask = useCallback(
    (task: string) => {
      setCurrentTask(task);
      setParticipants((prev) =>
        prev.map((p) => (p.name.includes("(You)") ? { ...p, currentTask: task } : p))
      );
      if (presenceChannelRef.current) {
        presenceChannelRef.current.track({ currentTask: task });
      }
      toast.success(`Updated your room focus to: "${task}"`);
    },
    []
  );

  return {
    isInRoom,
    joinRoom,
    leaveRoom,
    participants,
    isCameraOn,
    toggleCamera,
    isMuted,
    toggleMic,
    isSharingScreen,
    toggleScreenShare,
    localStream,
    screenStream,
    currentTask,
    updateCurrentTask,
    // Group Pomodoro Synced State
    pomodoroMode,
    timeLeft,
    targetEndAt,
    isTimerRunning,
    startedByName,
    completedCycles,
    startPomodoro,
    pausePomodoro,
    resetPomodoro,
    // Ambience
    ambience,
    setAmbience: handleSetAmbience,
    ambienceVolume,
    setAmbienceVolume: handleSetVolume,
    // Room Controls
    isRoomLocked,
    toggleRoomLock: () => setIsRoomLocked((l) => !l),
  };
}
