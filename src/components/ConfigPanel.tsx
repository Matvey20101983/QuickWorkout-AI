import { Battery, Timer, Target, Dumbbell, Zap, X } from 'lucide-react';
import {
  DURATION_OPTIONS,
  ENERGY_LABELS,
  TARGET_ZONES,
  type DurationOption,
  type EnergyLevel,
  type TargetZone,
} from '@/lib/types';

interface Props {
  energy: EnergyLevel;
  setEnergy: (e: EnergyLevel) => void;
  duration: DurationOption;
  setDuration: (d: DurationOption) => void;
  zone: TargetZone;
  setZone: (z: TargetZone) => void;
  onGenerate: () => void;
  onCancel: () => void;
  loading: boolean;
  hasApiKey: boolean;
}

const ZONE_ICON: Record<string, string> = { back: '🧍', core: '🎯', full: '🔥' };

export default function ConfigPanel({
  energy,
  setEnergy,
  duration,
  setDuration,
  zone,
  setZone,
  onGenerate,
  onCancel,
  loading,
  hasApiKey,
}: Props) {
  const energyPct = ((energy - 1) / 4) * 100;

  return (
    <div className="space-y-6">
      {/* Energy slider */}
      <div className="rounded-2xl border border-ink-500 bg-ink-700/60 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Battery className="text-acid" size={18} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200 sm:text-sm">
            Як ти почуваєшся після навчання?
          </h3>
        </div>
        <div className="relative">
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value) as EnergyLevel)}
            className="energy-slider w-full"
            aria-label="Рівень енергії"
            aria-valuemin={1}
            aria-valuemax={5}
            aria-valuenow={energy}
            style={{
              background: `linear-gradient(to right, #22c55e ${energyPct}%, #2e2e2e ${energyPct}%)`,
            }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-1 text-[10px] text-gray-500 sm:text-xs">
          <span className="shrink-0">Виснажений</span>
          <span className="truncate px-1 text-center font-bold text-acid">
            {ENERGY_LABELS[energy]}
          </span>
          <span className="shrink-0">Повний сил</span>
        </div>
        <div className="mt-1 flex justify-between px-0.5 text-[10px] text-gray-600">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className="rounded-2xl border border-ink-500 bg-ink-700/60 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Timer className="text-neon" size={18} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200 sm:text-sm">
            Час тренування
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {DURATION_OPTIONS.map((opt) => {
            const active = duration === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setDuration(opt.value)}
                className={`tap-target group rounded-xl border p-3 text-center transition active:scale-95 sm:p-4 ${
                  active
                    ? 'border-neon bg-neon/15 shadow-neon-glow'
                    : 'border-ink-500 bg-ink-800 hover:border-ink-400'
                }`}
              >
                <div
                  className={`text-display text-2xl font-bold leading-none sm:text-3xl ${
                    active ? 'text-neon-glow' : 'text-white'
                  }`}
                >
                  {opt.label}
                </div>
                <div
                  className={`mt-1 text-[10px] font-semibold uppercase tracking-wider sm:text-[11px] ${
                    active ? 'text-neon' : 'text-gray-500'
                  }`}
                >
                  {opt.sublabel}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target zone */}
      <div className="rounded-2xl border border-ink-500 bg-ink-700/60 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Target className="text-acid" size={18} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200 sm:text-sm">
            Цільова зона
          </h3>
        </div>
        <div className="space-y-2.5 sm:space-y-3">
          {TARGET_ZONES.map((z) => {
            const active = zone === z.value;
            return (
              <button
                key={z.value}
                onClick={() => setZone(z.value)}
                className={`tap-target flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition active:scale-[0.98] sm:p-4 ${
                  active
                    ? 'border-acid bg-acid/12 shadow-acid-glow'
                    : 'border-ink-500 bg-ink-800 hover:border-ink-400'
                }`}
              >
                <span className="text-xl sm:text-2xl">{ZONE_ICON[z.icon]}</span>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-bold sm:text-base ${active ? 'text-acid-glow' : 'text-white'}`}
                  >
                    {z.label}
                  </div>
                  <div className="text-[11px] text-gray-400 sm:text-xs">{z.description}</div>
                </div>
                {active && <Dumbbell size={18} className="shrink-0 text-acid" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={loading ? onCancel : onGenerate}
        aria-busy={loading}
        className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-acid to-neon px-4 py-4 text-base font-black uppercase tracking-wider text-ink-900 shadow-acid-glow transition hover:brightness-110 active:scale-[0.98] sm:px-6 sm:py-5 sm:text-lg"
      >
        {loading ? (
          <>
            <X size={22} />
            Скасувати генерацію
          </>
        ) : (
          <>
            <Zap size={22} className="fill-ink-900" />
            <span className="text-center">Згенерувати моє тренування</span>
            <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-700 group-hover:translate-x-full" />
          </>
        )}
      </button>

      <p className="px-1 text-center text-[11px] text-gray-500 sm:text-xs">
        {hasApiKey
          ? 'Підключено AI (OpenRouter, 4 free-моделі). Без мережі — автоматичний резервний банк вправ.'
          : 'Без API-ключа працює вбудований банк вправ. Додайте ключ для AI-генерації.'}
      </p>
    </div>
  );
}
