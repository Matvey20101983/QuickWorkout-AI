export interface HistoryEntry {
  date: string; // YYYY-MM-DD
  duration: number; // хвилин
  zone: string;
  calories: number;
  modelLabel: string | null;
  source: 'ai' | 'mock';
  skipped: boolean;
}

export interface HistoryStats {
  totalTrainings: number;
  totalMinutes: number;
  totalCalories: number;
  currentStreak: number;
  longestStreak: number;
  lastTraining: string | null;
  last7Days: number; // кількість тренувань за останні 7 днів
}

const STORAGE_KEY = 'quickworkout_history';

function getStored(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStored(entries: HistoryEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full — ігноруємо
  }
}

export function addWorkout(entry: Omit<HistoryEntry, 'date'>): HistoryEntry {
  const date = new Date().toISOString().split('T')[0];
  const newEntry: HistoryEntry = { date, ...entry };
  const entries = [newEntry, ...getStored()].slice(0, 100); // зберігаємо останні 100
  saveStored(entries);
  return newEntry;
}

export function getHistory(): HistoryEntry[] {
  return getStored();
}

export function getStats(): HistoryStats {
  const entries = getStored();
  if (entries.length === 0) {
    return {
      totalTrainings: 0,
      totalMinutes: 0,
      totalCalories: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastTraining: null,
      last7Days: 0,
    };
  }

  //_total metrics
  const totalTrainings = entries.length;
  const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);
  const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);

  // streaks
  // сортуємо за датою (найновіше перше — уже маємо так з getStored, але на всякий випадок)
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  let currentStreak = 0;
  let longestStreak = 0;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  // считаємо current streak
  for (let i = 0; i < sorted.length; i++) {
    const d = new Date(sorted[i].date);
    if (d >= yesterday && d < new Date()) {
      currentStreak++;
    } else {
      break;
    }
  }

  // longest streak — просто цикл по дням
  let prevDate: Date | null = null;
  let streakSoFar = 0;
  for (const e of sorted) {
    const d = new Date(e.date);
    if (prevDate === null) {
      streakSoFar = 1;
    } else {
      const diffDays = Math.ceil((d.getTime() - prevDate.getTime()) / (86400000));
      if (diffDays <= 1) {
        streakSoFar++;
      } else {
        longestStreak = Math.max(longestStreak, streakSoFar);
        streakSoFar = 1;
      }
    }
    prevDate = d;
  }
  longestStreak = Math.max(longestStreak, streakSoFar);

  //last7Days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const last7Days = sorted.filter((e) => {
    const d = new Date(e.date);
    return d >= sevenDaysAgo && d <= new Date();
  }).length;

  //last training
  const last = sorted[0];
  const lastTraining = last ? `${last.date} — ${last.duration} хв` : null;

  return {
    totalTrainings,
    totalMinutes,
    totalCalories,
    currentStreak,
    longestStreak,
    lastTraining,
    last7Days,
  };
}