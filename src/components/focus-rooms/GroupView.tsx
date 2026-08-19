import React, { useState } from "react";
import { useGroups } from "@/hooks/use-groups";
import { useChannels } from "@/hooks/use-channels";
import { useHabits } from "@/hooks/use-habits";
import { GroupList } from "./GroupList";
import { MemberList } from "./MemberList";
import { ChannelChat } from "./ChannelChat";
import { CreateGroupModal } from "./CreateGroupModal";
import { GroupDashboard } from "./GroupDashboard";
import { FocusRoomTutorial } from "./FocusRoomTutorial";
import { AddGroupHabitModal } from "./AddGroupHabitModal";
import { FocusRoomStudio } from "./FocusRoomStudio";
import { TeacherMarketplace } from "./TeacherMarketplace";
import {
  Hash,
  Plus,
  Users,
  Sparkles,
  Video,
  Volume2,
  Mic,
  Settings,
  Copy,
  Share2,
  BookOpen,
  HelpCircle,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

export const GroupView: React.FC = () => {
  const {
    groups,
    activeGroup,
    activeGroupId,
    setActiveGroupId,
    members,
    createGroup,
    joinGroup,
    leaveGroup,
    loadSampleSquad,
    toggleStudyingStatus,
    nudgeMember,
  } = useGroups();

  const {
    channels,
    activeChannel,
    activeChannelId,
    setActiveChannelId,
    messages,
    createChannel,
    sendMessage,
    togglePinMessage,
  } = useChannels(activeGroupId);

  const { addHabit } = useHabits();

  const [mode, setMode] = useState<"squads" | "marketplace">("squads");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddHabitModalOpen, setIsAddHabitModalOpen] = useState(false);
  const [showTutorialManual, setShowTutorialManual] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [isStudyingInRoom, setIsStudyingInRoom] = useState(false);

  const handleCreateChannelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    createChannel(newChannelName);
    setNewChannelName("");
    setIsAddingChannel(false);
  };

  const handleCopyInviteCode = () => {
    if (!activeGroup) return;
    navigator.clipboard.writeText(activeGroup.inviteCode);
    toast.success(`Invite Code "${activeGroup.inviteCode}" copied to clipboard! 📋`, {
      description: "Share this code with your classmates or study partners.",
    });
  };

  const handleToggleFocusRoom = () => {
    const nextState = !isStudyingInRoom;
    setIsStudyingInRoom(nextState);
    toggleStudyingStatus(activeGroupId, nextState);
  };

  const handleNudgeAll = () => {
    toast.success("Broadcasted squad accountability nudge! 🔔", {
      description: "All group members will be nudged to complete their study goals today.",
    });
  };

  // If user has 0 groups and is on squads tab, display tutorial
  if (mode === "squads" && (groups.length === 0 || showTutorialManual)) {
    return (
      <div className="space-y-4">
        {/* Sub-Nav Pill */}
        <div className="flex items-center justify-between pb-2 border-b border-border/40 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-surface border border-border/80 rounded-2xl">
            <button
              onClick={() => setMode("squads")}
              className="px-4 py-1.5 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-xs cursor-pointer"
            >
              📚 Study Squads
            </button>
            <button
              onClick={() => setMode("marketplace")}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Mentor Masterclasses</span>
            </button>
          </div>
          {showTutorialManual && (
            <button
              onClick={() => setShowTutorialManual(false)}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              ← Back to Active Squads
            </button>
          )}
        </div>

        <FocusRoomTutorial
          onCreateGroup={() => {
            setShowTutorialManual(false);
            setIsCreateModalOpen(true);
          }}
          onJoinWithCode={async (code) => {
            const res = await joinGroup(code);
            if (res.success) {
              setShowTutorialManual(false);
            } else {
              toast.error(res.error || "Could not join group");
            }
          }}
          onLoadSample={() => {
            loadSampleSquad();
            setShowTutorialManual(false);
          }}
        />

        <CreateGroupModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={createGroup}
        />
      </div>
    );
  }

  if (!activeGroup) {
    return (
      <div className="p-8 text-center bg-card border border-border/80 rounded-3xl">
        <h3 className="text-lg font-bold text-foreground">No active group selected</h3>
        <button
          onClick={() => setShowTutorialManual(true)}
          className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl"
        >
          Open Tutorial & Guide
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Sub-Nav Switcher: Study Squads vs Mentor Marketplace */}
      <div className="flex items-center justify-between pb-1 border-b border-border/40 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-surface border border-border/80 rounded-2xl shadow-xs">
          <button
            onClick={() => setMode("squads")}
            className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              mode === "squads"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📚 Study Squads ({groups.length})
          </button>
          <button
            onClick={() => setMode("marketplace")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              mode === "marketplace"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Mentor Masterclasses</span>
          </button>
        </div>

        {mode === "squads" && (
          <button
            onClick={() => setShowTutorialManual(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Squad Guide</span>
          </button>
        )}
      </div>

      {mode === "marketplace" ? (
        <TeacherMarketplace />
      ) : !activeGroup ? (
        <div className="p-8 text-center bg-card border border-border/80 rounded-3xl">
          <h3 className="text-lg font-bold text-foreground">No active group selected</h3>
          <button
            onClick={() => setShowTutorialManual(true)}
            className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl"
          >
            Open Tutorial & Guide
          </button>
        </div>
      ) : (
        <>
          {/* Top Group Hub Banner & Metrics */}
          <div className="relative">
            <GroupDashboard
              group={activeGroup}
              members={members}
              onNudgeAll={handleNudgeAll}
              onOpenAddHabitModal={() => setIsAddHabitModalOpen(true)}
              onJoinFocusRoom={handleToggleFocusRoom}
              isStudyingInRoom={isStudyingInRoom}
            />
          </div>

          {/* Main 3-Column Focus Hub Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[620px] h-[75vh] max-h-[750px]">
        {/* Left Column (3 cols): Groups List + Channels */}
        <div className="lg:col-span-3 flex flex-col gap-4 bg-card/60 backdrop-blur-xl border border-border/70 rounded-3xl p-4 overflow-hidden shadow-xl">
          {/* Groups Switcher */}
          <div className="h-[46%] pb-3 border-b border-border/50">
            <GroupList
              groups={groups}
              activeGroupId={activeGroupId}
              onSelectGroup={(id) => setActiveGroupId(id)}
              onCreateGroupClick={() => setIsCreateModalOpen(true)}
              onJoinGroup={joinGroup}
            />
          </div>

          {/* Channels Header & List */}
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-muted-foreground">
                Channels
              </span>
              <button
                onClick={() => setIsAddingChannel(!isAddingChannel)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
                title="Create new channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Add Channel Form */}
            {isAddingChannel && (
              <form onSubmit={handleCreateChannelSubmit} className="flex gap-1 animate-in fade-in">
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="channel-name"
                  className="flex-1 px-2.5 py-1 bg-surface border border-primary/40 rounded-lg text-xs font-mono text-foreground placeholder:text-muted-foreground/60 outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-lg cursor-pointer"
                >
                  Add
                </button>
              </form>
            )}

            {/* Channels Scroll list */}
            <div className="flex-1 space-y-1 overflow-y-auto pr-1">
              {channels.map((ch) => {
                const isActive = ch.id === activeChannelId;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannelId(ch.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm font-extrabold"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface/80"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {ch.type === "resources" ? (
                        <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                      ) : (
                        <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                      )}
                      <span className="truncate">{ch.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Invite Code Quick Copy Footer */}
            <div className="pt-2 border-t border-border/40 flex items-center justify-between">
              <div className="text-[10px] text-muted-foreground font-mono">
                Code: <span className="font-bold text-foreground">{activeGroup.inviteCode}</span>
              </div>
              <button
                onClick={handleCopyInviteCode}
                className="flex items-center gap-1 text-[10px] font-extrabold text-primary hover:underline cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center Column (6 cols or Full when Studio is active): Active Channel Chat or Focus Room Studio */}
        <div className="lg:col-span-6 h-full min-h-0">
          {isStudyingInRoom ? (
            <FocusRoomStudio
              groupId={activeGroupId}
              groupName={activeGroup.name}
              onClose={() => setIsStudyingInRoom(false)}
            />
          ) : activeChannel ? (
            <ChannelChat
              channel={activeChannel}
              messages={messages}
              onSendMessage={sendMessage}
              onTogglePin={togglePinMessage}
              onJoinFocusRoom={handleToggleFocusRoom}
              isStudyingInRoom={isStudyingInRoom}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-card rounded-3xl border border-border/70">
              <span className="text-xs text-muted-foreground">Select a channel</span>
            </div>
          )}
        </div>

        {/* Right Column (3 cols): Squad Members & Online Presence */}
        <div className="lg:col-span-3 h-full bg-card/60 backdrop-blur-xl border border-border/70 rounded-3xl p-4 overflow-hidden shadow-xl">
          <MemberList
            members={members}
            onNudge={nudgeMember}
          />
        </div>
      </div>
      </>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={createGroup}
      />

      {/* Add Study Habit Modal */}
      {activeGroup && (
        <AddGroupHabitModal
          isOpen={isAddHabitModalOpen}
          onClose={() => setIsAddHabitModalOpen(false)}
          groupName={activeGroup.name}
          onAddHabit={addHabit}
        />
      )}
    </div>
  );
};
