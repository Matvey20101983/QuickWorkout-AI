import type { DurationOption, EnergyLevel, TargetZone } from './types';

export interface AppSettings {
  weeklyGoal: number;
  defaultZone: TargetZone;
  defaultDuration: DurationOption;
  defaultEnergy: EnergyLevel;
}

export const DEFAULT_SETTINGS: AppSettings = {
  weeklyGoal: 3,
  defaultZone: 'full_body',
  defaultDuration: 12,
  defaultEnergy: 3,
};

const STORAGE_KEY = 'quickworkout_settings';

const VALID_ZONES: TargetZone[] = ['back_neck', 'core', 'full_body'];
const VALID_DURATIONS: DurationOption[] = [7, 12, 15];

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      weeklyGoal:
        typeof parsed.weeklyGoal === 'number' && parsed.weeklyGoal >= 1 && parsed.weeklyGoal <= 14
          ? Math.round(parsed.weeklyGoal)
          : DEFAULT_SETTINGS.weeklyGoal,
      defaultZone: VALID_ZONES.includes(parsed.defaultZone as TargetZone)
        ? (parsed.defaultZone as TargetZone)
        : DEFAULT_SETTINGS.defaultZone,
      defaultDuration: VALID_DURATIONS.includes(parsed.defaultDuration as DurationOption)
        ? (parsed.defaultDuration as DurationOption)
        : DEFAULT_SETTINGS.defaultDuration,
      defaultEnergy:
        typeof parsed.defaultEnergy === 'number' &&
        parsed.defaultEnergy >= 1 &&
        parsed.defaultEnergy <= 5
          ? (Math.round(parsed.defaultEnergy) as EnergyLevel)
          : DEFAULT_SETTINGS.defaultEnergy,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
