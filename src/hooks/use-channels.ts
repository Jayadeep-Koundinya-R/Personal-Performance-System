import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";

export interface GroupChannel {
  id: string;
  groupId: string;
  name: string;
  description: string;
  type: "general" | "resources" | "custom" | "announcements";
  createdAt: string;
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole?: string;
  content: string;
  type: "text" | "link" | "system" | "file";
  linkUrl?: string;
  pinned: boolean;
  createdAt: string;
}

export function useChannels(groupId: string) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const isGuestUser = !user?.id || user?.id === "guest_local" || user?.id.startsWith("guest");

  const channelsKey = `pps_focus_channels_store_${user?.id || "guest"}`;
  const messagesKey = `pps_focus_messages_store_${user?.id || "guest"}`;

  const [channelsMap, setChannelsMap] = useState<Record<string, GroupChannel[]>>(() => {
    try {
      const saved = localStorage.getItem(channelsKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [messagesMap, setMessagesMap] = useState<Record<string, ChannelMessage[]>>(() => {
    try {
      const saved = localStorage.getItem(messagesKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // ── 1. Fetch Group Channels from Supabase ──
  const fetchGroupChannels = useCallback(async () => {
    if (!groupId) return;

    if (isGuestUser) {
      const list = channelsMap[groupId];
      if (!list || list.length === 0) {
        const defaultChannels: GroupChannel[] = [
          {
            id: `ch_${groupId}_general`,
            groupId,
            name: "general-chat",
            description: "General discussion, daily check-ins, and study schedules",
            type: "general",
            createdAt: new Date().toISOString(),
          },
          {
            id: `ch_${groupId}_resources`,
            groupId,
            name: "study-notes-and-links",
            description: "Shared materials, cheat-sheets, and lecture links",
            type: "resources",
            createdAt: new Date().toISOString(),
          },
        ];
        setChannelsMap((prev) => ({ ...prev, [groupId]: defaultChannels }));
        if (!activeChannelId) setActiveChannelId(defaultChannels[0].id);
      } else if (!activeChannelId && list.length > 0) {
        setActiveChannelId(list[0].id);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from("group_channels")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to fetch group channels:", error);
      } else if (data && data.length > 0) {
        const seenNames = new Set<string>();
        const mapped: GroupChannel[] = [];
        for (const c of data) {
          const normName = (c.name || "").trim().toLowerCase();
          if (!seenNames.has(normName)) {
            seenNames.add(normName);
            mapped.push({
              id: c.id,
              groupId: c.group_id,
              name: c.name,
              description: c.description || "",
              type: (c.type as GroupChannel["type"]) || "custom",
              createdAt: c.created_at || new Date().toISOString(),
            });
          }
        }

        setChannelsMap((prev) => ({ ...prev, [groupId]: mapped }));
        if (!activeChannelId || !mapped.some((c) => c.id === activeChannelId)) {
          setActiveChannelId(mapped[0].id);
        }
      } else {
        // Group has no channels in DB yet — create default channels
        const { data: createdDefaults } = await supabase
          .from("group_channels")
          .insert([
            {
              group_id: groupId,
              name: "general-chat",
              description: "General discussion, daily check-ins, and study schedules",
              type: "general",
              created_by: user?.id || null,
            },
            {
              group_id: groupId,
              name: "study-notes-and-links",
              description: "Shared materials, cheat-sheets, and lecture links",
              type: "resources",
              created_by: user?.id || null,
            },
          ])
          .select();

        if (createdDefaults) {
          const mapped: GroupChannel[] = createdDefaults.map((c) => ({
            id: c.id,
            groupId: c.group_id,
            name: c.name,
            description: c.description || "",
            type: (c.type as GroupChannel["type"]) || "custom",
            createdAt: c.created_at || new Date().toISOString(),
          }));
          setChannelsMap((prev) => ({ ...prev, [groupId]: mapped }));
          setActiveChannelId(mapped[0].id);
        }
      }
    } catch (err) {
      console.error("Exception fetching channels:", err);
    }
  }, [groupId, isGuestUser, activeChannelId, channelsMap, user?.id]);

  // ── 2. Fetch Channel Messages from Supabase ──
  const fetchChannelMessages = useCallback(
    async (targetChannelId: string) => {
      if (!targetChannelId || !groupId) return;
      if (isGuestUser) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("channel_messages")
          .select("*")
          .eq("channel_id", targetChannelId)
          .order("created_at", { ascending: true })
          .limit(100);

        if (error) {
          console.error("Failed to load channel messages:", error);
        } else if (data) {
          const mapped: ChannelMessage[] = data.map((m) => ({
            id: m.id,
            channelId: m.channel_id,
            groupId: m.group_id,
            senderId: m.sender_id || "",
            senderName: m.sender_name || "User",
            senderAvatar: m.sender_avatar || "👤",
            content: m.content || "",
            type: (m.type as ChannelMessage["type"]) || "text",
            linkUrl: m.link_url || undefined,
            pinned: Boolean(m.pinned),
            createdAt: m.created_at || new Date().toISOString(),
          }));

          setMessagesMap((prev) => ({ ...prev, [targetChannelId]: mapped }));
        }
      } catch (err) {
        console.error("Exception fetching messages:", err);
      } finally {
        setLoading(false);
      }
    },
    [groupId, isGuestUser]
  );

  // Initial Channels Fetch on groupId change
  useEffect(() => {
    fetchGroupChannels();
  }, [groupId, fetchGroupChannels]);

  // Initial Messages Fetch on activeChannelId change
  useEffect(() => {
    if (activeChannelId) {
      fetchChannelMessages(activeChannelId);
    }
  }, [activeChannelId, fetchChannelMessages]);

  // ── 3. Realtime Cross-Device Messages Subscription ──
  useEffect(() => {
    const channelId = `realtime-channel-messages-${groupId}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "channel_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload: any) => {
          const newRow = payload?.new;
          if (!newRow) return;

          const newMsg: ChannelMessage = {
            id: newRow.id,
            channelId: newRow.channel_id,
            groupId: newRow.group_id,
            senderId: newRow.sender_id || "",
            senderName: newRow.sender_name || "User",
            senderAvatar: newRow.sender_avatar || "👤",
            content: newRow.content || "",
            type: (newRow.type as ChannelMessage["type"]) || "text",
            linkUrl: newRow.link_url || undefined,
            pinned: Boolean(newRow.pinned),
            createdAt: newRow.created_at || new Date().toISOString(),
          };

          setMessagesMap((prev) => {
            const current = prev[newRow.channel_id] || [];
            // Prevent duplicate insertion if already in local state
            if (current.some((m) => m.id === newMsg.id)) return prev;
            return {
              ...prev,
              [newRow.channel_id]: [...current, newMsg],
            };
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "channel_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload: any) => {
          const updatedRow = payload?.new;
          if (!updatedRow) return;

          setMessagesMap((prev) => {
            const current = prev[updatedRow.channel_id] || [];
            return {
              ...prev,
              [updatedRow.channel_id]: current.map((m) =>
                m.id === updatedRow.id
                  ? {
                      ...m,
                      pinned: Boolean(updatedRow.pinned),
                      content: updatedRow.content,
                    }
                  : m
              ),
            };
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_channels",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchGroupChannels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, isGuestUser, fetchGroupChannels]);

  // Derived current channels
  const channels = useMemo(() => {
    if (!groupId) return [];
    const existing = channelsMap[groupId];
    if (existing && existing.length > 0) return existing;

    return [
      {
        id: `ch_${groupId}_general`,
        groupId,
        name: "general-chat",
        description: "General discussion, daily check-ins, and study schedules",
        type: "general" as const,
        createdAt: new Date().toISOString(),
      },
      {
        id: `ch_${groupId}_resources`,
        groupId,
        name: "study-notes-and-links",
        description: "Shared materials, cheat-sheets, and lecture links",
        type: "resources" as const,
        createdAt: new Date().toISOString(),
      },
    ];
  }, [channelsMap, groupId]);

  const activeChannel = useMemo(() => {
    return channels.find((c) => c.id === activeChannelId) || channels[0] || null;
  }, [channels, activeChannelId]);

  const activeMessages = useMemo(() => {
    if (!activeChannel) return [];
    return messagesMap[activeChannel.id] || [];
  }, [messagesMap, activeChannel]);

  // Create Channel
  const createChannel = useCallback(
    async (name: string, description: string = "", type: "custom" | "resources" | "announcements" = "custom") => {
      if (!groupId) return;
      const cleanName = name.trim().toLowerCase().replace(/\s+/g, "-");
      if (!cleanName) {
        toast.error("Please enter a channel name.");
        return;
      }

      const newChannelId = `ch_${groupId}_${Date.now()}`;
      const newChannel: GroupChannel = {
        id: newChannelId,
        groupId,
        name: cleanName,
        description: description.trim() || `Channel for ${cleanName}`,
        type,
        createdAt: new Date().toISOString(),
      };

      // Optimistic state update
      setChannelsMap((prev) => ({
        ...prev,
        [groupId]: [...(prev[groupId] || channels), newChannel],
      }));
      setActiveChannelId(newChannelId);
      toast.success(`Channel #${cleanName} created!`);

      if (isGuestUser) return;

      try {
        await supabase
          .from("group_channels")
          .insert({
            group_id: groupId,
            name: cleanName,
            description: description.trim() || `Channel for ${cleanName}`,
            type,
            created_by: user?.id || null,
          });
      } catch (err) {
        console.error("Exception creating channel:", err);
      }
    },
    [groupId, isGuestUser, user?.id, channels]
  );

  // Send Message
  const sendMessage = useCallback(
    async (content: string, linkUrl?: string) => {
      if (!content.trim() && !linkUrl) return;
      if (!activeChannel || !groupId) return;

      const userId = user?.id || "local_user";
      const userName = profile?.displayName || "You";
      const userAvatar = profile?.avatarEmoji || "🌟";
      const isLink = Boolean(linkUrl || content.match(/^https?:\/\//i));

      const optimisticMsg: ChannelMessage = {
        id: `msg_${Date.now()}`,
        channelId: activeChannel.id,
        groupId,
        senderId: userId,
        senderName: userName,
        senderAvatar: userAvatar,
        content: content.trim(),
        type: isLink ? "link" : "text",
        linkUrl: linkUrl || (isLink ? content.trim() : undefined),
        pinned: false,
        createdAt: new Date().toISOString(),
      };

      // Optimistic UI update
      setMessagesMap((prev) => ({
        ...prev,
        [activeChannel.id]: [...(prev[activeChannel.id] || []), optimisticMsg],
      }));

      if (isGuestUser) return;

      try {
        const { data, error } = await supabase
          .from("channel_messages")
          .insert({
            channel_id: activeChannel.id,
            group_id: groupId,
            sender_id: userId,
            sender_name: userName,
            sender_avatar: userAvatar,
            content: content.trim(),
            type: isLink ? "link" : "text",
            link_url: linkUrl || (isLink ? content.trim() : null),
            pinned: false,
          })
          .select()
          .single();

        if (error) {
          console.error("Failed to insert message to cloud:", error);
          toast.error("Failed to send message.");
        } else if (data) {
          // Replace optimistic ID with database ID
          setMessagesMap((prev) => ({
            ...prev,
            [activeChannel.id]: (prev[activeChannel.id] || []).map((m) =>
              m.id === optimisticMsg.id ? { ...m, id: data.id } : m
            ),
          }));
        }
      } catch (err) {
        console.error("Exception sending message:", err);
      }
    },
    [activeChannel, groupId, isGuestUser, user?.id, profile]
  );

  // Toggle Pin Message
  const togglePinMessage = useCallback(
    async (messageId: string) => {
      if (!activeChannel) return;

      const currentMsgs = messagesMap[activeChannel.id] || [];
      const target = currentMsgs.find((m) => m.id === messageId);
      if (!target) return;

      const newPinned = !target.pinned;

      setMessagesMap((prev) => ({
        ...prev,
        [activeChannel.id]: (prev[activeChannel.id] || []).map((m) =>
          m.id === messageId ? { ...m, pinned: newPinned } : m
        ),
      }));

      if (isGuestUser) {
        toast.info(newPinned ? "📌 Message pinned!" : "Unpinned message.");
        return;
      }

      try {
        await supabase
          .from("channel_messages")
          .update({ pinned: newPinned })
          .eq("id", messageId);

        toast.info(newPinned ? "📌 Message pinned to channel!" : "Unpinned message.");
      } catch (err) {
        console.error("Failed to pin message:", err);
      }
    },
    [activeChannel, isGuestUser, messagesMap]
  );

  return {
    channels,
    activeChannel,
    activeChannelId,
    setActiveChannelId,
    messages: activeMessages,
    loading,
    createChannel,
    sendMessage,
    togglePinMessage,
    refreshChannels: fetchGroupChannels,
    refreshMessages: () => activeChannelId && fetchChannelMessages(activeChannelId),
  };
}
