import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { OnboardingWizardState } from '@/types/onboarding';
import { useUserSettings } from '@/hooks/use-user-settings';
import { useHabits } from '@/hooks/use-habits';
import { toast } from 'sonner';

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

      // 2. Add the configured starter habits
      if (payload.customHabits && payload.customHabits.length > 0) {
        for (const habit of payload.customHabits) {
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
        }
      }

      // 3. Mark onboarding as completed in settings / database
      await completeOnboarding();

      toast.success('Personal Performance System initialized!', {
        description: 'Your execution track and starter habits have been activated.',
      });

      // 4. Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      toast.error('Failed to complete onboarding. Redirecting to dashboard...');
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Brand Logo Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black tracking-widest uppercase">
            ⚡ Personal Performance System
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Onboarding Engine</h1>
        </div>

        {/* Wizard Container */}
        <OnboardingWizard onComplete={handleComplete} />
      </div>
    </div>
  );
}
