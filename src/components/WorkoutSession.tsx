import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Check, Flame, Quote } from 'lucide-react';
import type { TargetZone, Workout } from '@/lib/types';
import {
  playCountdownBeep,
  playStartBeep,
  playRestStartBeep,
  playFinishBeep,
} from '@/lib/sound';
import { addWorkout } from '@/lib/history';

export interface WorkoutMeta {
  zone: TargetZone;
  source: 'ai' | 'mock';
  modelLabel: string | null;
}

interface Props {
  workout: Workout;
  meta: WorkoutMeta;
  onReset: () => void;
}

type Phase = 'idle' | 'work' | 'rest' | 'done';

export default function WorkoutSession({ workout, meta, onReset }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState<boolean[]>([]);
  const [skipped, setSkipped] = useState(false);

  const indexRef = useRef(index);
  const phaseRef = useRef(phase);
  const skippedRef = useRef(false);
  const savedRef = useRef(false);
  const deadlineRef = useRef<number | null>(null);
  indexRef.current = index;
  phaseRef.current = phase;

  const totalSeconds = workout.exercises.reduce(
    (sum, ex) => sum + ex.workSeconds + ex.restSeconds,
    0,
  );
  const phaseLabel =
    phase === 'work'
      ? 'ПРАЦЮЄМО'
      : phase === 'rest'
        ? 'ВІДПОЧИНОК'
        : phase === 'done'
          ? 'ВИКОНАНО'
          : 'ГОТОВІСТЬ';

  const phaseColor =
    phase === 'work' ? '#22c55e' : phase === 'rest' ? '#06b6d4' : phase === 'done' ? '#4ade80' : '#9ca3af';

  const complete = useCallback(() => {
    setCompleted(workout.exercises.map(() => true));
    setPhase('done');
    setIsRunning(false);
    deadlineRef.current = null;
    playFinishBeep();

    // Історія пишеться рівно один раз — і після таймера, і після «Пропустити»
    if (!savedRef.current) {
      savedRef.current = true;
      addWorkout({
        duration: Math.max(1, Math.round(totalSeconds / 60)),
        zone: meta.zone,
        calories: workout.estimatedCalories,
        modelLabel: meta.modelLabel,
        source: meta.source,
        skipped: skippedRef.current,
      });
    }
  }, [workout, meta, totalSeconds]);

  const advance = useCallback(() => {
    const i = indexRef.current;
    const p = phaseRef.current;
    const ex = workout.exercises[i];

    if (p === 'work' && ex.restSeconds > 0) {
      setPhase('rest');
      setSecondsLeft(ex.restSeconds);
      deadlineRef.current = null;
      playRestStartBeep();
      return;
    }

    if (i < workout.exercises.length - 1) {
      const next = workout.exercises[i + 1];
      setIndex(i + 1);
      setPhase('work');
      setSecondsLeft(next.workSeconds);
      deadlineRef.current = null;
      playStartBeep();
    } else {
      complete();
    }
  }, [workout, complete]);

  // Відлік за реальним часом, а не накопичувальним декрементом
  useEffect(() => {
    if (!isRunning || phase === 'idle' || phase === 'done') return;
    if (secondsLeft <= 0) {
      advance();
      return;
    }
    if (deadlineRef.current === null) {
      deadlineRef.current = Date.now() + secondsLeft * 1000;
    }
    const id = window.setInterval(() => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;
      setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(id);
  }, [isRunning, phase, secondsLeft, advance]);

  // beep during the last 3 seconds of a phase
  useEffect(() => {
    if (!isRunning || phase === 'idle' || phase === 'done') return;
    if (secondsLeft > 0 && secondsLeft <= 3) playCountdownBeep();
  }, [isRunning, phase, secondsLeft]);

  // Мобільне: тримати екран увімкненим під час тренування (Wake Lock API)
  useEffect(() => {
    if (!isRunning) return;
    let sentinel: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    if (nav.wakeLock) {
      nav.wakeLock
        .request('screen')
        .then((s) => {
          if (cancelled) {
            s.release().catch(() => {});
          } else {
            sentinel = s;
          }
        })
        .catch(() => {
          /* ігноруємо — браузер може відмовити */
        });
    }
    return () => {
      cancelled = true;
      sentinel?.release().catch(() => {});
    };
  }, [isRunning]);

  // Мобільне: тактильний відгук при зміні фази
  useEffect(() => {
    if (phase === 'work') navigator.vibrate?.(40);
    else if (phase === 'rest') navigator.vibrate?.(15);
    else if (phase === 'done') navigator.vibrate?.([60, 40, 60]);
  }, [phase]);

  function handleStart() {
    const first = workout.exercises[0];
    savedRef.current = false;
    skippedRef.current = false;
    deadlineRef.current = null;
    setIndex(0);
    setPhase('work');
    setSecondsLeft(first.workSeconds);
    setIsRunning(true);
    setSkipped(false);
    playStartBeep();
  }

  function handlePause() {
    // Фіксуємо залишок, щоб після паузи відлік не стрибнув
    deadlineRef.current = null;
    setIsRunning(false);
  }

  function handleResume() {
    setIsRunning(true);
  }

  function handleSkip() {
    const i = indexRef.current;
    const p = phaseRef.current;
    const ex = workout.exercises[i];
    if (p === 'idle') {
      handleStart();
      return;
    }
    setSkipped(true);
    skippedRef.current = true;
    if (p === 'work' && ex.restSeconds > 0) {
      setPhase('rest');
      setSecondsLeft(ex.restSeconds);
      deadlineRef.current = null;
      playRestStartBeep();
    } else if (i < workout.exercises.length - 1) {
      const next = workout.exercises[i + 1];
      setIndex(i + 1);
      setPhase('work');
      setSecondsLeft(next.workSeconds);
      deadlineRef.current = null;
      playStartBeep();
    } else {
      complete();
    }
  }

  const paused = (phase === 'work' || phase === 'rest') && !isRunning;

  return (
    <div className="space-y-5">
      {phase !== 'done' && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {workout.exercises.map((ex, i) => {
            const done = completed[i] || i < index;
            const isActive = i === index && (phase === 'work' || phase === 'rest');
            return (
              <div
                key={i}
                className={`rounded-xl border p-3 transition sm:p-4 ${
                  isActive
                    ? 'border-acid bg-acid/10 shadow-acid-glow'
                    : done
                      ? 'border-ink-600 bg-ink-800 opacity-60'
                      : 'border-ink-500 bg-ink-800'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done ? 'bg-acid text-ink-900' : 'bg-ink-600 text-gray-300'
                    }`}
                  >
                    {done ? <Check size={14} /> : i + 1}
                  </span>
                  <span className="truncate text-[11px] font-semibold uppercase text-gray-400 sm:text-xs">
                    {ex.workSeconds}с + {ex.restSeconds}с
                  </span>
                </div>
                <div
                  className={`text-sm font-bold leading-tight sm:text-base ${isActive ? 'text-acid-glow' : 'text-white'}`}
                >
                  {ex.name}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {phase !== 'done' ? (
        <div className="rounded-2xl border border-ink-500 bg-ink-700/60 p-5 sm:p-6">
          <div className="flex flex-col items-center">
            <span
              className="mb-3 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest"
              style={{ color: phaseColor, background: `${phaseColor}22` }}
            >
              {phaseLabel}
            </span>

            <div className="relative">
              <div
                className="text-display text-6xl font-bold leading-none sm:text-7xl"
                style={{ color: phaseColor }}
              >
                {secondsLeft}
              </div>
              <div className="mt-1 text-sm font-medium text-gray-400">
                {phase === 'idle' ? 'готовий почати?' : 'секунд лишилося'}
              </div>
            </div>

            {/* Touch-friendly controls */}
            <div className="mt-5 flex w-full max-w-sm flex-col items-stretch gap-3">
              {phase === 'idle' ? (
                <button
                  onClick={handleStart}
                  className="flex items-center justify-center gap-2 rounded-xl bg-acid px-6 py-4 text-base font-bold text-ink-900 shadow-acid-glow transition hover:bg-acid-glow active:scale-[0.98]"
                >
                  <Play size={20} className="fill-ink-900" /> Старт
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={isRunning ? handlePause : handleResume}
                    className="flex items-center justify-center gap-2 rounded-xl bg-acid px-4 py-4 text-base font-bold text-ink-900 shadow-acid-glow transition hover:bg-acid-glow active:scale-[0.98]"
                  >
                    {isRunning ? (
                      <>
                        <Pause size={20} className="fill-ink-900" /> Пауза
                      </>
                    ) : (
                      <>
                        <Play size={20} className="fill-ink-900" /> Далі
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSkip}
                    className="flex items-center justify-center gap-2 rounded-xl border border-ink-500 bg-ink-800 px-4 py-4 text-base font-bold text-gray-200 transition hover:border-neon hover:text-neon active:scale-[0.98]"
                  >
                    <SkipForward size={20} /> Пропустити
                  </button>
                </div>
              )}
              {paused && (
                <p className="text-center text-xs text-gray-500">Тренування на паузі</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-pop-in rounded-2xl border border-acid bg-gradient-to-b from-acid/10 to-ink-700/60 p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-acid text-ink-900 shadow-acid-glow animate-pulse-ring">
            <Check size={36} strokeWidth={3} />
          </div>
          <h2 className="text-display text-4xl font-bold text-acid-glow">Чудова робота!</h2>
          <p className="mt-1 text-gray-300">
            {skipped
              ? 'Ти завершив тренування, навіть якщо частину пропустив. Головне — рух!'
              : 'Ти пройшов усе тренування без пропуску.'}
          </p>

          <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-ink-500 bg-ink-800 px-6 py-4">
            <Flame className="text-orange-400" size={28} />
            <div className="text-left">
              <div className="text-display text-3xl font-bold leading-none text-white">
                {workout.estimatedCalories}
              </div>
              <div className="text-xs uppercase tracking-wider text-gray-400">ккал спалено</div>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-ink-800/80 p-4 text-left">
            <Quote size={18} className="mt-0.5 shrink-0 text-neon" />
            <p className="text-sm italic text-gray-300">«{workout.quote}»</p>
          </div>

          <button
            onClick={onReset}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-ink-500 bg-ink-800 px-6 py-3 text-sm font-bold text-gray-200 transition hover:border-acid hover:text-acid active:scale-95"
          >
            <RotateCcw size={18} /> Нове тренування
          </button>
        </div>
      )}
    </div>
  );
}