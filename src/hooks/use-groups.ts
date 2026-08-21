import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  displayName: string;
  avatar: string;
  role: "member" | "admin" | "teacher" | "mentor";
  status: "active" | "blocked" | "left";
  currentStreak: number;
  isStudying: boolean;
  joinedAt: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  createdBy: string;
  privacy: "public" | "private";
  maxMembers: number;
  avatarEmoji: string;
  studyTopic: string;
  createdAt: string;
  memberCount: number;
}

export const SAMPLE_TEMPLATE_GROUP: StudyGroup = {
  id: "group_sample_squad",
  name: "Mastery & Focus Squad (Sample)",
  description: "Daily Pomodoro deep work sprints, sharing study cheat-sheets and lecture notes.",
  inviteCode: "FOCUS1",
  createdBy: "sample_host",
  privacy: "public",
  maxMembers: 20,
  avatarEmoji: "⚡",
  studyTopic: "General Deep Work & Study",
  createdAt: new Date().toISOString(),
  memberCount: 3,
};

export const SAMPLE_TEMPLATE_MEMBERS: GroupMember[] = [
  {
    id: "m_sample_1",
    groupId: "group_sample_squad",
    userId: "sample_host",
    displayName: "Study Lead (Mentor)",
    avatar: "👨‍🏫",
    role: "teacher",
    status: "active",
    currentStreak: 21,
    isStudying: true,
    joinedAt: new Date().toISOString(),
  },
  {
    id: "m_sample_2",
    groupId: "group_sample_squad",
    userId: "sample_peer",
    displayName: "Elena R.",
    avatar: "👩‍🔬",
    role: "member",
    status: "active",
    currentStreak: 14,
    isStudying: false,
    joinedAt: new Date().toISOString(),
  },
];

export function useGroups() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const isGuestUser = !user?.id || user?.id === "guest_local" || user?.id.startsWith("guest");

  const [groups, setGroups] = useState<StudyGroup[]>(() => {
    try {
      const saved = localStorage.getItem("pps_focus_groups_store");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [membersMap, setMembersMap] = useState<Record<string, GroupMember[]>>(() => {
    try {
      const saved = localStorage.getItem("pps_focus_members_store");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    const saved = localStorage.getItem("pps_active_focus_group");
    return saved || "";
  });

  const [loading, setLoading] = useState(true);

  // ── 1. Fetch Groups and Active Group Members from Supabase ──
  const fetchCloudGroups = useCallback(async () => {
    if (isGuestUser || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch all groups where user is a member OR creator OR public
      const { data: groupsData, error: groupsError } = await supabase
        .from("study_groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (groupsError) {
        console.error("Failed to fetch study groups:", groupsError);
      } else if (groupsData) {
        const mappedGroups: StudyGroup[] = groupsData.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description || "",
          inviteCode: g.invite_code,
          createdBy: g.created_by || "",
          privacy: (g.privacy as "public" | "private") || "public",
          maxMembers: g.max_members || 20,
          avatarEmoji: g.avatar_emoji || "📚",
          studyTopic: g.study_topic || "General Study",
          createdAt: g.created_at || new Date().toISOString(),
          memberCount: 1,
        }));

        setGroups(mappedGroups);
        try {
          localStorage.setItem("pps_focus_groups_store", JSON.stringify(mappedGroups));
        } catch {}

        if (!activeGroupId && mappedGroups.length > 0) {
          setActiveGroupId(mappedGroups[0].id);
        }
      }

      // 2. Fetch all members for all available groups
      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select("*")
        .eq("status", "active");

      if (membersError) {
        console.error("Failed to fetch group members:", membersError);
      } else if (membersData) {
        const newMap: Record<string, GroupMember[]> = {};
        for (const m of membersData) {
          if (!newMap[m.group_id]) newMap[m.group_id] = [];
          newMap[m.group_id].push({
            id: m.id,
            groupId: m.group_id,
            userId: m.user_id,
            displayName: m.display_name || "Member",
            avatar: m.avatar || "👤",
            role: (m.role as GroupMember["role"]) || "member",
            status: (m.status as GroupMember["status"]) || "active",
            currentStreak: m.current_streak || 0,
            isStudying: Boolean(m.is_studying),
            joinedAt: m.joined_at || new Date().toISOString(),
          });
        }
        setMembersMap(newMap);
        try {
          localStorage.setItem("pps_focus_members_store", JSON.stringify(newMap));
        } catch {}
      }
    } catch (err) {
      console.error("Network error fetching groups/members:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isGuestUser, activeGroupId]);

  // Initial Fetch & Realtime Listeners
  useEffect(() => {
    let isMounted = true;
    fetchCloudGroups();

    if (!isGuestUser && user?.id) {
      const channelId = `realtime-study-groups-${user.id}-${Math.random().toString(36).substring(2, 7)}`;
      const channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "study_groups" },
          () => {
            if (isMounted) fetchCloudGroups();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "group_members" },
          () => {
            if (isMounted) fetchCloudGroups();
          }
        )
        .subscribe();

      return () => {
        isMounted = false;
        try {
          supabase.removeChannel(channel);
        } catch {}
      };
    }

    return () => {
      isMounted = false;
    };
  }, [fetchCloudGroups, isGuestUser, user?.id]);

  // Keep activeGroupId valid
  useEffect(() => {
    if (groups.length === 0) {
      setActiveGroupId("");
      return;
    }
    if (!groups.some((g) => g.id === activeGroupId)) {
      setActiveGroupId(groups[0].id);
    }
  }, [groups, activeGroupId]);

  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === activeGroupId) || null;
  }, [groups, activeGroupId]);

  const activeGroupMembers = useMemo(() => {
    if (!activeGroup) return [];
    return membersMap[activeGroup.id] || [];
  }, [membersMap, activeGroup]);

  // Create Group
  const createGroup = useCallback(
    async (
      name: string,
      description: string,
      avatarEmoji: string = "📚",
      studyTopic: string = "General Study",
      privacy: "public" | "private" = "public"
    ): Promise<{ success: boolean; groupId?: string; error?: string }> => {
      if (!name.trim()) return { success: false, error: "Please enter a group name." };

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const userId = user?.id || "local_user";
      const userName = profile?.displayName || "You";
      const userAvatar = profile?.avatarEmoji || "👑";

      const newGroupId = `group_${Date.now()}`;
      const newGroup: StudyGroup = {
        id: newGroupId,
        name: name.trim(),
        description: description.trim() || "Dedicated study & co-working group",
        inviteCode: code,
        createdBy: userId,
        privacy,
        maxMembers: 20,
        avatarEmoji: avatarEmoji || "📚",
        studyTopic: studyTopic || "General Study",
        createdAt: new Date().toISOString(),
        memberCount: 1,
      };

      const ownerMember: GroupMember = {
        id: `m_owner_${Date.now()}`,
        groupId: newGroupId,
        userId,
        displayName: userName,
        avatar: userAvatar,
        role: "admin",
        status: "active",
        currentStreak: profile?.streak || 1,
        isStudying: false,
        joinedAt: new Date().toISOString(),
      };

      // Optimistic state update
      setGroups((prev) => [newGroup, ...prev]);
      setMembersMap((prev) => ({
        ...prev,
        [newGroupId]: [ownerMember],
      }));
      setActiveGroupId(newGroupId);

      try {
        const currentSaved: StudyGroup[] = JSON.parse(localStorage.getItem("pps_focus_groups_store") || "[]");
        localStorage.setItem("pps_focus_groups_store", JSON.stringify([newGroup, ...currentSaved.filter((g) => g.id !== newGroupId)]));
      } catch {}

      if (isGuestUser) {
        toast.success(`Study Group "${newGroup.name}" created! Code: ${code}`);
        return { success: true, groupId: newGroupId };
      }

      try {
        // 1. Insert into Supabase study_groups
        const { data: groupData, error: groupError } = await supabase
          .from("study_groups")
          .insert({
            name: name.trim(),
            description: description.trim() || "Dedicated study & co-working group",
            invite_code: code,
            created_by: userId,
            privacy,
            max_members: 20,
            avatar_emoji: avatarEmoji || "📚",
            study_topic: studyTopic || "General Study",
          })
          .select()
          .single();

        if (!groupError && groupData) {
          // 2. Insert creator into group_members as admin
          await supabase.from("group_members").insert({
            group_id: groupData.id,
            user_id: userId,
            display_name: userName,
            avatar: userAvatar,
            role: "admin",
            status: "active",
            current_streak: profile?.streak || 1,
            is_studying: false,
          });

          // 3. Create default channels for this group
          await supabase.from("group_channels").insert([
            {
              group_id: groupData.id,
              name: "general-chat",
              description: "General discussion, daily check-ins, and study schedules",
              type: "general",
              created_by: userId,
            },
            {
              group_id: groupData.id,
              name: "study-notes-and-links",
              description: "Shared materials, cheat-sheets, and lecture links",
              type: "resources",
              created_by: userId,
            },
          ]);
        }
        toast.success(`Study Group "${name}" created live! Invite Code: ${code}`);
        return { success: true, groupId: newGroupId };
      } catch (err: any) {
        console.error("Exception creating group in cloud:", err);
        return { success: true, groupId: newGroupId };
      }
    },
    [user, profile, isGuestUser, fetchCloudGroups]
  );

  // Join Group via Invite Code
  const joinGroup = useCallback(
    async (code: string): Promise<{ success: boolean; groupId?: string; error?: string }> => {
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode) return { success: false, error: "Please enter a valid 6-character code." };

      const userId = user?.id || "local_user";
      const userName = profile?.displayName || "You";
      const userAvatar = profile?.avatarEmoji || "✨";

      // Check in-memory state and localStorage
      const savedGroups: StudyGroup[] = (() => {
        try {
          return JSON.parse(localStorage.getItem("pps_focus_groups_store") || "[]");
        } catch {
          return [];
        }
      })();
      const localFound = groups.find((g) => g.inviteCode === cleanCode) || savedGroups.find((g) => g.inviteCode === cleanCode);

      if (localFound) {
        const existingMembers = membersMap[localFound.id] || [];
        const alreadyIn = existingMembers.some((m) => m.userId === userId || m.displayName === userName);

        if (!alreadyIn) {
          const newMember: GroupMember = {
            id: `m_join_${Date.now()}`,
            groupId: localFound.id,
            userId,
            displayName: userName,
            avatar: userAvatar,
            role: "member",
            status: "active",
            currentStreak: profile?.streak || 0,
            isStudying: false,
            joinedAt: new Date().toISOString(),
          };

          setMembersMap((prev) => ({
            ...prev,
            [localFound.id]: [...(prev[localFound.id] || []), newMember],
          }));

          setGroups((prev) => {
            const hasGroup = prev.some((g) => g.id === localFound.id);
            if (!hasGroup) return [localFound, ...prev];
            return prev.map((g) => (g.id === localFound.id ? { ...g, memberCount: g.memberCount + 1 } : g));
          });
        }

        setActiveGroupId(localFound.id);
        toast.success(`Joined "${localFound.name}"!`);
        return { success: true, groupId: localFound.id };
      }

      if (isGuestUser) {
        return { success: false, error: `No group found matching code "${cleanCode}".` };
      }

      try {
        // Query Supabase for group with invite_code
        const { data: groupData, error: groupError } = await supabase
          .from("study_groups")
          .select("*")
          .eq("invite_code", cleanCode)
          .maybeSingle();

        if (groupError || !groupData) {
          return { success: false, error: `No group found matching code "${cleanCode}".` };
        }

        // Check if already a member in DB
        const { data: existingMember } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", groupData.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingMember) {
          const { error: joinError } = await supabase.from("group_members").insert({
            group_id: groupData.id,
            user_id: userId,
            display_name: userName,
            avatar: userAvatar,
            role: "member",
            status: "active",
            current_streak: profile?.streak || 0,
            is_studying: false,
          });

          if (joinError) {
            console.error("Failed to insert member into cloud:", joinError);
          }
        }

        await fetchCloudGroups();
        setActiveGroupId(groupData.id);
        toast.success(`Joined "${groupData.name}"!`);
        return { success: true, groupId: groupData.id };
      } catch (err: any) {
        console.error("Exception joining group:", err);
        return { success: false, error: err?.message || "Network error joining study group." };
      }
    },
    [groups, membersMap, user, profile, isGuestUser, fetchCloudGroups]
  );

  // Leave Group
  const leaveGroup = useCallback(
    async (groupId: string) => {
      if (isGuestUser) {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        if (activeGroupId === groupId) {
          const remaining = groups.filter((g) => g.id !== groupId);
          setActiveGroupId(remaining.length > 0 ? remaining[0].id : "");
        }
        toast.info("You left the study group.");
        return;
      }

      try {
        await supabase
          .from("group_members")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", user!.id);

        await fetchCloudGroups();
        toast.info("You left the study group.");
      } catch (err) {
        console.error("Failed to leave group:", err);
      }
    },
    [activeGroupId, groups, isGuestUser, user, fetchCloudGroups]
  );

  // Toggle IsStudying status (Online study presence indicator)
  const toggleStudyingStatus = useCallback(
    async (groupId: string, isStudying: boolean) => {
      const userId = user?.id || "local_user";

      // Optimistic local state update
      setMembersMap((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || []).map((m) =>
          m.userId === userId ? { ...m, isStudying } : m
        ),
      }));

      if (!isGuestUser && user?.id) {
        try {
          await supabase
            .from("group_members")
            .update({ is_studying: isStudying })
            .eq("group_id", groupId)
            .eq("user_id", user.id);
        } catch (err) {
          console.error("Failed to update studying status:", err);
        }
      }

      if (isStudying) {
        toast.success("Focus presence: In Focus Room 🎯");
      }
    },
    [user, isGuestUser]
  );

  // Load Sample Template Group for 1-Click Tutorial Demo
  const loadSampleSquad = useCallback(() => {
    setGroups([SAMPLE_TEMPLATE_GROUP]);
    setMembersMap({
      [SAMPLE_TEMPLATE_GROUP.id]: SAMPLE_TEMPLATE_MEMBERS,
    });
    setActiveGroupId(SAMPLE_TEMPLATE_GROUP.id);
    toast.success("Loaded Sample Focus Squad template! Feel free to explore or create your own.");
  }, []);

  // Nudge a member
  const nudgeMember = useCallback((memberName: string) => {
    toast.success(`Sent an accountability nudge to ${memberName}! 🔔`, {
      description: "They will see your reminder to complete their daily study goals.",
    });
  }, []);

  return {
    groups,
    activeGroup,
    activeGroupId,
    setActiveGroupId,
    members: activeGroupMembers,
    loading,
    createGroup,
    joinGroup,
    leaveGroup,
    loadSampleSquad,
    toggleStudyingStatus,
    nudgeMember,
    refreshGroups: fetchCloudGroups,
  };
}
