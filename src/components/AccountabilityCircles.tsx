import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Circle {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
}

export default function AccountabilityCircles({ userId, isPro }: { userId: string; isPro: boolean }) {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
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
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const createCircle = async () => {
    if (!isPro) {
      setMsg("Accountability circles require Pro.");
      return;
    }
    if (!name.trim()) return;
    const { error } = await supabase.from("accountability_circles").insert({ name: name.trim(), owner_id: userId });
    if (error) {
      setMsg(error.message);
      return;
    }
    const { data: created } = await supabase.from("accountability_circles").select("id").eq("owner_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (created) {
      await supabase.from("circle_members").insert({ circle_id: created.id, user_id: userId });
    }
    setName("");
    setMsg("Circle created!");
    load();
  };

  const joinCircle = async () => {
    if (!joinCode.trim()) return;
    const { data: circle } = await supabase.from("accountability_circles").select("id").eq("invite_code", joinCode.trim().toUpperCase()).maybeSingle();
    if (!circle) {
      setMsg("Invalid invite code.");
      return;
    }
    const { error } = await supabase.from("circle_members").insert({ circle_id: circle.id, user_id: userId });
    if (error) {
      setMsg(error.code === "23505" ? "Already a member." : error.message);
      return;
    }
    setJoinCode("");
    setMsg("Joined circle!");
    load();
  };

  return (
    <div className="space-y-4">
      {!isPro && <p className="text-[13px] text-muted-foreground">Upgrade to Pro to create accountability circles (3–5 friends).</p>}

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Create Circle</h3>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Circle name" className="flex-1 bg-surface border border-border px-3 py-2 rounded-lg text-sm" />
          <button onClick={createCircle} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">Create</button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Join with Code</h3>
        <div className="flex gap-2">
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="ABC123" className="flex-1 bg-surface border border-border px-3 py-2 rounded-lg text-sm font-mono uppercase" />
          <button onClick={joinCircle} className="border border-border px-4 py-2 rounded-lg text-sm">Join</button>
        </div>
      </div>

      {msg && <p className="text-xs text-primary">{msg}</p>}

      <div className="space-y-2">
        {circles.map((c) => (
          <div key={c.id} className="bg-surface border border-border rounded-xl p-4 flex justify-between items-center">
            <div>
              <div className="font-semibold text-sm">{c.name}</div>
              <div className="text-[11px] text-muted-foreground">{c.memberCount} members • Code: {c.inviteCode}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
