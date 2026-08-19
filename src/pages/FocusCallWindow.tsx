import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { DashboardProviders } from "@/providers/AppProviders";
import { FocusRoomStudio } from "@/components/focus-rooms/FocusRoomStudio";

const FocusCallWindowInner: React.FC = () => {
  const { groupId = "default_group" } = useParams<{ groupId: string }>();
  const [searchParams] = useSearchParams();
  const groupName = searchParams.get("name") || "Study Squad Focus Room";

  return (
    <div className="min-h-screen bg-[#0d0f17] text-foreground p-3 sm:p-4 flex flex-col justify-between overflow-hidden selection:bg-primary selection:text-white">
      {/* 3D Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-secondary/20 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col h-full">
        <FocusRoomStudio
          groupId={groupId}
          groupName={groupName}
          onClose={() => window.close()}
        />
      </div>
    </div>
  );
};

export const FocusCallWindow: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0f17] text-foreground">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-pulse">⚡</div>
          <div className="text-xs font-mono text-muted-foreground">Initializing Focus Room Studio...</div>
        </div>
      </div>
    );
  }

  const currentUser = user || {
    id: "guest_local",
    email: "guest@pps.local",
    isGuest: true,
  };

  return (
    <DashboardProviders user={currentUser}>
      <FocusCallWindowInner />
    </DashboardProviders>
  );
};

export default FocusCallWindow;
