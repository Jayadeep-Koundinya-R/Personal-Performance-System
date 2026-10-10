import React, { useState, useEffect } from 'react';
import { TRACK_PRESETS, TRACK_5_CHALLENGE } from '@/constants/onboardingPresets';
import { OnboardingWizardState, HabitItem } from '@/types/onboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Rocket, CheckCircle2, Flame, Edit3, Shield, Users, Clock, Sparkles, Loader2 } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface Props {
  state: OnboardingWizardState;
  updateState: (updates: Partial<OnboardingWizardState>) => void;
  onBack: () => void;
  onComplete: (payload: OnboardingWizardState) => void;
  isSubmitting?: boolean;
}

export const ScreenFinalReview: React.FC<Props> = ({ state, updateState, onBack, onComplete, isSubmitting }) => {
  const currentTrack = TRACK_PRESETS[state.selectedPrimaryTrack];

  // Compile initial habit list if customHabits is empty
  const [habits, setHabits] = useState<HabitItem[]>(() => {
    if (state.customHabits && state.customHabits.length > 0) {
      return state.customHabits;
    }
    const trackHabits = currentTrack ? currentTrack.anchorHabits : [];
    const challengeHabits = state.enableTrack5Challenge ? TRACK_5_CHALLENGE.habits : [];
    return [...trackHabits, ...challengeHabits];
  });

  const [enabledHabits, setEnabledHabits] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    habits.forEach((h) => {
      initial[h.id] = true;
    });
    return initial;
  });

  // Keep state.customHabits in sync
  useEffect(() => {
    const activeHabits = habits.filter((h) => enabledHabits[h.id]);
    updateState({ customHabits: activeHabits });
  }, [habits, enabledHabits]);

  const handleTitleChange = (id: string, newTitle: string) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, title: newTitle } : h))
    );
  };

  const handleToggleHabit = (id: string, checked: boolean) => {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    setEnabledHabits((prev) => ({ ...prev, [id]: checked }));
  };

  const handleLaunch = () => {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    const activeHabits = habits.filter((h) => enabledHabits[h.id]);
    const finalState: OnboardingWizardState = {
      ...state,
      customHabits: activeHabits,
    };
    onComplete(finalState);
  };

  const socialModeLabel =
    state.socialChoice === 'solo'
      ? 'Solo Mode'
      : state.socialChoice === 'create_squad'
      ? `Squad Creator (${state.joinSquadCode || 'Code Generated'})`
      : `Squad Member (${state.joinSquadCode})`;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Your Habit Blueprint & System Launch</h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
          Review your compiled starter habits. Edit titles or toggle habits on/off before launching your Personal Performance System.
        </p>
      </div>

      {/* Summary Pills */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Badge variant="outline" className="px-3 py-1.5 text-xs sm:text-sm font-semibold gap-1.5 border-primary/40 bg-primary/5">
          <Clock className="h-4 w-4 text-primary" />
          Target: {state.dailyFocusHours}h Deep Work / Day
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-xs sm:text-sm font-semibold gap-1.5 border-emerald-500/40 bg-emerald-500/5">
          <Users className="h-4 w-4 text-emerald-500" />
          {socialModeLabel}
        </Badge>
        {state.enableTrack5Challenge && (
          <Badge variant="outline" className="px-3 py-1.5 text-xs sm:text-sm font-semibold gap-1.5 border-orange-500/40 bg-orange-500/5 text-orange-600 dark:text-orange-400">
            <Flame className="h-4 w-4 text-orange-500" />
            Track 5 Agni Challenge Active
          </Badge>
        )}
      </div>

      {/* Starter Habits Card */}
      <Card className="border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Starter Habit Architecture
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              {habits.filter((h) => enabledHabits[h.id]).length} active habits
            </span>
          </CardTitle>
          <CardDescription>
            Inline edit habit titles or toggle off any habits you do not wish to include right now.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {habits.map((habit) => {
            const isEnabled = enabledHabits[habit.id] ?? true;
            const isAgni = habit.isChallengeHabit;

            return (
              <div
                key={habit.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isEnabled
                    ? isAgni
                      ? 'bg-orange-500/10 border-orange-500/30'
                      : 'bg-background border-border'
                    : 'bg-muted/40 border-dashed border-border opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Switch
                    id={`habit-switch-${habit.id}`}
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggleHabit(habit.id, checked)}
                  />

                  {isAgni ? (
                    <Badge variant="outline" className="bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30 font-bold shrink-0">
                      Track 5
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="capitalize shrink-0">
                      {habit.category.replace('_', ' ')}
                    </Badge>
                  )}

                  <div className="flex-1 min-w-0">
                    {isEnabled ? (
                      <Input
                        value={habit.title}
                        onChange={(e) => handleTitleChange(habit.id, e.target.value)}
                        className="h-8 text-xs sm:text-sm font-semibold bg-background/50 border-transparent hover:border-border focus:border-primary"
                      />
                    ) : (
                      <span className="text-xs sm:text-sm font-medium line-through text-muted-foreground px-3">
                        {habit.title}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground capitalize self-end sm:self-center shrink-0">
                  {habit.time_of_day}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button onClick={onBack} variant="outline" size="lg" className="gap-2 font-semibold">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={handleLaunch}
          disabled={isSubmitting}
          size="lg"
          className="gap-2 font-extrabold px-8 shadow-lg bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Initializing System...
            </>
          ) : (
            <>
              <Rocket className="h-5 w-5 animate-bounce" />
              Launch Personal Performance System
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
