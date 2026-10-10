import React, { lazy, Suspense } from 'react';
import { useAuth, User } from '@/hooks/use-auth';
import { TrackPreferenceSelector } from '@/components/settings/TrackPreferenceSelector';
import { Loader2 } from 'lucide-react';

const SettingsSection = lazy(() => import('@/components/sections/SettingsSection'));

export default function SettingsPage() {
  const { user } = useAuth();
  const currentUser: User = user || { email: null, isGuest: true };

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Active Track & Discipline Section */}
        <section className="space-y-4" id="active-track-discipline-section">
          <div className="border-b pb-3">
            <h2 className="text-2xl font-black tracking-tight">Active Track & Discipline</h2>
            <p className="text-sm text-muted-foreground">
              Configure your primary focus discipline, circadian challenge layer, and cohort track.
            </p>
          </div>
          <TrackPreferenceSelector />
        </section>

        {/* Core Settings Studio */}
        <Suspense
          fallback={
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          }
        >
          <SettingsSection user={currentUser} />
        </Suspense>
      </div>
    </div>
  );
}
