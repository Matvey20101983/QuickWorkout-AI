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
const DAY_MS = 86_400_000;

/** Локальна дата у форматі YYYY-MM-DD (без UTC-зсуву). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Парсить YYYY-MM-DD як локальну дату, а не UTC. */
function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Різниця в повних днях між локальними півночами. */
function dayDiff(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS);
}

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
  const date = toDateKey(new Date());
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

  // streaks рахуємо за унікальними днями, а не за кількістю записів
  const uniqueDays = [...new Set(entries.map((e) => e.date))].sort((a, b) =>
    b.localeCompare(a),
  );

  let currentStreak = 0;
  const latest = parseDateKey(uniqueDays[0]);
  // Стрік триває, якщо останнє тренування було сьогодні або вчора
  if (dayDiff(new Date(), latest) <= 1) {
    currentStreak = 1;
    let prev = latest;
    for (let i = 1; i < uniqueDays.length; i++) {
      const d = parseDateKey(uniqueDays[i]);
      if (dayDiff(prev, d) === 1) {
        currentStreak += 1;
        prev = d;
      } else {
        break;
      }
    }
  }

  // найдовша серія — послідовні дні у спадному порядку
  let longestStreak = 1;
  let streakSoFar = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = parseDateKey(uniqueDays[i - 1]);
    const cur = parseDateKey(uniqueDays[i]);
    if (dayDiff(prev, cur) === 1) {
      streakSoFar += 1;
    } else {
      longestStreak = Math.max(longestStreak, streakSoFar);
      streakSoFar = 1;
    }
  }
  longestStreak = Math.max(longestStreak, streakSoFar);

  // останні 7 днів включно з сьогодні (з локальної півночі)
  const weekStart = startOfDay(new Date());
  weekStart.setDate(weekStart.getDate() - 6);
  const now = new Date();
  const last7Days = entries.filter((e) => {
    const d = parseDateKey(e.date);
    return d >= weekStart && d <= now;
  }).length;

  // last training
  const last = entries.find((e) => e.date === uniqueDays[0]);
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