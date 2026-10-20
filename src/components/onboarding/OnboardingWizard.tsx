import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  onComplete?: (payload: OnboardingWizardState) => void;
}

const STEP_TITLES = [
  'Execution Track',
  'Focus & Bottlenecks',
  'Accountability',
  'Habit Blueprint',
];

export const OnboardingWizard: React.FC<Props> = ({ initialState, onComplete }) => {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [wizardState, setWizardState] = useState<OnboardingWizardState>({
    selectedPrimaryTrack: initialState?.selectedPrimaryTrack || 'placements',
    enableTrack5Challenge: initialState?.enableTrack5Challenge ?? true,
    dailyFocusHours: initialState?.dailyFocusHours || TRACK_PRESETS.placements.defaultFocusHours,
    selectedBottleneckId: initialState?.selectedBottleneckId || TRACK_PRESETS.placements.bottlenecks[0].id,
    customHabits: initialState?.customHabits || [],
    socialChoice: initialState?.socialChoice || 'solo',
    joinSquadCode: initialState?.joinSquadCode || '',
  });

  // Capacitor hardware back button handling
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: { remove: () => Promise<void> } | undefined;

    App.addListener('backButton', () => {
      setStep((prev) => {
        if (prev > 1) {
          return prev - 1;
        } else {
          App.exitApp().catch(() => {});
          return prev;
        }
      });
    }).then((handle) => {
      listenerHandle = handle;
    }).catch(() => {});

    return () => {
      if (listenerHandle) {
        listenerHandle.remove().catch(() => {});
      }
    };
  }, []);

  const updateState = (updates: Partial<OnboardingWizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }));
  };

  const handleNextStep = () => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBackStep = () => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSkipToDashboard = () => {
    try {
      localStorage.setItem('pps_onboarding_completed', 'true');
      localStorage.setItem('pps_onboarded_guest', 'true');
      localStorage.setItem('pps_guest_onboarded', 'true');
      localStorage.setItem('pps_skip_onboarding', 'true');
      localStorage.setItem('pps_active_track', wizardState.selectedPrimaryTrack);
    } catch {}

    if (onComplete) {
      try {
        onComplete(wizardState);
      } catch {}
    }
    navigate('/dashboard', { replace: true });
  };

  const handleCompleteOnboarding = async (state: OnboardingWizardState) => {
    setIsSubmitting(true);
    try {
      // 1. Immediately persist configuration in localStorage so the user is never trapped
      localStorage.setItem('pps_onboarding_completed', 'true');
      localStorage.setItem('pps_onboarded_guest', 'true');
      localStorage.setItem('pps_guest_onboarded', 'true');
      localStorage.setItem('pps_active_track', state.selectedPrimaryTrack);
      localStorage.setItem('pps_track5_enabled', String(state.enableTrack5Challenge));
      localStorage.setItem('pps_daily_focus_hours', String(state.dailyFocusHours));
      localStorage.setItem('pps_bottleneck_id', state.selectedBottleneckId);
      localStorage.setItem('pps_social_choice', state.socialChoice);
      if (state.joinSquadCode) {
        localStorage.setItem('pps_squad_code', state.joinSquadCode);
      }

      // 2. Defensively attempt backend RPC if present in Supabase
      try {
        const { error } = await supabase.rpc('complete_onboarding', {
          p_payload: state,
        });
        if (error) {
          console.warn('Backend complete_onboarding RPC unavailable (falling back to client persistence):', error.message);
        }
      } catch (rpcErr) {
        console.warn('Backend complete_onboarding RPC call skipped:', rpcErr);
      }

      // 3. Trigger success haptic on mobile
      if (Capacitor.isNativePlatform()) {
        await Haptics.notification({ type: NotificationType.Success }).catch(() => {});
      }

      // 4. Invalidate active user profile query
      if (queryClient) {
        try {
          queryClient.invalidateQueries({ queryKey: ['profile'] });
        } catch {}
      }

      // 5. Invoke parent onComplete callback
      if (onComplete) {
        try {
          await onComplete(state);
        } catch (onCompleteErr) {
          console.warn('onComplete callback notice:', onCompleteErr);
        }
      }

      // 6. Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.warn('Onboarding completion fallback:', err);
      if (onComplete) {
        try {
          await onComplete(state);
        } catch {}
      }
      navigate('/dashboard', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (step / 4) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Header & Step Progress Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Step {step} of 4</span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-primary font-bold">{STEP_TITLES[step - 1]}</span>
          </div>
          <button
            type="button"
            onClick={handleSkipToDashboard}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors cursor-pointer flex items-center gap-1 font-medium"
          >
            <span>Skip to Dashboard</span>
            <span>→</span>
          </button>
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
                  if (stepNum < step) {
                    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                    setStep(stepNum);
                  }
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
            onComplete={handleCompleteOnboarding}
            isSubmitting={isSubmitting}
          />
        )}
      </Card>
    </div>
  );
};
