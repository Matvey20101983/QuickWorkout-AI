import type { HistoryEntry } from './history';
import { getStats, type HistoryStats } from './history';

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** 0..1 */
  progress: (entries: HistoryEntry[], stats: HistoryStats) => number;
}

export const BADGES: Badge[] = [
  { id: 'first_workout', title: 'Перший крок', description: 'Заверши перше тренування', icon: '🏁', progress: (e) => Math.min(1, e.length / 1) },
  { id: 'three_workouts', title: 'Розігрів', description: '3 тренування', icon: '🔥', progress: (e) => Math.min(1, e.length / 3) },
  { id: 'ten_workouts', title: 'У ритмі', description: '10 тренувань', icon: '💪', progress: (e) => Math.min(1, e.length / 10) },
  { id: 'twenty_five', title: 'Звичка', description: '25 тренувань', icon: '⚡', progress: (e) => Math.min(1, e.length / 25) },
  { id: 'fifty_workouts', title: 'Легенда', description: '50 тренувань', icon: '🏆', progress: (e) => Math.min(1, e.length / 50) },
  { id: 'first_ai', title: 'AI-тренер', description: 'Згенеруй тренування через AI', icon: '🤖', progress: (e) => (e.some((x) => x.source === 'ai') ? 1 : 0) },
  { id: 'all_zones', title: 'Універсал', description: 'Спробуй усі 3 зони', icon: '🎯', progress: (e) => Math.min(1, new Set(e.map((x) => x.zone)).size / 3) },
  { id: 'full_body_five', title: 'Усе тіло ×5', description: '5 тренувань «Усе тіло»', icon: '🔥', progress: (e) => Math.min(1, e.filter((x) => x.zone === 'full_body').length / 5) },
  { id: 'no_skip', title: 'Без пропусків', description: 'Заверши тренування без пропуску', icon: '✅', progress: (e) => (e.some((x) => !x.skipped) ? 1 : 0) },
  { id: 'streak_3', title: '3 дні поспіль', description: 'Тренуйся 3 дні підряд', icon: '📅', progress: (_e, s) => Math.min(1, s.currentStreak / 3) },
  { id: 'streak_7', title: 'Тиждень сили', description: '7 днів поспіль', icon: '🗓️', progress: (_e, s) => Math.min(1, s.currentStreak / 7) },
  { id: 'minutes_60', title: 'Година', description: '60 хвилин сумарно', icon: '⏱️', progress: (_e, s) => Math.min(1, s.totalMinutes / 60) },
  { id: 'minutes_300', title: 'Марафонець', description: '300 хвилин сумарно', icon: '🏃', progress: (_e, s) => Math.min(1, s.totalMinutes / 300) },
  { id: 'calories_1000', title: '1000 ккал', description: 'Спалі 1000 ккал сумарно', icon: '🔥', progress: (_e, s) => Math.min(1, s.totalCalories / 1000) },
  { id: 'calories_5000', title: '5000 ккал', description: 'Спалі 5000 ккал сумарно', icon: '💥', progress: (_e, s) => Math.min(1, s.totalCalories / 5000) },
  { id: 'perfect_week', title: 'Ідеальний тиждень', description: '7 тренувань за 7 днів', icon: '🌟', progress: (_e, s) => Math.min(1, s.last7Days / 7) },
];

export const BADGE_STORAGE = 'quickworkout_badges';

export type UnlockedMap = Record<string, string>; // badge id -> unlock date

export function loadUnlocked(): UnlockedMap {
  try {
    const raw = localStorage.getItem(BADGE_STORAGE);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as UnlockedMap;
  } catch {
    return {};
  }
}

export function saveUnlocked(map: UnlockedMap): void {
  try {
    localStorage.setItem(BADGE_STORAGE, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function evaluateBadges(
  entries: HistoryEntry[],
): { newlyUnlocked: Badge[]; unlocked: UnlockedMap } {
  const stats = getStats();
  const unlocked = loadUnlocked();
  const newlyUnlocked: Badge[] = [];
  for (const badge of BADGES) {
    if (unlocked[badge.id]) continue;
    if (badge.progress(entries, stats) >= 1) {
      unlocked[badge.id] = new Date().toISOString().slice(0, 10);
      newlyUnlocked.push(badge);
    }
  }
  if (newlyUnlocked.length) saveUnlocked(unlocked);
  return { newlyUnlocked, unlocked };
}
