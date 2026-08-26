import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import DailyIframe, { DailyCall, DailyParticipant } from "@daily-co/daily-js";
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(id?: string | null): boolean {
  return Boolean(id && UUID_REGEX.test(id));
}

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

  // Daily.co Video Calling State
  const dailyCallRef = useRef<DailyCall | null>(null);
  const [dailyRoomUrl, setDailyRoomUrl] = useState<string | null>(null);
  const [isDailyConnected, setIsDailyConnected] = useState(false);

  // Web Streams (Local & Real Remote Peer Streams)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [peerStreams, setPeerStreams] = useState<Record<string, MediaStream>>({});

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

    if (isGuestUser || !isValidUUID(groupId)) return;

    try {
      const { data, error } = await supabase
        .from("group_focus_sessions")
        .select("*")
        .eq("group_id", groupId)
        .maybeSingle();

      if (error) return;

      if (data) {
        setPomodoroMode((data.mode as PomodoroMode) || "work");
        setIsTimerRunning(Boolean(data.is_running));
        setTargetEndAt(data.target_end_at || null);
        setStartedByName(data.started_by_name || "Squad Member");
        const remaining = calculateRemaining(data.target_end_at, data.paused_remaining_sec, data.is_running);
        setTimeLeft(remaining);

        try {
          localStorage.setItem(groupSessionCacheKey(groupId), JSON.stringify(data));
        } catch {}
      }
    } catch {}
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
        (payload) => {
          const updated = payload.new as any;
          if (!updated) return;

          setPomodoroMode((updated.mode as PomodoroMode) || "work");
          setIsTimerRunning(Boolean(updated.is_running));
          setTargetEndAt(updated.target_end_at || null);
          setStartedByName(updated.started_by_name || "Squad Member");

          const remaining = calculateRemaining(updated.target_end_at, updated.paused_remaining_sec, updated.is_running);
          setTimeLeft(remaining);

          try {
            localStorage.setItem(groupSessionCacheKey(groupId), JSON.stringify(updated));
          } catch {}

          if (updated.is_running) {
            toast.info(`Synced Squad Pomodoro: ${updated.mode === "work" ? "Focus Sprint 🚀" : "Rest Break ☕"}`, {
              description: `Started by ${updated.started_by_name || "Squad Member"}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(timerChannel);
    };
  }, [groupId, isGuestUser, calculateRemaining]);

  // ── 4. Local Countdown Tick ──
  useEffect(() => {
    let interval: any = null;

    if (isTimerRunning) {
      interval = setInterval(() => {
        if (targetEndAt) {
          const remaining = calculateRemaining(targetEndAt, null, true);
          setTimeLeft(remaining);

          if (remaining <= 0) {
            setIsTimerRunning(false);
            if (pomodoroMode === "work") {
              setCompletedCycles((c) => c + 1);
              setPomodoroMode("break");
              setTimeLeft(BREAK_DURATION);
              toast.success("Focus Sprint Complete! 🎉 Take a 5-minute break.", {
                description: `Great job studying together in ${groupName}!`,
              });
            } else {
              setPomodoroMode("work");
              setTimeLeft(WORK_DURATION);
              toast.info("Break ended! Ready for the next Group Focus Sprint. 🎯");
            }
          }
        } else {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              setIsTimerRunning(false);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, targetEndAt, pomodoroMode, groupName, calculateRemaining]);

  // Stable Client Session ID to prevent duplicate presence tiles
  const effectiveUserId = useMemo(() => {
    if (user?.id) return user.id;
    let cached = localStorage.getItem("pps_stable_client_session_id");
    if (!cached) {
      cached = `guest_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("pps_stable_client_session_id", cached);
    }
    return cached;
  }, [user?.id]);

  // Helper: Build complete presence payload
  const getFullPresencePayload = useCallback(
    (overrides: Partial<FocusParticipant> = {}) => {
      const myUserId = effectiveUserId;
      const myName = (profile?.displayName || "You").replace(/\s*\(You\)$/i, "");
      const myAvatar = profile?.avatarEmoji || "🌟";

      return {
        userId: myUserId,
        name: myName,
        avatar: myAvatar,
        role: "member",
        cameraOn: overrides.cameraOn !== undefined ? overrides.cameraOn : isCameraOn,
        isMuted: overrides.isMuted !== undefined ? overrides.isMuted : isMuted,
        isSharingScreen: overrides.isSharingScreen !== undefined ? overrides.isSharingScreen : isSharingScreen,
        currentTask: overrides.currentTask !== undefined ? overrides.currentTask : currentTask,
        streak: profile?.streak || 1,
        joinedAt: new Date().toISOString(),
      };
    },
    [effectiveUserId, profile, isCameraOn, isMuted, isSharingScreen, currentTask]
  );

  // ── 5. Setup Supabase Presence Channel ──
  const setupPresence = useCallback(() => {
    if (!groupId) return;

    try {
      const existing = supabase.getChannels().filter((c) => c.topic === `realtime:group-presence-${groupId}`);
      existing.forEach((c) => supabase.removeChannel(c));
    } catch {}

    const myUserId = effectiveUserId;
    const myName = (profile?.displayName || "You").replace(/\s*\(You\)$/i, "");
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
            const rawPeersList: FocusParticipant[] = [];

            Object.keys(state).forEach((key) => {
              const presences = state[key] as any[];
              if (presences && presences.length > 0) {
                const p = presences[0];
                const pId = p.userId || key;
                const isSelf = pId === myUserId || key === myUserId;
                const cleanName = (p.name || "Squad Member").replace(/\s*\(You\)$/i, "");
                rawPeersList.push({
                  id: `presence_${pId}`,
                  userId: pId,
                  name: isSelf ? `${cleanName} (You)` : cleanName,
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

            // 100% Strict Deduplication
            const uniqueParticipants: FocusParticipant[] = [];
            let localUserAdded = false;

            rawPeersList.forEach((p) => {
              const isSelf = p.userId === myUserId || p.name.endsWith("(You)") || p.name === myName;
              if (isSelf) {
                if (!localUserAdded) {
                  localUserAdded = true;
                  uniqueParticipants.push({
                    ...p,
                    userId: myUserId,
                    name: `${myName} (You)`,
                    avatar: myAvatar,
                    cameraOn: isCameraOn,
                    isMuted: isMuted,
                  });
                }
              } else {
                if (!uniqueParticipants.some((existing) => existing.userId === p.userId)) {
                  uniqueParticipants.push(p);
                }
              }
            });

            if (!localUserAdded) {
              uniqueParticipants.unshift({
                id: `p_you_${myUserId}`,
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
              });
            }

            setParticipants(uniqueParticipants);
          })

      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          try {
            await channel.track(getFullPresencePayload());
          } catch {}
        }
      });
  }, [groupId, effectiveUserId, profile, isCameraOn, isMuted, isSharingScreen, currentTask, getFullPresencePayload]);


  // ── 6. Fetch / Create Daily.co Room URL ──
  const fetchDailyRoomUrl = useCallback(async (roomId: string, roomTitle: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("create-daily-room", {
        body: { roomId, roomName: roomTitle },
      });

      if (!error && data?.url) {
        return data.url;
      }

      // Check if user set VITE_DAILY_DOMAIN in .env
      const dailyDomain = (import.meta as any).env?.VITE_DAILY_DOMAIN;
      if (dailyDomain) {
        const cleanDomain = dailyDomain.replace(/\/$/, "");
        const sanitizedId = String(roomId).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 30);
        return `${cleanDomain}/pps-${sanitizedId}`;
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  // ── 7. Join Focus Room & Initialize Daily.co Managed Call Object ──
  const joinRoom = useCallback(async () => {
    setIsInRoom(true);
    const myUserId = effectiveUserId;
    const myName = (profile?.displayName || "You").replace(/\s*\(You\)$/i, "");
    const myAvatar = profile?.avatarEmoji || "🌟";

    const you: FocusParticipant = {
      id: `p_you_${myUserId}`,
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

    setParticipants([you]);
    setupPresence();


    // Mark studying in group_members table
    if (!isGuestUser && isValidUUID(user?.id) && isValidUUID(groupId)) {
      try {
        await supabase
          .from("group_members")
          .update({ is_studying: true })
          .eq("group_id", groupId)
          .eq("user_id", user!.id);
      } catch {}
    }

    // ── Daily.co Call Object Initialization ──
    try {
      const roomUrl = await fetchDailyRoomUrl(groupId, groupName);
      setDailyRoomUrl(roomUrl);

      if (roomUrl && typeof window !== "undefined") {
        const call = DailyIframe.createCallObject({
          videoSource: isCameraOn,
          audioSource: !isMuted,
          subscribeToTracksAutomatically: true,
        });

        dailyCallRef.current = call;

        // Process Participant Track Updates
        const handleParticipantUpdate = (p: DailyParticipant) => {
          if (!p) return;

          if (p.local) {
            const videoTrack = p.tracks?.video?.persistentTrack;
            const audioTrack = p.tracks?.audio?.persistentTrack;
            const tracks: MediaStreamTrack[] = [];
            if (videoTrack) tracks.push(videoTrack);
            if (audioTrack) tracks.push(audioTrack);
            if (tracks.length > 0) {
              setLocalStream(new MediaStream(tracks));
            }
            return;
          }

          // Remote Peer Tracks
          const peerId = (p.userData as any)?.userId || p.user_id || p.session_id;
          const videoTrack = p.tracks?.video?.persistentTrack;
          const audioTrack = p.tracks?.audio?.persistentTrack;
          const tracks: MediaStreamTrack[] = [];
          if (videoTrack) tracks.push(videoTrack);
          if (audioTrack) tracks.push(audioTrack);

          if (tracks.length > 0) {
            setPeerStreams((prev) => ({
              ...prev,
              [peerId]: new MediaStream(tracks),
            }));
          }
        };

        call.on("participant-joined", (e) => {
          if (e?.participant) handleParticipantUpdate(e.participant);
        });
        call.on("participant-updated", (e) => {
          if (e?.participant) handleParticipantUpdate(e.participant);
        });
        call.on("participant-left", (e) => {
          if (e?.participant) {
            const peerId = (e.participant.userData as any)?.userId || e.participant.user_id || e.participant.session_id;
            setPeerStreams((prev) => {
              const copy = { ...prev };
              delete copy[peerId];
              return copy;
            });
          }
        });
        call.on("track-started", (e) => {
          if (e?.participant) handleParticipantUpdate(e.participant);
        });
        call.on("track-stopped", (e) => {
          if (e?.participant) handleParticipantUpdate(e.participant);
        });
        call.on("joined-meeting", (e) => {
          setIsDailyConnected(true);
          if (e?.participants?.local) {
            handleParticipantUpdate(e.participants.local);
          }
        });
        call.on("left-meeting", () => {
          setIsDailyConnected(false);
        });
        call.on("error", (err) => {
          console.warn("Daily.co call notice:", err);
        });

        await call.join({
          url: roomUrl,
          userName: `${myName}`,
          userData: {
            userId: myUserId,
            avatar: myAvatar,
          },
        });

        toast.success(`Connected to Daily.co Live Video Room! 🎥`, {
          description: `Managed WebRTC mesh active for ${groupName}.`,
        });
      } else {
        // Fallback: Local preview mode if Daily key not configured yet
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && isCameraOn) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: !isMuted });
            setLocalStream(stream);
          }
        } catch {}

        toast.info(`Joined ${groupName} Focus Room 🎯`, {
          description: "Live squad presence and synced Pomodoro active.",
        });
      }
    } catch (err: any) {
      console.warn("Daily.co setup notice:", err);
      toast.info(`Joined ${groupName} Focus Room 🎯`);
    }
  }, [user, profile, isCameraOn, isMuted, currentTask, groupName, setupPresence, isGuestUser, groupId, fetchDailyRoomUrl]);

  // ── 8. Leave Room & Clean Teardown ──
  const leaveRoom = useCallback(async () => {
    // 1. Destroy Daily Call Object
    if (dailyCallRef.current) {
      try {
        await dailyCallRef.current.leave();
        await dailyCallRef.current.destroy();
      } catch {}
      dailyCallRef.current = null;
    }

    setIsDailyConnected(false);
    setDailyRoomUrl(null);

    // 2. Stop all local media tracks
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
    }

    setPeerStreams({});
    ambientAudio.stop();
    setAmbience("none");
    setIsInRoom(false);
    setIsCameraOn(false);
    setIsSharingScreen(false);
    setParticipants([]);

    // 3. Untrack Supabase presence
    if (presenceChannelRef.current) {
      try {
        presenceChannelRef.current.untrack();
        supabase.removeChannel(presenceChannelRef.current);
      } catch {}
      presenceChannelRef.current = null;
    }

    // 4. Mark is_studying = false in group_members table
    if (!isGuestUser && isValidUUID(user?.id) && isValidUUID(groupId)) {
      try {
        await supabase
          .from("group_members")
          .update({ is_studying: false })
          .eq("group_id", groupId)
          .eq("user_id", user!.id);
      } catch {}
    }

    toast.info("Left the Focus Room.");
  }, [localStream, screenStream, isGuestUser, user, groupId]);

  // ── 9. Camera Toggle ──
  const toggleCamera = useCallback(async () => {
    const next = !isCameraOn;
    setIsCameraOn(next);

    if (dailyCallRef.current) {
      try {
        dailyCallRef.current.setLocalVideo(next);
      } catch {}
    } else {
      if (next) {
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: !isMuted });
            setLocalStream(stream);
          }
        } catch {}
      } else {
        if (localStream) {
          localStream.getVideoTracks().forEach((t) => t.stop());
        }
      }
    }

    setParticipants((prev) =>
      prev.map((p) =>
        p.userId === effectiveUserId || p.name.includes("(You)") ? { ...p, cameraOn: next } : p
      )
    );

    if (presenceChannelRef.current) {
      try {
        presenceChannelRef.current.track(getFullPresencePayload({ cameraOn: next }));
      } catch {}
    }

    toast.info(next ? "Camera enabled 🎥" : "Camera turned off 🚫");
  }, [isCameraOn, isMuted, localStream, effectiveUserId, getFullPresencePayload]);

  // ── 10. Microphone Toggle ──
  const toggleMic = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);

    if (dailyCallRef.current) {
      try {
        dailyCallRef.current.setLocalAudio(!next);
      } catch {}
    } else if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = !next));
    }

    setParticipants((prev) =>
      prev.map((p) =>
        p.userId === effectiveUserId || p.name.includes("(You)") ? { ...p, isMuted: next } : p
      )
    );


    if (presenceChannelRef.current) {
      try {
        presenceChannelRef.current.track(getFullPresencePayload({ isMuted: next }));
      } catch {}
    }

    toast.info(next ? "Microphone muted 🔇" : "Microphone active 🎙️");
  }, [isMuted, localStream, getFullPresencePayload]);

  // ── 11. Screen Share Toggle ──
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
        try {
          presenceChannelRef.current.track(getFullPresencePayload({ isSharingScreen: false }));
        } catch {}
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
            try {
              presenceChannelRef.current.track(getFullPresencePayload({ isSharingScreen: true }));
            } catch {}
          }
          toast.success("Screen sharing active 🖥️");

          stream.getVideoTracks()[0].onended = () => {
            setIsSharingScreen(false);
            setScreenStream(null);
            if (presenceChannelRef.current) {
              try {
                presenceChannelRef.current.track(getFullPresencePayload({ isSharingScreen: false }));
              } catch {}
            }
          };
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, [isSharingScreen, screenStream, getFullPresencePayload]);

  // Update Task and broadcast to presence
  const updateCurrentTask = useCallback(
    (newTask: string) => {
      setCurrentTask(newTask);
      setParticipants((prev) =>
        prev.map((p) => (p.name.includes("(You)") ? { ...p, currentTask: newTask } : p))
      );
      if (presenceChannelRef.current) {
        try {
          presenceChannelRef.current.track(getFullPresencePayload({ currentTask: newTask }));
        } catch {}
      }
      toast.success("Focus goal updated! 🎯");
    },
    [getFullPresencePayload]
  );

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

  // ── 12. Group Pomodoro Cloud Synchronization Actions ──
  const startPomodoro = useCallback(
    async (
      durationSecInput?: any,
      modeInput: PomodoroMode = "work",
      task: string = "Group Focus Sprint"
    ) => {
      const durationSec =
        typeof durationSecInput === "number" && !isNaN(durationSecInput) && durationSecInput > 0
          ? durationSecInput
          : WORK_DURATION;

      const mode = modeInput === "break" ? "break" : "work";
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

      if (!isGuestUser && isValidUUID(groupId)) {
        try {
          await supabase.from("group_focus_sessions").upsert(sessionPayload, { onConflict: "group_id" });
        } catch {}
      }

      toast.success(`Squad Pomodoro Sprint Started! ⏱️ ${Math.floor(durationSec / 60)}:00`, {
        description: `Synced live for all members in ${groupName}.`,
      });
    },
    [groupId, groupName, user, profile, isGuestUser]
  );

  const pausePomodoro = useCallback(async () => {
    const currentRemaining = calculateRemaining(targetEndAt, timeLeft, isTimerRunning);
    const validRemaining =
      typeof currentRemaining === "number" && !isNaN(currentRemaining) && currentRemaining >= 0
        ? currentRemaining
        : WORK_DURATION;

    setIsTimerRunning(false);
    setTimeLeft(validRemaining);
    setTargetEndAt(null);

    const now = new Date();
    const sessionPayload = {
      group_id: groupId,
      is_running: false,
      started_at: null,
      target_end_at: null,
      total_sec: WORK_DURATION,
      paused_remaining_sec: validRemaining,
      mode: pomodoroMode,
      task_name: currentTask,
      started_by: user?.id || null,
      started_by_name: profile?.displayName || "Squad Member",
      last_updated: now.toISOString(),
    };

    try {
      localStorage.setItem(groupSessionCacheKey(groupId), JSON.stringify(sessionPayload));
    } catch {}

    if (!isGuestUser && isValidUUID(groupId)) {
      try {
        await supabase.from("group_focus_sessions").upsert(sessionPayload, { onConflict: "group_id" });
      } catch {}
    }

    toast.info("Squad Pomodoro Paused ⏸️");
  }, [targetEndAt, timeLeft, isTimerRunning, calculateRemaining, groupId, pomodoroMode, currentTask, user, profile, isGuestUser]);

  const resetPomodoro = useCallback(
    async (durationSecInput?: any) => {
      const durationSec =
        typeof durationSecInput === "number" && !isNaN(durationSecInput) && durationSecInput > 0
          ? durationSecInput
          : WORK_DURATION;

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

      if (!isGuestUser && isValidUUID(groupId)) {
        try {
          await supabase.from("group_focus_sessions").upsert(sessionPayload, { onConflict: "group_id" });
        } catch {}
      }

      toast.info(`Squad Pomodoro Reset to ${Math.floor(durationSec / 60)}:00 🔄`);
    },
    [groupId, currentTask, user, profile, isGuestUser]
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
    peerStreams,
    dailyRoomUrl,
    isDailyConnected,
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
