import { describe, it, expect, beforeEach } from 'vitest';
import {
  COACH_PERSONAS,
  getCoachPersona,
  getAllCoachPersonas,
  formatCoachNudge,
  getActivePersonaId,
  setActivePersonaId,
  PERSONA_STORAGE_KEY,
} from '../coachPersonas';

describe('Coach Personas & Tone Engine (Task 3.1)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defines all three core personas: agni_fire, vayu_flow, prana_calm', () => {
    const personas = getAllCoachPersonas();
    expect(personas).toHaveLength(3);

    const ids = personas.map((p) => p.id);
    expect(ids).toContain('agni_fire');
    expect(ids).toContain('vayu_flow');
    expect(ids).toContain('prana_calm');
  });

  it('provides comprehensive domain definitions for Agni Fire', () => {
    const agni = getCoachPersona('agni_fire');
    expect(agni.name).toBe('Agni Fire');
    expect(agni.avatar).toBe('🔥');
    expect(agni.systemPrompt).toContain('Agni Fire');
    expect(agni.systemPrompt).toContain('zero-excuse');
    expect(agni.sampleNudges.fallingBehind.length).toBeGreaterThan(0);
  });

  it('provides comprehensive domain definitions for Vayu Flow', () => {
    const vayu = getCoachPersona('vayu_flow');
    expect(vayu.name).toBe('Vayu Flow');
    expect(vayu.avatar).toBe('🌬️');
    expect(vayu.systemPrompt).toContain('circadian');
    expect(vayu.systemPrompt).toContain('energy');
  });

  it('provides comprehensive domain definitions for Prana Calm', () => {
    const prana = getCoachPersona('prana_calm');
    expect(prana.name).toBe('Prana Calm');
    expect(prana.avatar).toBe('🌿');
    expect(prana.systemPrompt).toContain('Prana Calm');
    expect(prana.systemPrompt).toContain('burnout');
  });

  it('falls back to vayu_flow for unknown persona keys', () => {
    const fallback = getCoachPersona('unknown_random_key');
    expect(fallback.id).toBe('vayu_flow');
  });

  describe('formatCoachNudge()', () => {
    it('formats high-urgency falling-behind nudge for agni_fire', () => {
      const nudge = formatCoachNudge('agni_fire', {
        taskTitle: 'OS Kernel Lab',
        minutesBehind: 45,
        streakCount: 12,
      });

      expect(nudge).toContain('45m behind schedule');
      expect(nudge).toContain('OS Kernel Lab');
      expect(nudge).toContain('12-day streak');
      expect(nudge).toContain('Kill all distractions');
    });

    it('formats circadian rebalancing falling-behind nudge for vayu_flow', () => {
      const nudge = formatCoachNudge('vayu_flow', {
        taskTitle: 'Data Structures',
        minutesBehind: 30,
        streakCount: 5,
      });

      expect(nudge).toContain('running 30m behind');
      expect(nudge).toContain('Data Structures');
      expect(nudge).toContain('Buffer compressed');
      expect(nudge).toContain('25m sprint');
    });

    it('formats compassionate empathetic falling-behind nudge for prana_calm', () => {
      const nudge = formatCoachNudge('prana_calm', {
        taskTitle: 'Deep Reading',
        minutesBehind: 20,
        streakCount: 3,
      });

      expect(nudge).toContain('Take a deep breath');
      expect(nudge).toContain('Deep Reading');
      expect(nudge).toContain('2-minute start');
    });

    it('formats high streak celebrations correctly across personas', () => {
      const agniNudge = formatCoachNudge('agni_fire', {
        taskTitle: 'Morning Run',
        minutesBehind: 0,
        streakCount: 14,
      });
      expect(agniNudge).toContain('14 days');
      expect(agniNudge).toContain('Champions compound daily');

      const vayuNudge = formatCoachNudge('vayu_flow', {
        taskTitle: 'Morning Run',
        minutesBehind: 0,
        streakCount: 14,
      });
      expect(vayuNudge).toContain('14-day cadence');

      const pranaNudge = formatCoachNudge('prana_calm', {
        taskTitle: 'Morning Run',
        minutesBehind: 0,
        streakCount: 14,
      });
      expect(pranaNudge).toContain('14 days in a row');
    });
  });

  describe('Active Persona Persistence', () => {
    it('defaults to vayu_flow when localStorage is empty', () => {
      expect(getActivePersonaId()).toBe('vayu_flow');
    });

    it('stores and retrieves active persona', () => {
      setActivePersonaId('agni_fire');
      expect(getActivePersonaId()).toBe('agni_fire');
      expect(localStorage.getItem(PERSONA_STORAGE_KEY)).toBe('agni_fire');

      setActivePersonaId('prana_calm');
      expect(getActivePersonaId()).toBe('prana_calm');
    });
  });
});
