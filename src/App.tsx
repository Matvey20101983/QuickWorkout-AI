import { useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, Download, Dumbbell, Key, RotateCcw, Sparkles, Timer, Trash2, Trophy, Upload, User, Zap } from 'lucide-react';
import ApiKeyModal from '@/components/ApiKeyModal';
import ConfigPanel from '@/components/ConfigPanel';
import WorkoutSession, { type WorkoutMeta } from '@/components/WorkoutSession';
import { generateWorkoutWithFallback } from '@/lib/openrouter';
import { getSupabaseUserId, supabase } from '@/lib/supabase';
import {
  BADGES,
  evaluateBadges,
  loadUnlocked,
  type Badge,
  type UnlockedMap,
} from '@/lib/achievements';
import { getHistory, getStats } from '@/lib/history';
import { loadSettings, saveSettings, type AppSettings } from '@/lib/settings';
import type {
  DurationOption,
  EnergyLevel,
  TargetZone,
  Workout,
} from '@/lib/types';
import { DURATION_OPTIONS, ENERGY_LABELS, TARGET_ZONES } from '@/lib/types';

type Screen = 'config' | 'success' | 'error' | 'achievements' | 'profile';

// Ключ зберігається лише локально й ніколи не надсилається в Supabase
const API_KEY_STORAGE = 'quickworkout_supabase_key';

export default function App() {
  const initialSettings = loadSettings();
  const [energy, setEnergy] = useState<EnergyLevel>(initialSettings.defaultEnergy);
  const [duration, setDuration] = useState<DurationOption>(initialSettings.defaultDuration);
  const [zone, setZone] = useState<TargetZone>(initialSettings.defaultZone);

  const [screen, setScreen] = useState<Screen>('config');
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'ai' | 'mock' | null>(null);
  const [modelLabel, setModelLabel] = useState<string | null>(null);
  const [meta, setMeta] = useState<WorkoutMeta | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [unlockedBadges, setUnlockedBadges] = useState<UnlockedMap>(() => loadUnlocked());
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Ключ завжди доступний локально, без мережі
    const saved = localStorage.getItem(API_KEY_STORAGE);
    if (saved) setApiKey(saved);

    // Анонімна сесія потрібна лише для синхронізації історії (якщо Supabase налаштований)
    let cancelled = false;
    getSupabaseUserId().then((id) => {
      if (!cancelled) setUserId(id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function saveApiKey(key: string) {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(API_KEY_STORAGE, trimmed);
      setApiKey(trimmed);
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
      setApiKey(null);
    }
  }

  async function handleGenerate() {
    if (!zone || !duration || !energy) {
      setScreen('error');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setScreen('config');
    setAiError(null);
    try {
      const result = await generateWorkoutWithFallback(
        { energy, duration, zone },
        apiKey,
        controller.signal,
      );
      if (controller.signal.aborted) return;

      setWorkout(result.workout);
      setSource(result.source);
      setModelLabel(result.modelLabel);
      setAiError(result.aiError);
      setMeta({ zone, source: result.source, modelLabel: result.modelLabel });
      setScreen('success');

      // Історія в Supabase — необов'язкова синхронізація, не блокує UI
      if (supabase && userId) {
        supabase
          .from('workouts')
          .insert({
            user_id: userId,
            energy,
            duration,
            zone,
            source: result.source,
            model_label: result.modelLabel,
            workout_data: result.workout,
          })
          .then(({ error }) => {
            if (error) console.warn('Supabase workout sync failed:', error.message);
          });
      }
    } catch (err) {
      if (controller.signal.aborted || (err as Error)?.name === 'AbortError') return;
      console.error('Workout generation failed:', err);
      setScreen('error');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setScreen('config');
  }

  function handleWorkoutSaved() {
    const entries = getHistory();
    const { newlyUnlocked, unlocked } = evaluateBadges(entries);
    setUnlockedBadges(unlocked);
    if (newlyUnlocked.length) setNewBadges(newlyUnlocked);
  }

  function handleReset() {
    setScreen('config');
    setWorkout(null);
    setSource(null);
    setModelLabel(null);
    setMeta(null);
    setAiError(null);
    setNewBadges([]);
  }

  function updateSettings(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  }

  function handleClearHistory() {
    if (!window.confirm('Видалити всю історію тренувань? Дію не можна скасувати.')) return;
    localStorage.removeItem('quickworkout_history');
  }

  function handleClearBadges() {
    if (!window.confirm('Скинути всі досягнення?')) return;
    localStorage.removeItem('quickworkout_badges');
    setUnlockedBadges({});
  }

  function handleExport() {
    const data = { history: getHistory(), badges: loadUnlocked(), settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quickworkout-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImportFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (Array.isArray(data?.history)) {
          localStorage.setItem('quickworkout_history', JSON.stringify(data.history));
        }
        if (data?.badges && typeof data.badges === 'object' && !Array.isArray(data.badges)) {
          localStorage.setItem('quickworkout_badges', JSON.stringify(data.badges));
          setUnlockedBadges(data.badges);
        }
        if (data?.settings && typeof data.settings === 'object') {
          updateSettings(data.settings);
        }
        window.alert('Імпортовано успішно.');
      } catch {
        window.alert('Невірний файл резервної копії.');
      }
    };
    reader.readAsText(file);
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
            onClick={() => setScreen('profile')}
            className="tap-target flex shrink-0 items-center justify-center gap-2 rounded-xl border border-ink-500 bg-ink-700 px-3 py-2 text-sm font-semibold text-gray-300 transition hover:border-acid hover:text-acid active:scale-95"
            aria-label="Профіль"
          >
            <User size={16} />
            <span className="hidden sm:inline">Профіль</span>
          </button>
          <button
            onClick={() => setScreen('achievements')}
            className="tap-target flex shrink-0 items-center justify-center gap-2 rounded-xl border border-ink-500 bg-ink-700 px-3 py-2 text-sm font-semibold text-gray-300 transition hover:border-acid hover:text-acid active:scale-95"
            aria-label="Досягнення"
          >
            <Trophy size={16} />
            <span className="hidden sm:inline">Бейджі</span>
          </button>
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
              onCancel={handleCancel}
              loading={loading}
              hasApiKey={!!apiKey}
            />
          </div>
        )}

        {/* SUCCESS STATE */}
        {screen === 'success' && workout && (
          <div className="animate-fade-up">
            {newBadges.length > 0 && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-acid/40 bg-acid/10 p-3 text-xs text-acid-glow">
                <Trophy size={16} className="mt-0.5 shrink-0" />
                <span>
                  Нове досягнення: {newBadges.map((b) => `${b.icon} ${b.title}`).join(', ')}
                </span>
              </div>
            )}
            {source === 'mock' && aiError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 p-3 text-xs text-orange-200">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  AI не зміг згенерувати тренування ({aiError}). Показано резервний
                  комплекс. Перевірте API-ключ або спробуйте пізніше.
                </span>
              </div>
            )}
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
            <WorkoutSession
              workout={workout}
              meta={meta ?? { zone, source: source ?? 'mock', modelLabel }}
              onReset={handleReset}
              onSaved={handleWorkoutSaved}
            />
          </div>
        )}

        {/* PROFILE */}
        {screen === 'profile' && (() => {
          const stats = getStats();
          const unlockedCount = Object.keys(unlockedBadges).length;
          const weekProgress = Math.min(100, Math.round((stats.last7Days / Math.max(1, settings.weeklyGoal)) * 100));
          return (
            <div className="animate-fade-up space-y-5">
              <div className="mb-5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <User className="shrink-0 text-acid" size={20} />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-extrabold text-white sm:text-xl">Профіль</h2>
                    <p className="truncate text-[11px] text-gray-400 sm:text-xs">Налаштування та статистика</p>
                  </div>
                </div>
                <button
                  onClick={() => setScreen('config')}
                  className="tap-target flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-ink-500 bg-ink-700 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-acid hover:text-acid active:scale-95"
                >
                  <RotateCcw size={14} /> Назад
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Тренувань', value: stats.totalTrainings },
                  { label: 'Хвилин', value: stats.totalMinutes },
                  { label: 'Ккал', value: stats.totalCalories },
                  { label: 'Стрік', value: stats.currentStreak },
                ].map((c) => (
                  <div key={c.label} className="rounded-2xl border border-ink-500 bg-ink-700/60 p-4 text-center">
                    <div className="text-display text-2xl font-bold text-white">{c.value}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">{c.label}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-ink-500 bg-ink-700/60 p-4 sm:p-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-200">Ціль на тиждень</h3>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-gray-300">{stats.last7Days} з {settings.weeklyGoal} тренувань</span>
                  <span className="font-bold text-acid">{weekProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-800">
                  <div className="h-full bg-acid transition-all" style={{ width: `${weekProgress}%` }} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-400">Ціль:</span>
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={settings.weeklyGoal}
                    onChange={(e) =>
                      updateSettings({ weeklyGoal: Math.max(1, Math.min(14, Number(e.target.value) || 1)) })
                    }
                    className="w-16 rounded-lg border border-ink-500 bg-ink-800 px-2 py-1 text-sm text-white"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-ink-500 bg-ink-700/60 p-4 sm:p-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-200">Значення за замовчуванням</h3>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-[11px] text-gray-400">Зона</div>
                    <div className="flex flex-wrap gap-2">
                      {TARGET_ZONES.map((z) => (
                        <button
                          key={z.value}
                          onClick={() => updateSettings({ defaultZone: z.value })}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                            settings.defaultZone === z.value
                              ? 'border-acid bg-acid/15 text-acid'
                              : 'border-ink-500 bg-ink-800 text-gray-300'
                          }`}
                        >
                          {z.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] text-gray-400">Тривалість</div>
                    <div className="flex flex-wrap gap-2">
                      {DURATION_OPTIONS.map((d) => (
                        <button
                          key={d.value}
                          onClick={() => updateSettings({ defaultDuration: d.value })}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                            settings.defaultDuration === d.value
                              ? 'border-neon bg-neon/15 text-neon'
                              : 'border-ink-500 bg-ink-800 text-gray-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] text-gray-400">Енергія</div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={settings.defaultEnergy}
                      onChange={(e) => updateSettings({ defaultEnergy: Number(e.target.value) as EnergyLevel })}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-400">{ENERGY_LABELS[settings.defaultEnergy]}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-ink-500 bg-ink-700/60 p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">Досягнення</h3>
                    <p className="mt-1 text-sm text-gray-300">Відкрито {unlockedCount} з {BADGES.length}</p>
                  </div>
                  <button
                    onClick={() => setScreen('achievements')}
                    className="rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:border-acid hover:text-acid"
                  >
                    Переглянути
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-ink-500 bg-ink-700/60 p-4 sm:p-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-200">Дані</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-1.5 rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-acid hover:text-acid"
                  >
                    <Download size={14} /> Експорт
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-acid hover:text-acid"
                  >
                    <Upload size={14} /> Імпорт
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1.5 rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-orange-500 hover:text-orange-400"
                  >
                    <Trash2 size={14} /> Очистити історію
                  </button>
                  <button
                    onClick={handleClearBadges}
                    className="flex items-center gap-1.5 rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-orange-500 hover:text-orange-400"
                  >
                    <Trash2 size={14} /> Скинути бейджі
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="text-center text-[11px] text-gray-600">QuickWorkout AI · локальне зберігання · v0.1</div>
            </div>
          );
        })()}

        {/* ACHIEVEMENTS */}
        {screen === 'achievements' && (() => {
          const entries = getHistory();
          const stats = getStats();
          const unlockedCount = Object.keys(unlockedBadges).length;
          return (
            <div className="animate-fade-up">
              <div className="mb-5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Trophy className="shrink-0 text-acid" size={20} />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-extrabold text-white sm:text-xl">
                      Досягнення
                    </h2>
                    <p className="truncate text-[11px] text-gray-400 sm:text-xs">
                      Відкрито {unlockedCount} з {BADGES.length} · {stats.totalTrainings} тренувань
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setScreen('config')}
                  className="tap-target flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-ink-500 bg-ink-700 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-acid hover:text-acid active:scale-95"
                >
                  <RotateCcw size={14} /> Назад
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {BADGES.map((badge) => {
                  const unlocked = !!unlockedBadges[badge.id];
                  const progress = badge.progress(entries, stats);
                  return (
                    <div
                      key={badge.id}
                      className={`rounded-2xl border p-4 transition ${
                        unlocked
                          ? 'border-acid bg-acid/10 shadow-acid-glow'
                          : 'border-ink-500 bg-ink-700/60'
                      }`}
                    >
                      <div className="text-3xl">{badge.icon}</div>
                      <div
                        className={`mt-2 text-sm font-bold ${unlocked ? 'text-acid-glow' : 'text-white'}`}
                      >
                        {badge.title}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-400">{badge.description}</div>
                      {unlocked ? (
                        <div className="mt-2 text-[10px] text-acid">
                          Відкрито {unlockedBadges[badge.id]}
                        </div>
                      ) : (
                        <div className="mt-2">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
                            <div
                              className="h-full bg-acid/60 transition-all"
                              style={{ width: `${Math.round(progress * 100)}%` }}
                            />
                          </div>
                          <div className="mt-1 text-[10px] text-gray-500">
                            {Math.round(progress * 100)}%
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

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
        QuickWorkout AI · {apiKey ? 'AI-режим активний' : 'Резервний банк вправ'} ·
        <a href="https://openrouter.ai/docs" target="_blank" rel="noopener" className="underline underline-offset-2 text-gray-300 hover:text-acid ml-2">
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
