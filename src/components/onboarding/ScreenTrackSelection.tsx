import React from 'react';
import { TRACK_PRESETS, TRACK_5_CHALLENGE } from '@/constants/onboardingPresets';
import { PrimaryTrackId, OnboardingWizardState } from '@/types/onboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Flame, CheckCircle2, ArrowRight, Compass, ShieldAlert, Award, Dumbbell, Code2, GraduationCap } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface Props {
  state: OnboardingWizardState;
  updateState: (updates: Partial<OnboardingWizardState>) => void;
  onNext: () => void;
}

const TRACK_ICONS: Record<PrimaryTrackId, React.ReactNode> = {
  placements: <GraduationCap className="h-6 w-6 text-blue-500" />,
  competitive_exams: <Award className="h-6 w-6 text-amber-500" />,
  core_coding: <Code2 className="h-6 w-6 text-emerald-500" />,
  fitness: <Dumbbell className="h-6 w-6 text-rose-500" />,
};

export const ScreenTrackSelection: React.FC<Props> = ({ state, updateState, onNext }) => {
  const tracks = Object.values(TRACK_PRESETS);

  const handleSelectTrack = (trackId: PrimaryTrackId) => {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    const preset = TRACK_PRESETS[trackId];
    updateState({
      selectedPrimaryTrack: trackId,
      dailyFocusHours: preset.defaultFocusHours,
      selectedBottleneckId: preset.bottlenecks[0]?.id || '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Choose Your Execution Track</h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
          Select your primary goal focus. You can customize target drill hours and habits in the next step.
        </p>
      </div>

      {/* 4 Primary Tracks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tracks.map((track) => {
          const isSelected = state.selectedPrimaryTrack === track.id;
          return (
            <Card
              key={track.id}
              onClick={() => handleSelectTrack(track.id)}
              className={`cursor-pointer transition-all duration-200 hover:border-primary border-2 relative overflow-hidden ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md'
                  : 'border-border hover:bg-accent/40'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 text-primary">
                  <CheckCircle2 className="h-5 w-5 fill-primary text-primary-foreground" />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background border shadow-sm">
                    {TRACK_ICONS[track.id]}
                  </div>
                  <div>
                    <Badge variant={isSelected ? "default" : "secondary"} className="mb-1">
                      {track.badge}
                    </Badge>
                    <CardTitle className="text-lg font-bold">{track.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {track.subtitle}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Track 5 (Agni Challenge Track) Highlight Card */}
      <Card className="border-2 border-orange-500/40 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-red-500/10 relative overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/20 text-orange-500 border border-orange-500/30">
                <Flame className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {TRACK_5_CHALLENGE.title}
                  </CardTitle>
                  <Badge variant="outline" className="border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-500/10">
                    Overlay Track
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {TRACK_5_CHALLENGE.tagline}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="track5-toggle"
                checked={state.enableTrack5Challenge}
                onCheckedChange={(checked) => {
                  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                  updateState({ enableTrack5Challenge: checked });
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 border text-xs sm:text-sm space-y-2">
            <div className="font-semibold text-foreground flex items-center gap-2">
              <Compass className="h-4 w-4 text-orange-500" />
              Track 5 Discipline Layer Includes:
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
              {TRACK_5_CHALLENGE.habits.map((h) => (
                <li key={h.id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>{h.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Primary CTA */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
            onNext();
          }}
          disabled={!state.selectedPrimaryTrack}
          size="lg"
          className="gap-2 font-bold px-8 shadow-md"
        >
          Next: Customize Drill
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
