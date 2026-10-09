import React from 'react';
import { TRACK_PRESETS } from '@/constants/onboardingPresets';
import { OnboardingWizardState } from '@/types/onboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Clock, Target, TrendingUp, Zap } from 'lucide-react';

interface Props {
  state: OnboardingWizardState;
  updateState: (updates: Partial<OnboardingWizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ScreenTrackDrill: React.FC<Props> = ({ state, updateState, onBack, onNext }) => {
  const currentTrack = TRACK_PRESETS[state.selectedPrimaryTrack];

  if (!currentTrack) {
    return null;
  }

  const weeklyFocusHours = state.dailyFocusHours * 7;
  const monthlyFocusHours = state.dailyFocusHours * 30;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Badge variant="outline" className="text-primary border-primary/30">
          Track: {currentTrack.title}
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Customize Focus Target & Bottleneck</h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
          Configure your daily deep work capacity and identify the key bottleneck you want to crush.
        </p>
      </div>

      {/* Focus Hours Selector */}
      <Card className="border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Daily Focus Target
          </CardTitle>
          <CardDescription>
            How many dedicated deep work hours can you commit each day?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {currentTrack.allowedHours.map((hours) => {
              const isSelected = state.dailyFocusHours === hours;
              const isMax = hours === currentTrack.allowedHours[currentTrack.allowedHours.length - 1] && hours >= 5;
              const label = isMax ? `${hours}h+` : `${hours}h`;

              return (
                <button
                  key={hours}
                  type="button"
                  onClick={() => updateState({ dailyFocusHours: hours })}
                  className={`px-5 py-3 rounded-xl border-2 font-bold text-sm sm:text-base transition-all duration-150 flex items-center gap-2 ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground shadow-md scale-105'
                      : 'border-border bg-background hover:bg-accent text-foreground'
                  }`}
                >
                  <Zap className={`h-4 w-4 ${isSelected ? 'text-primary-foreground' : 'text-primary'}`} />
                  {label} / day
                </button>
              );
            })}
          </div>

          {/* Dynamic Real-time Output Preview */}
          <div className="bg-muted/60 rounded-xl p-4 border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Estimated Weekly Output
                </div>
                <div className="text-xl font-extrabold text-foreground">
                  {weeklyFocusHours} Hours / Week
                </div>
              </div>
            </div>

            <div className="text-right border-t sm:border-t-0 sm:border-l pt-2 sm:pt-0 sm:pl-4 border-border w-full sm:w-auto">
              <div className="text-xs text-muted-foreground">Monthly Compound Output</div>
              <div className="text-base font-bold text-primary">~{monthlyFocusHours} Deep Work Hours</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Bottleneck Selection (Radio Cards) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Primary Execution Bottleneck</h3>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          What is the single biggest blocker preventing you from hitting your target goal?
        </p>

        <div className="grid grid-cols-1 gap-3">
          {currentTrack.bottlenecks.map((bottleneck) => {
            const isSelected = state.selectedBottleneckId === bottleneck.id;

            return (
              <div
                key={bottleneck.id}
                onClick={() => updateState({ selectedBottleneckId: bottleneck.id })}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-muted-foreground/40 bg-background'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="bottleneck"
                    checked={isSelected}
                    onChange={() => updateState({ selectedBottleneckId: bottleneck.id })}
                    className="mt-1 h-4 w-4 text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="font-bold text-sm sm:text-base text-foreground">{bottleneck.label}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">{bottleneck.description}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button onClick={onBack} variant="outline" size="lg" className="gap-2 font-semibold">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!state.selectedBottleneckId}
          size="lg"
          className="gap-2 font-bold px-8 shadow-md"
        >
          Next: Accountability
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
