import { useState, useCallback, useEffect, useMemo } from "react";
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

  const [channelsMap, setChannelsMap] = useState<Record<string, GroupChannel[]>>(() => {
    try {
      const saved = localStorage.getItem("pps_focus_channels_store");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [messagesMap, setMessagesMap] = useState<Record<string, ChannelMessage[]>>(() => {
    try {
      const saved = localStorage.getItem("pps_focus_messages_store");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Ensure default channels exist for this group
  const channels = useMemo(() => {
    if (!groupId) return [];
    const list = channelsMap[groupId];
    if (list && list.length > 0) return list;

    // Default channels generated for any newly selected group
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

  const [activeChannelId, setActiveChannelId] = useState<string>(() => {
    return channels[0]?.id || "";
  });

  // Keep active channel valid if channels change
  useEffect(() => {
    if (!channels.some((c) => c.id === activeChannelId)) {
      if (channels.length > 0) {
        setActiveChannelId(channels[0].id);
      } else {
        setActiveChannelId("");
      }
    }
  }, [channels, activeChannelId]);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("pps_focus_channels_store", JSON.stringify(channelsMap));
    } catch (e) {
      console.error(e);
    }
  }, [channelsMap]);

  useEffect(() => {
    try {
      localStorage.setItem("pps_focus_messages_store", JSON.stringify(messagesMap));
    } catch (e) {
      console.error(e);
    }
  }, [messagesMap]);

  const activeChannel = useMemo(() => {
    return channels.find((c) => c.id === activeChannelId) || channels[0] || null;
  }, [channels, activeChannelId]);

  const activeMessages = useMemo(() => {
    if (!activeChannel) return [];
    return messagesMap[activeChannel.id] || [];
  }, [messagesMap, activeChannel]);

  // Create Channel
  const createChannel = useCallback(
    (name: string, description: string = "", type: "custom" | "resources" | "announcements" = "custom") => {
      if (!groupId) return;
      const cleanName = name.trim().toLowerCase().replace(/\s+/g, "-");
      if (!cleanName) {
        toast.error("Please enter a channel name.");
        return;
      }

      const newChannel: GroupChannel = {
        id: `ch_${groupId}_${Date.now()}`,
        groupId,
        name: cleanName,
        description: description.trim() || `Channel for ${cleanName}`,
        type,
        createdAt: new Date().toISOString(),
      };

      setChannelsMap((prev) => ({
        ...prev,
        [groupId]: [...(prev[groupId] || channels), newChannel],
      }));
      setActiveChannelId(newChannel.id);
      toast.success(`Channel #${cleanName} created!`);
    },
    [groupId, channels]
  );

  // Send Message
  const sendMessage = useCallback(
    (content: string, linkUrl?: string) => {
      if (!content.trim() && !linkUrl) return;
      if (!activeChannel || !groupId) return;

      const userId = user?.id || "local_user";
      const userName = profile?.displayName || "You";
      const userAvatar = profile?.avatarEmoji || "🌟";

      const isLink = Boolean(linkUrl || content.match(/^https?:\/\//i));

      const newMsg: ChannelMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        channelId: activeChannel.id,
        groupId,
        senderId: userId,
        senderName: userName,
        senderAvatar: userAvatar,
        content: content.trim(),
        type: isLink ? "link" : "text",
        linkUrl: linkUrl || (content.match(/^https?:\/\/\S+/i)?.[0]),
        pinned: false,
        createdAt: new Date().toISOString(),
      };

      setMessagesMap((prev) => ({
        ...prev,
        [activeChannel.id]: [...(prev[activeChannel.id] || []), newMsg],
      }));
    },
    [activeChannel, groupId, user, profile]
  );

  // Pin / Unpin Message
  const togglePinMessage = useCallback(
    (messageId: string) => {
      if (!activeChannel) return;
      setMessagesMap((prev) => ({
        ...prev,
        [activeChannel.id]: (prev[activeChannel.id] || []).map((m) =>
          m.id === messageId ? { ...m, pinned: !m.pinned } : m
        ),
      }));
      toast.success("Message pin status updated!");
    },
    [activeChannel]
  );

  return {
    channels,
    activeChannel,
    activeChannelId,
    setActiveChannelId,
    messages: activeMessages,
    createChannel,
    sendMessage,
    togglePinMessage,
  };
}
