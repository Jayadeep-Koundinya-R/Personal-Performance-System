import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { OnboardingWizardState } from '@/types/onboarding';
import { useUserSettings } from '@/hooks/use-user-settings';
import { useHabits } from '@/hooks/use-habits';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/BrandLogo';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { completeOnboarding } = useUserSettings();
  const { addHabit } = useHabits();

  const handleComplete = async (payload: OnboardingWizardState) => {
    try {
      // 1. Store active track focus in localStorage
      localStorage.setItem('pps_active_track', payload.selectedPrimaryTrack);
      localStorage.setItem('pps_track5_enabled', String(payload.enableTrack5Challenge));
      localStorage.setItem('pps_daily_focus_hours', String(payload.dailyFocusHours));
      localStorage.setItem('pps_bottleneck_id', payload.selectedBottleneckId);
      localStorage.setItem('pps_social_choice', payload.socialChoice);
      if (payload.joinSquadCode) {
        localStorage.setItem('pps_squad_code', payload.joinSquadCode);
      }

      // 2. Add the configured starter habits defensively
      if (payload.customHabits && payload.customHabits.length > 0) {
        for (const habit of payload.customHabits) {
          try {
            await addHabit(
              habit.title,
              habit.category,
              'Daily',
              habit.isChallengeHabit ? 'High' : 'Medium',
              null,
              null,
              null,
              habit.isChallengeHabit ? 'amber' : 'indigo'
            );
          } catch (habitErr) {
            console.warn('Starter habit insertion skipped:', habitErr);
          }
        }
      }

      // 3. Mark onboarding as completed in settings / database
      try {
        await completeOnboarding();
      } catch (settingsErr) {
        console.warn('completeOnboarding settings sync notice:', settingsErr);
      }

      localStorage.setItem('pps_onboarding_completed', 'true');
      localStorage.setItem('pps_onboarded_guest', 'true');
      localStorage.setItem('pps_guest_onboarded', 'true');

      toast.success('Personal Performance System initialized!', {
        description: 'Your execution track and starter habits have been activated.',
      });

      // 4. Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.warn('Onboarding completion note:', err);
      localStorage.setItem('pps_onboarding_completed', 'true');
      localStorage.setItem('pps_onboarded_guest', 'true');
      localStorage.setItem('pps_guest_onboarded', 'true');
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Brand Logo Header */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <BrandLogo size="lg" variant="square" />
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Onboarding Engine</h1>
        </div>

        {/* Wizard Container */}
        <OnboardingWizard onComplete={handleComplete} />
      </div>
    </div>
  );
}
