import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Dumbbell, Key, RotateCcw, Sparkles, Timer, Zap } from 'lucide-react';
import ApiKeyModal from '@/components/ApiKeyModal';
import ConfigPanel from '@/components/ConfigPanel';
import WorkoutSession from '@/components/WorkoutSession';
import { generateWorkoutWithFallback } from '@/lib/openrouter';
import { supabase } from '@/lib/supabase';
import type {
  DurationOption,
  EnergyLevel,
  TargetZone,
  Workout,
} from '@/lib/types';

type Screen = 'config' | 'success' | 'error';

// Supabase storage key for API key
const API_KEY_STORAGE = 'quickworkout_supabase_key';

export default function App() {
  const [energy, setEnergy] = useState<EnergyLevel>(3);
  const [duration, setDuration] = useState<DurationOption>(12);
  const [zone, setZone] = useState<TargetZone>('full_body');

  const [screen, setScreen] = useState<Screen>('config');
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'ai' | 'mock' | null>(null);
  const [modelLabel, setModelLabel] = useState<string | null>(null);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  useEffect(() => {
    // Try to get from Supabase first, fallback to localStorage
    supabase.from('api_keys').select('key').eq('user_id', 'current-user').then(({ data }) => {
      if (data?.length) {
        setApiKey(data[0].key);
      } else {
        // Fallback to localStorage
        const saved = localStorage.getItem(API_KEY_STORAGE);
        if (saved) setApiKey(saved);
      }
    });
  }, []);

  async function saveApiKey(key: string) {
    if (key) {
      // Save to Supabase
      const { error } = await supabase.from('api_keys').upsert({
        user_id: 'current-user',
        key,
        updated_at: new Date().toISOString(),
      });
      if (!error) {
        setApiKey(key);
      }
    } else {
      // Remove from Supabase
      await supabase.from('api_keys').delete().eq('user_id', 'current-user');
      // Also clear localStorage fallback
      localStorage.removeItem(API_KEY_STORAGE);
      setApiKey(null);
    }
  }

  async function handleGenerate() {
    // Error state if zone not picked — zone always has a default, but keep guard
    if (!zone || !duration || !energy) {
      setScreen('error');
      return;
    }

    setLoading(true);
    setScreen('config');
    try {
      const { workout: w, source: s, modelLabel: m } = await generateWorkoutWithFallback(
        { energy, duration, zone },
        apiKey,
      );
      setWorkout(w);
      setSource(s);
      setModelLabel(m);
      setScreen('success');

      // Зберегти тренування у історію Supabase
      if (apiKey) {
        await supabase.from('workouts').insert({
          user_id: 'current-user',
          energy,
          duration,
          zone,
          source: s,
          model_label: m,
          workout_data: w,
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      setScreen('error');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setScreen('config');
    setWorkout(null);
    setSource(null);
    setModelLabel(null);
  }

  function handleErrorReset() {
    setScreen('config');
  }

  return (
    <div className="relative isolate min-h-[100dvh] overflow-x-hidden pb-12">
      {/* Спортивний фон: великі напівпрозорі силуети */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="speed-lines" />
        <Dumbbell
          className="absolute -right-24 top-24 h-[240px] w-[240px] -rotate-12 text-acid/[0.06] sm:-right-12 sm:top-28 sm:h-[520px] sm:w-[520px]"
          strokeWidth={0.6}
        />
        <Activity
          className="absolute -left-24 bottom-10 h-[200px] w-[200px] rotate-12 text-neon/[0.08] sm:-left-16 sm:bottom-16 sm:h-[380px] sm:w-[380px]"
          strokeWidth={0.6}
        />
        <div className="absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-acid/[0.06] blur-3xl" />
      </div>

      {/* Header */}
      <header className="safe-top sticky top-0 z-40 border-b border-ink-600/60 bg-ink-800/80 backdrop-blur-xl">
        <div className="safe-x mx-auto flex max-w-3xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-acid to-neon text-ink-900 shadow-acid-glow sm:h-10 sm:w-10">
              <Dumbbell size={20} strokeWidth={2.5} className="sm:h-[22px] sm:w-[22px]" />
            </div>
            <div className="min-w-0 leading-none">
              <h1 className="text-display truncate text-xl font-bold tracking-wide text-white sm:text-2xl">
                QUICKWORKOUT <span className="text-acid">AI</span>
              </h1>
              <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wider text-gray-500 sm:text-[11px]">
                Експрес-тренер для студентів
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowKeyModal(true)}
            className={`tap-target flex shrink-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition active:scale-95 ${
              apiKey
                ? 'border-acid/50 bg-acid/10 text-acid hover:bg-acid/20'
                : 'border-ink-500 bg-ink-700 text-gray-300 hover:border-ink-400'
            }`}
          >
            <Key size={16} />
            <span className="hidden sm:inline">API Key</span>
            {apiKey && (
              <span className="h-2 w-2 rounded-full bg-acid shadow-acid-glow" />
            )}
          </button>
        </div>
        </header>

      <main className="safe-x mx-auto max-w-3xl px-3 pt-5 sm:px-6 sm:pt-6">
        {/* CONFIG / EMPTY STATE */}
        {screen === 'config' && (
          <div className="animate-fade-up">
            {/* Hero / Empty state banner */}
            {!workout && (
              <div className="mb-6 rounded-2xl border border-ink-500 bg-gradient-to-br from-ink-700/80 to-ink-800 p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="hidden shrink-0 sm:block">
                    <div className="relative">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-acid/15 text-acid">
                        <Timer size={34} />
                      </div>
                      <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-neon text-ink-900 shadow-neon-glow">
                        <Zap size={14} className="fill-ink-900" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                      Немає часу на спортзал?
                    </h2>
                    <p className="mt-2 text-gray-300">
                      Обери свій стан, і ми підберемо тренування на{' '}
                      <span className="font-bold text-acid">{duration} хвилин</span> прямо в
                      кімнаті. Без інвентарю, без виходів — лише ти та комплекс вправ.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <ConfigPanel
              energy={energy}
              setEnergy={setEnergy}
              duration={duration}
              setDuration={setDuration}
              zone={zone}
              setZone={setZone}
              onGenerate={handleGenerate}
              loading={loading}
              hasApiKey={!!apiKey}
            />
          </div>
        )}

        {/* SUCCESS STATE */}
        {screen === 'success' && workout && (
          <div className="animate-fade-up">
            <div className="mb-5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Sparkles className="shrink-0 text-acid" size={20} />
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-extrabold text-white sm:text-xl">
                    Твоє тренування
                  </h2>
                  <p className="truncate text-[11px] text-gray-400 sm:text-xs">
                    {source === 'ai'
                      ? `Згенеровано AI (${modelLabel ?? 'OpenRouter'})`
                      : 'З вбудованого банку вправ'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="tap-target flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-ink-500 bg-ink-700 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-acid hover:text-acid active:scale-95"
              >
                <RotateCcw size={14} /> Заново
              </button>
            </div>
            <WorkoutSession workout={workout} onReset={handleReset} />
          </div>
        )}

        {/* ERROR STATE */}
        {screen === 'error' && (
          <div className="flex min-h-[60vh] animate-pop-in flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/15 text-orange-400">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-display text-3xl font-bold text-white">Щось пішло не так</h2>
            <p className="mt-2 max-w-sm text-gray-400">
              Не вдалося згенерувати тренування. Перевір параметри або спробуй ще раз —
              резервний банк вправ спрацює навіть без мережі.
            </p>
            <button
              onClick={handleErrorReset}
              className="mt-6 flex items-center gap-2 rounded-full bg-acid px-6 py-3 text-base font-bold text-ink-900 shadow-acid-glow transition hover:bg-acid-glow active:scale-95"
            >
              <RotateCcw size={18} /> Скинути та спробувати знову
            </button>
          </div>
        )}
      </main>

      <footer className="safe-bottom safe-x mx-auto mt-10 max-w-3xl px-4 pb-4 text-center text-xs text-gray-600 sm:px-6">
        QuickWorkout AI · {apiKey ? 'AI-режим активний (Supabase)' : 'Резервний банк вправ'} ·
        <a href="https://supabase.io" target="_blank" rel="noopener" className="underline underline-offset-2 text-gray-300 hover:text-acid ml-2">
          Docs
        </a>
        Памʼятай: перед тренуванням розігрійся.
      </footer>

      <ApiKeyModal
        open={showKeyModal}
        initialKey={apiKey ?? ''}
        onSave={saveApiKey}
        onClose={() => setShowKeyModal(false)}
      />
    </div>
  );
}
