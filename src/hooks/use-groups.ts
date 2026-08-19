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

  // Keep activeGroupId synced with available groups
  useEffect(() => {
    if (groups.length === 0) {
      setActiveGroupId("");
      return;
    }
    if (!groups.some((g) => g.id === activeGroupId)) {
      setActiveGroupId(groups[0].id);
    }
  }, [groups, activeGroupId]);

  // Sync with LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("pps_focus_groups_store", JSON.stringify(groups));
    } catch (e) {
      console.error(e);
    }
  }, [groups]);

  useEffect(() => {
    try {
      localStorage.setItem("pps_focus_members_store", JSON.stringify(membersMap));
    } catch (e) {
      console.error(e);
    }
  }, [membersMap]);

  useEffect(() => {
    if (activeGroupId) {
      localStorage.setItem("pps_active_focus_group", activeGroupId);
    } else {
      localStorage.removeItem("pps_active_focus_group");
    }
  }, [activeGroupId]);

  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === activeGroupId) || null;
  }, [groups, activeGroupId]);

  const activeGroupMembers = useMemo(() => {
    if (!activeGroup) return [];
    return membersMap[activeGroup.id] || [];
  }, [membersMap, activeGroup]);

  // Ensure current user is in active group members list
  useEffect(() => {
    if (!activeGroup || !user) return;
    const currentList = membersMap[activeGroup.id] || [];
    const exists = currentList.some((m) => m.userId === user.id || m.displayName === (profile?.displayName || "You"));

    if (!exists) {
      const youMember: GroupMember = {
        id: `m_you_${Date.now()}`,
        groupId: activeGroup.id,
        userId: user.id,
        displayName: profile?.displayName || "You",
        avatar: profile?.avatarEmoji || "🌟",
        role: activeGroup.createdBy === user.id ? "admin" : "member",
        status: "active",
        currentStreak: profile?.streak || 1,
        isStudying: false,
        joinedAt: new Date().toISOString(),
      };
      setMembersMap((prev) => ({
        ...prev,
        [activeGroup.id]: [youMember, ...(prev[activeGroup.id] || [])],
      }));
    }
  }, [activeGroup, user, profile, membersMap]);

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
      const newGroupId = `group_${Date.now()}`;
      const userId = user?.id || "local_user";
      const userName = profile?.displayName || "You";

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
        avatar: profile?.avatarEmoji || "👑",
        role: "admin",
        status: "active",
        currentStreak: profile?.streak || 1,
        isStudying: false,
        joinedAt: new Date().toISOString(),
      };

      setGroups((prev) => [newGroup, ...prev]);
      setMembersMap((prev) => ({
        ...prev,
        [newGroupId]: [ownerMember],
      }));
      setActiveGroupId(newGroupId);

      toast.success(`Study Group "${newGroup.name}" created! Code: ${code}`);
      return { success: true, groupId: newGroupId };
    },
    [user, profile]
  );

  // Join Group via Invite Code
  const joinGroup = useCallback(
    async (code: string): Promise<{ success: boolean; groupId?: string; error?: string }> => {
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode) return { success: false, error: "Please enter a valid 6-character code." };

      const found = groups.find((g) => g.inviteCode === cleanCode);
      if (!found) {
        return { success: false, error: `No group found matching code "${cleanCode}".` };
      }

      const userId = user?.id || "local_user";
      const userName = profile?.displayName || "You";
      const existingMembers = membersMap[found.id] || [];
      const alreadyIn = existingMembers.some((m) => m.userId === userId || m.displayName === userName);

      if (!alreadyIn) {
        const newMember: GroupMember = {
          id: `m_join_${Date.now()}`,
          groupId: found.id,
          userId,
          displayName: userName,
          avatar: profile?.avatarEmoji || "✨",
          role: "member",
          status: "active",
          currentStreak: profile?.streak || 0,
          isStudying: false,
          joinedAt: new Date().toISOString(),
        };

        setMembersMap((prev) => ({
          ...prev,
          [found.id]: [...(prev[found.id] || []), newMember],
        }));

        setGroups((prev) =>
          prev.map((g) => (g.id === found.id ? { ...g, memberCount: g.memberCount + 1 } : g))
        );
      }

      setActiveGroupId(found.id);
      toast.success(`Joined "${found.name}"!`);
      return { success: true, groupId: found.id };
    },
    [groups, membersMap, user, profile]
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

  // Leave Group
  const leaveGroup = useCallback(
    (groupId: string) => {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (activeGroupId === groupId) {
        const remaining = groups.filter((g) => g.id !== groupId);
        setActiveGroupId(remaining.length > 0 ? remaining[0].id : "");
      }
      toast.info("You left the study group.");
    },
    [activeGroupId, groups]
  );

  // Toggle IsStudying status (Online study indicator)
  const toggleStudyingStatus = useCallback(
    (groupId: string, isStudying: boolean) => {
      const userId = user?.id || "local_user";
      setMembersMap((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || []).map((m) =>
          m.userId === userId || m.displayName === (profile?.displayName || "You")
            ? { ...m, isStudying }
            : m
        ),
      }));

      if (isStudying) {
        toast.success("Focus status: Studying in Focus Room 🎯");
      }
    },
    [user, profile]
  );

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
    createGroup,
    joinGroup,
    leaveGroup,
    loadSampleSquad,
    toggleStudyingStatus,
    nudgeMember,
  };
}
