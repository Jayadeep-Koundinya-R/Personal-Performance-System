import React, { useState } from 'react';
import { TRACK_PRESETS, TRACK_5_CHALLENGE } from '@/constants/onboardingPresets';
import { PrimaryTrackId } from '@/types/onboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GraduationCap, Award, Code2, Dumbbell, Flame, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export type AllTrackId = PrimaryTrackId | 'track_5_agni';

interface TrackDisplayItem {
  id: AllTrackId;
  title: string;
  badge: string;
  subtitle: string;
  icon: React.ReactNode;
}

const TRACK_ITEMS: TrackDisplayItem[] = [
  {
    id: 'placements',
    title: TRACK_PRESETS.placements.title,
    badge: TRACK_PRESETS.placements.badge,
    subtitle: TRACK_PRESETS.placements.subtitle,
    icon: <GraduationCap className="h-5 w-5 text-blue-500" />,
  },
  {
    id: 'competitive_exams',
    title: TRACK_PRESETS.competitive_exams.title,
    badge: TRACK_PRESETS.competitive_exams.badge,
    subtitle: TRACK_PRESETS.competitive_exams.subtitle,
    icon: <Award className="h-5 w-5 text-amber-500" />,
  },
  {
    id: 'core_coding',
    title: TRACK_PRESETS.core_coding.title,
    badge: TRACK_PRESETS.core_coding.badge,
    subtitle: TRACK_PRESETS.core_coding.subtitle,
    icon: <Code2 className="h-5 w-5 text-emerald-500" />,
  },
  {
    id: 'fitness',
    title: TRACK_PRESETS.fitness.title,
    badge: TRACK_PRESETS.fitness.badge,
    subtitle: TRACK_PRESETS.fitness.subtitle,
    icon: <Dumbbell className="h-5 w-5 text-rose-500" />,
  },
  {
    id: 'track_5_agni',
    title: TRACK_5_CHALLENGE.title,
    badge: TRACK_5_CHALLENGE.badge,
    subtitle: TRACK_5_CHALLENGE.tagline,
    icon: <Flame className="h-5 w-5 text-orange-500" />,
  },
];

export const TrackPreferenceSelector: React.FC = () => {
  const [activeTrack, setActiveTrack] = useState<AllTrackId>(() => {
    const saved = localStorage.getItem('pps_active_track') as AllTrackId;
    return saved || 'placements';
  });

  const [pendingTrack, setPendingTrack] = useState<TrackDisplayItem | null>(null);

  const handleCardClick = (track: TrackDisplayItem) => {
    if (track.id === activeTrack) return;
    setPendingTrack(track);
  };

  const handleConfirmSwitch = () => {
    if (!pendingTrack) return;

    const newTrackId = pendingTrack.id;
    setActiveTrack(newTrackId);
    localStorage.setItem('pps_active_track', newTrackId);

    toast.success(`Active focus track switched to ${pendingTrack.title}`, {
      description: 'Reloading dashboard layout to adapt context...',
    });

    setPendingTrack(null);

    // Trigger view reload so all widgets and track channels update context
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-extrabold flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Active Execution Track Focus
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Switch your primary execution track to customize dashboard widgets, channel streams, and habit recommendations.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {TRACK_ITEMS.map((track) => {
            const isActive = activeTrack === track.id;

            return (
              <div
                key={track.id}
                onClick={() => handleCardClick(track)}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative flex flex-col justify-between ${
                  isActive
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                    : 'border-border hover:border-muted-foreground/40 bg-card hover:bg-accent/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-background border shadow-2xs">
                        {track.icon}
                      </div>
                      <Badge variant={isActive ? 'default' : 'secondary'} className="text-[10px]">
                        {track.badge}
                      </Badge>
                    </div>

                    {isActive && (
                      <Badge className="bg-primary text-primary-foreground font-bold text-[10px] gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Active Focus
                      </Badge>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-foreground">{track.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {track.subtitle}
                  </p>
                </div>

                {!isActive && (
                  <div className="mt-3 pt-2 border-t border-border/50 text-right">
                    <span className="text-xs font-semibold text-primary hover:underline">
                      Switch to track →
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!pendingTrack} onOpenChange={(open) => !open && setPendingTrack(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch active track focus to {pendingTrack?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reconfigure your primary dashboard view, channel feeds, and target metrics to align with the <strong>{pendingTrack?.title}</strong> track. Your existing habit logs will remain preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSwitch} className="font-bold">
              Confirm Track Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
