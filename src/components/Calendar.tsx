import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getHistory, getStats, toDateKey } from '@/lib/history';
import type { HistoryEntry } from '@/lib/history';
import { TARGET_ZONES } from '@/lib/types';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const MONTHS = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
];

function zoneLabel(zone: string): string {
  return TARGET_ZONES.find((z) => z.value === zone)?.label ?? zone;
}

function buildMonth(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function Calendar({ onBack }: { onBack: () => void }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const entries = getHistory();
  const stats = getStats();

  const byDate = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>();
    for (const e of entries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [entries]);

  const cells = useMemo(() => buildMonth(year, month), [year, month]);

  const monthCount = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return entries.filter((e) => e.date.startsWith(prefix)).length;
  }, [entries, year, month]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  const selectedEntries = selected ? byDate.get(selected) ?? [] : [];

  return (
    <div className="animate-fade-up space-y-5">
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarIcon className="shrink-0 text-acid" size={20} />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold text-white sm:text-xl">Календар тренувань</h2>
            <p className="truncate text-[11px] text-gray-400 sm:text-xs">
              {stats.totalTrainings} тренувань · стрік {stats.currentStreak} дн. · за 7 днів {stats.last7Days}
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="tap-target flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-ink-500 bg-ink-700 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-acid hover:text-acid active:scale-95"
        >
          Назад
        </button>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={prevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-500 bg-ink-800 text-gray-300 transition hover:border-acid hover:text-acid"
          aria-label="Попередній місяць"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-white">{MONTHS[month]} {year}</span>
          <button
            onClick={goToday}
            className="rounded-lg border border-ink-500 bg-ink-800 px-2.5 py-1 text-[11px] font-semibold text-gray-300 transition hover:border-acid hover:text-acid"
          >
            Сьогодні
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-500 bg-ink-800 text-gray-300 transition hover:border-acid hover:text-acid"
          aria-label="Наступний місяць"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="text-xs text-gray-500">Тренувань цього місяця: {monthCount}</div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, idx) => {
          if (!date) return <div key={`blank-${idx}`} className="aspect-square" />;
          const key = toDateKey(date);
          const dayEntries = byDate.get(key) ?? [];
          const hasWorkout = dayEntries.length > 0;
          const isToday = key === toDateKey(today);
          const totalMin = dayEntries.reduce((s, e) => s + e.duration, 0);
          return (
            <button
              key={key}
              onClick={() => hasWorkout && setSelected(key)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border text-sm transition ${
                isToday
                  ? 'border-neon bg-neon/10 text-neon'
                  : hasWorkout
                    ? 'border-acid/60 bg-acid/10 text-white hover:border-acid'
                    : 'border-ink-600/40 bg-ink-800/40 text-gray-500'
              } ${hasWorkout ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span className="font-semibold">{date.getDate()}</span>
              {hasWorkout && (
                <span className="mt-0.5 flex items-center gap-0.5">
                  {dayEntries.length > 1 && (
                    <span className="text-[9px] font-bold text-acid">{dayEntries.length}</span>
                  )}
                  <span className="h-1.5 w-1.5 rounded-full bg-acid" />
                </span>
              )}
              {hasWorkout && totalMin > 0 && (
                <span className="absolute bottom-0.5 text-[8px] text-gray-500">{totalMin}хв</span>
              )}
            </button>
          );
        })}
      </div>

      {entries.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ink-500 bg-ink-700/40 p-6 text-center text-sm text-gray-400">
          Поки що немає завершених тренувань. Заверши перше — і воно зʼявиться тут.
        </div>
      )}

      {/* Day details modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-ink-500 bg-ink-700 p-5 shadow-2xl animate-pop-in sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
              aria-label="Закрити"
            >
              <X size={20} />
            </button>
            <h3 className="mb-1 text-lg font-extrabold text-white">{selected}</h3>
            <p className="mb-4 text-xs text-gray-400">
              {selectedEntries.length} тренувань · {selectedEntries.reduce((s, e) => s + e.duration, 0)} хв ·{' '}
              {selectedEntries.reduce((s, e) => s + e.calories, 0)} ккал
            </p>
            <div className="space-y-3">
              {selectedEntries.map((e, i) => (
                <div key={i} className="rounded-xl border border-ink-500 bg-ink-800 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">{zoneLabel(e.zone)}</span>
                    <span className="text-[11px] font-semibold text-gray-400">
                      {e.duration} хв · {e.calories} ккал
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                    <span>{e.source === 'ai' ? '🤖 AI' : '📦 Банк'}</span>
                    {e.modelLabel && <span>· {e.modelLabel}</span>}
                    {e.skipped && <span className="text-orange-400">· пропуски</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
