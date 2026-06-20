import { ReactNode } from "react";
import { User } from "@/hooks/use-auth";
import { SubscriptionProvider } from "@/hooks/use-subscription";
import { ProfileProvider } from "@/hooks/use-profile";
import { UserSettingsProvider } from "@/hooks/use-user-settings";
import { ReflectionsProvider } from "@/hooks/use-reflections";
import { RemindersProvider } from "@/hooks/use-reminders";
import { HabitsProvider } from "@/hooks/use-habits";
import { NotificationProvider } from "@/hooks/use-notifications";
import { useSubscription } from "@/hooks/use-subscription";
import { useHabits } from "@/hooks/use-habits";

function NotificationBridge({ children, user }: { children: ReactNode; user: User }) {
  const { habits } = useHabits();
  return (
    <NotificationProvider
      userId={user.id}
      userEmail={user.email}
      isGuest={user.isGuest}
      habits={habits}
    >
      {children}
    </NotificationProvider>
  );
}

function DataProviders({ children, user }: { children: ReactNode; user: User }) {
  return (
    <SubscriptionProvider userId={user.id} isGuest={user.isGuest}>
      <LimitsBridge user={user}>{children}</LimitsBridge>
    </SubscriptionProvider>
  );
}

function LimitsBridge({ children, user }: { children: ReactNode; user: User }) {
  const { limits } = useSubscription();
  return (
    <ProfileProvider userId={user.id} isGuest={user.isGuest}>
      <UserSettingsProvider userId={user.id} userEmail={user.email} isGuest={user.isGuest}>
        <ReflectionsProvider
          userId={user.id}
          userEmail={user.email}
          isGuest={user.isGuest}
          historyDays={limits.reflectionHistoryDays}
        >
          <RemindersProvider
            userId={user.id}
            userEmail={user.email}
            isGuest={user.isGuest}
            maxReminders={limits.maxReminders}
          >
            <HabitsProvider userEmail={user.email} userId={user.id} maxHabits={limits.maxHabits}>
              <NotificationBridge user={user}>{children}</NotificationBridge>
            </HabitsProvider>
          </RemindersProvider>
        </ReflectionsProvider>
      </UserSettingsProvider>
    </ProfileProvider>
  );
}

export function DashboardProviders({ children, user }: { children: ReactNode; user: User }) {
  return <DataProviders user={user}>{children}</DataProviders>;
}
