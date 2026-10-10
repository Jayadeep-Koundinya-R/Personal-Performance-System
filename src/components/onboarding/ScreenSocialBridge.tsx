import React from 'react';
import { OnboardingWizardState } from '@/types/onboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, User, Users, UserPlus, GraduationCap, Copy, Check, Sparkles, Lock } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface Props {
  state: OnboardingWizardState;
  updateState: (updates: Partial<OnboardingWizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

function generateSquadCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const ScreenSocialBridge: React.FC<Props> = ({ state, updateState, onBack, onNext }) => {
  const [copied, setCopied] = React.useState(false);

  const handleSelectSocialChoice = (choice: 'solo' | 'create_squad' | 'join_squad') => {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    let squadCode = state.joinSquadCode;
    if (choice === 'create_squad' && !squadCode) {
      squadCode = generateSquadCode();
    }
    updateState({
      socialChoice: choice,
      joinSquadCode: squadCode,
    });
  };

  const handleCopyCode = () => {
    if (state.joinSquadCode) {
      navigator.clipboard.writeText(state.joinSquadCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isNextDisabled = state.socialChoice === 'join_squad' && state.joinSquadCode.trim().length < 6;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Social Accountability Bridge</h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
          Social pressure and peer consistency drive 3.4x higher habit adherence. How do you want to execute?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Solo Focus */}
        <Card
          onClick={() => handleSelectSocialChoice('solo')}
          className={`cursor-pointer border-2 transition-all ${
            state.socialChoice === 'solo'
              ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-md'
              : 'border-border hover:bg-accent/40'
          }`}
        >
          <CardHeader className="pb-2">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary w-fit mb-2">
              <User className="h-6 w-6" />
            </div>
            <CardTitle className="text-base font-bold">Solo Focus</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs sm:text-sm">
              "I prefer grinding alone for now." Focus independently with solo habit tracking and private metrics.
            </CardDescription>
          </CardContent>
        </Card>

        {/* Card 2: Create a Squad */}
        <Card
          onClick={() => handleSelectSocialChoice('create_squad')}
          className={`cursor-pointer border-2 transition-all ${
            state.socialChoice === 'create_squad'
              ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-md'
              : 'border-border hover:bg-accent/40'
          }`}
        >
          <CardHeader className="pb-2">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 w-fit mb-2">
              <Users className="h-6 w-6" />
            </div>
            <CardTitle className="text-base font-bold">Create a Squad</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs sm:text-sm">
              Generate a 6-character squad code for friends (WhatsApp invite link ready on dashboard).
            </CardDescription>
          </CardContent>
        </Card>

        {/* Card 3: Join Existing Squad */}
        <Card
          onClick={() => handleSelectSocialChoice('join_squad')}
          className={`cursor-pointer border-2 transition-all ${
            state.socialChoice === 'join_squad'
              ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-md'
              : 'border-border hover:bg-accent/40'
          }`}
        >
          <CardHeader className="pb-2">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500 w-fit mb-2">
              <UserPlus className="h-6 w-6" />
            </div>
            <CardTitle className="text-base font-bold">Join Existing Squad</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs sm:text-sm">
              Join a squad created by a friend or study partner using an invite code.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Input Details for Selected Choice */}
      {state.socialChoice === 'create_squad' && (
        <Card className="border bg-emerald-500/5 border-emerald-500/30">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <Sparkles className="h-4 w-4" />
              Your Generated Squad Invite Code
            </div>
            <div className="flex items-center gap-3">
              <div className="font-mono text-2xl font-black tracking-widest px-4 py-2 bg-background border rounded-lg text-foreground">
                {state.joinSquadCode || 'SQUAD6'}
              </div>
              <Button onClick={handleCopyCode} variant="outline" size="sm" className="gap-2">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this code with your peer group. They can enter this during onboarding or in Squad settings.
            </p>
          </CardContent>
        </Card>
      )}

      {state.socialChoice === 'join_squad' && (
        <Card className="border bg-blue-500/5 border-blue-500/30">
          <CardContent className="pt-6 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Enter 6-Character Squad Code
            </label>
            <Input
              value={state.joinSquadCode}
              onChange={(e) =>
                updateState({ joinSquadCode: e.target.value.toUpperCase().slice(0, 6) })
              }
              placeholder="E.g. X7K9P2"
              maxLength={6}
              className="font-mono text-lg font-bold tracking-widest max-w-xs uppercase"
            />
            {state.joinSquadCode.length > 0 && state.joinSquadCode.length < 6 && (
              <p className="text-xs text-amber-500 font-medium">Please enter a 6-character code.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Classroom & Teacher Organization Card */}
      <Card className="border border-border/80 bg-muted/40 relative opacity-80 hover:opacity-100 transition-opacity">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  Join School / College Classroom
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-bold text-[10px]">
                    Coming Soon (v2.0)
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Institutional classrooms, faculty dashboards, and university cohort challenges.
                </CardDescription>
              </div>
            </div>
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Teacher & institutional cohort integration launching in future update.
          </p>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button onClick={onBack} variant="outline" size="lg" className="gap-2 font-semibold">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => {
            Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
            onNext();
          }}
          disabled={isNextDisabled}
          size="lg"
          className="gap-2 font-bold px-8 shadow-md"
        >
          Next: Final Review
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
