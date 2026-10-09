import React, { useState } from 'react';
import { OnboardingWizardState } from '@/types/onboarding';
import { TRACK_PRESETS } from '@/constants/onboardingPresets';
import { ScreenTrackSelection } from './ScreenTrackSelection';
import { ScreenTrackDrill } from './ScreenTrackDrill';
import { ScreenSocialBridge } from './ScreenSocialBridge';
import { ScreenFinalReview } from './ScreenFinalReview';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface Props {
  initialState?: Partial<OnboardingWizardState>;
  onComplete: (payload: OnboardingWizardState) => void;
}

const STEP_TITLES = [
  'Execution Track',
  'Focus & Bottlenecks',
  'Accountability',
  'Habit Blueprint',
];

export const OnboardingWizard: React.FC<Props> = ({ initialState, onComplete }) => {
  const [step, setStep] = useState<number>(1);
  const [wizardState, setWizardState] = useState<OnboardingWizardState>({
    selectedPrimaryTrack: initialState?.selectedPrimaryTrack || 'placements',
    enableTrack5Challenge: initialState?.enableTrack5Challenge ?? true,
    dailyFocusHours: initialState?.dailyFocusHours || TRACK_PRESETS.placements.defaultFocusHours,
    selectedBottleneckId: initialState?.selectedBottleneckId || TRACK_PRESETS.placements.bottlenecks[0].id,
    customHabits: initialState?.customHabits || [],
    socialChoice: initialState?.socialChoice || 'solo',
    joinSquadCode: initialState?.joinSquadCode || '',
  });

  const updateState = (updates: Partial<OnboardingWizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }));
  };

  const handleNextStep = () => {
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBackStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const progressPercentage = (step / 4) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Header & Step Progress Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-muted-foreground">
          <span>Step {step} of 4</span>
          <span className="text-primary font-bold">{STEP_TITLES[step - 1]}</span>
        </div>

        <Progress value={progressPercentage} className="h-2.5 transition-all duration-300" />

        {/* Step Indicators */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {STEP_TITLES.map((title, idx) => {
            const stepNum = idx + 1;
            const isCompleted = step > stepNum;
            const isCurrent = step === stepNum;

            return (
              <div
                key={title}
                onClick={() => {
                  // Only allow jumping back to completed steps
                  if (stepNum < step) setStep(stepNum);
                }}
                className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold transition-all ${
                  stepNum < step ? 'cursor-pointer hover:bg-accent' : 'cursor-default'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                      ? 'bg-primary/20 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : stepNum}
                </div>
                <span className={`hidden sm:inline truncate ${isCurrent ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                  {title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Screen Render Container */}
      <Card className="p-4 sm:p-8 shadow-xl border-border/80 bg-card/95 backdrop-blur-sm">
        {step === 1 && (
          <ScreenTrackSelection
            state={wizardState}
            updateState={updateState}
            onNext={handleNextStep}
          />
        )}

        {step === 2 && (
          <ScreenTrackDrill
            state={wizardState}
            updateState={updateState}
            onBack={handleBackStep}
            onNext={handleNextStep}
          />
        )}

        {step === 3 && (
          <ScreenSocialBridge
            state={wizardState}
            updateState={updateState}
            onBack={handleBackStep}
            onNext={handleNextStep}
          />
        )}

        {step === 4 && (
          <ScreenFinalReview
            state={wizardState}
            updateState={updateState}
            onBack={handleBackStep}
            onComplete={onComplete}
          />
        )}
      </Card>
    </div>
  );
};
