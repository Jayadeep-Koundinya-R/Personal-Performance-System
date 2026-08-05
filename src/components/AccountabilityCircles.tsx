import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Plus, Users, Key } from "lucide-react";
import { toast } from "sonner";

interface Circle {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
}

export default function AccountabilityCircles({ userId = "", isPro = false }: { userId?: string; isPro?: boolean }) {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: memberships } = await supabase
        .from("circle_members")
        .select("circle_id")
        .eq("user_id", userId);

      const owned = await supabase.from("accountability_circles").select("*").eq("owner_id", userId);
      const memberIds = [...new Set([...(memberships?.map((m) => m.circle_id) || []), ...(owned.data?.map((c) => c.id) || [])])];

      if (memberIds.length === 0) {
        setCircles([]);
        return;
      }

      const { data: circleData } = await supabase.from("accountability_circles").select("*").in("id", memberIds);
      const withCounts: Circle[] = [];
      for (const c of circleData || []) {
        const { count } = await supabase.from("circle_members").select("*", { count: "exact", head: true }).eq("circle_id", c.id);
        withCounts.push({ id: c.id, name: c.name, inviteCode: c.invite_code, memberCount: count || 1 });
      }
      setCircles(withCounts);
    } catch (e) {
      console.error("Failed to load circles:", e);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const createCircle = async () => {
    if (!userId) {
      toast.error("Please log in to create an accountability circle.");
      return;
    }
    if (!name.trim()) return;
    const { error } = await supabase.from("accountability_circles").insert({ name: name.trim(), owner_id: userId });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data: created } = await supabase.from("accountability_circles").select("id").eq("owner_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (created) {
      await supabase.from("circle_members").insert({ circle_id: created.id, user_id: userId });
    }
    setName("");
    toast.success("Circle created!");
    load();
  };

  const joinCircle = async () => {
    if (!userId) {
      toast.error("Please log in to join an accountability circle.");
      return;
    }
    if (!joinCode.trim()) return;
    const { data: circle } = await supabase.from("accountability_circles").select("id").eq("invite_code", joinCode.trim().toUpperCase()).maybeSingle();
    if (!circle) {
      toast.error("Invalid invite code.");
      return;
    }
    const { error } = await supabase.from("circle_members").insert({ circle_id: circle.id, user_id: userId });
    if (error) {
      toast.error(error.code === "23505" ? "Already a member." : error.message);
      return;
    }
    setJoinCode("");
    toast.success("Joined circle!");
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div>
          <h3 className="text-sm font-extrabold text-foreground uppercase font-mono tracking-wider flex items-center gap-2">
            <span>🛡️ Accountability Circles</span>
          </h3>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            Form small high-accountability circles (3-5 friends) to share daily habit progress
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Create Circle */}
        <div className="bg-surface/60 border border-border/80 rounded-2xl p-4 space-y-2.5">
          <h4 className="text-xs font-extrabold text-foreground font-mono flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-primary" />
            <span>Create New Circle</span>
          </h4>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Circle name..."
              className="flex-1 bg-surface border border-border/80 px-3 py-2 rounded-xl text-xs font-bold outline-none text-foreground focus:border-primary"
            />
            <button
              onClick={createCircle}
              className="bg-primary text-primary-foreground font-extrabold px-4 py-2 rounded-xl text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
            >
              Create
            </button>
          </div>
        </div>

        {/* Join Circle */}
        <div className="bg-surface/60 border border-border/80 rounded-2xl p-4 space-y-2.5">
          <h4 className="text-xs font-extrabold text-foreground font-mono flex items-center gap-1.5">
            <Key className="w-4 h-4 text-sky-300" />
            <span>Join Circle with Code</span>
          </h4>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="e.g. ABC123"
              className="flex-1 bg-surface border border-border/80 px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase outline-none text-foreground focus:border-primary"
            />
            <button
              onClick={joinCircle}
              className="bg-surface border border-border/80 text-foreground font-extrabold px-4 py-2 rounded-xl text-xs hover:bg-muted/40 transition-all cursor-pointer"
            >
              Join
            </button>
          </div>
        </div>
      </div>

      {/* Circle List */}
      <div className="space-y-2.5">
        {circles.length === 0 ? (
          <div className="text-center py-8 bg-surface/40 border border-border rounded-2xl text-slate-300 text-xs font-medium">
            No active accountability circles. Create or join one above!
          </div>
        ) : (
          circles.map((c) => (
            <div key={c.id} className="bg-surface border border-border/80 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <div className="font-extrabold text-sm text-foreground">{c.name}</div>
                <div className="text-xs font-mono text-slate-300 font-bold mt-0.5">
                  👥 {c.memberCount} members • Code: <span className="text-primary font-bold">{c.inviteCode}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
