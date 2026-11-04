import type { Exercise, Workout, WorkoutConfig } from './types';
import { generateMockWorkout } from './mockBank';

export const AI_MODELS = [
  { id: 'nvidia/nemotron-3.5-super-vl:free', label: 'Nemotron 3.5 Super VL' },
  { id: 'xingchen-agi/xing4.0-29b-a4b:free', label: 'Xing4.0 29B A4B' },
  { id: 'nvidia/nemotron-3.5-lightning:free', label: 'Nemotron 3.5 Lightning' },
  { id: 'dots-studio/dots-3-note-preview:free', label: 'Dots3-Note Preview' },
] as const;

export type AiModel = (typeof AI_MODELS)[number];

export interface GeneratedWorkout {
  workout: Workout;
  source: 'ai' | 'mock';
  modelLabel: string | null;
  /** Причина, чому AI не спрацював (null, якщо AI відповів або ключа немає). */
  aiError: string | null;
}

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_TIMEOUT_MS = 45_000;

const ZONE_TEXT: Record<string, string> = {
  back_neck: 'спина та шия (зняти затиски після сидіння за столом)',
  core: 'прес та кор (центр тіла, стабільність)',
  full_body: 'усе тіло (комплекс на всі групи мʼязів)',
};

function buildPrompt(config: WorkoutConfig): string {
  const energyWord =
    config.energy <= 2 ? 'виснажений після навчання' : config.energy === 3 ? 'у нормальному стані' : 'повний енергії';
  return `Ти — фітнес-тренер для студентів. Створи коротке домашнє тренування без інвентарю.

Параметри:
- Стан студента: ${energyWord} (рівень енергії ${config.energy}/5)
- Тривалість: ${config.duration} хвилин
- Цільова зона: ${ZONE_TEXT[config.zone]}

Сформуй РІВНО ${config.duration} вправ, збалансованих за складністю з урахуванням стану. Кожна вправа: 30-45 секунд роботи + 15-25 секунд відпочинку (робота + відпочинок ≈ 1 хвилина).

Дай ВІДПОВІДЬ ТІЛЬКИ валідним JSON у такому форматі (без markdown, без коментарів):
{
  "exercises": [
    { "name": "українською", "description": "коротка техніка українською, 1-2 речення", "workSeconds": 40, "restSeconds": 20 }
  ],
  "quote": "одна коротка мотивуюча цитата дня українською",
  "estimatedCalories": 60
}

Тривалість роботи + відпочинку всіх ${config.duration} вправ сумарно має приблизно дорівнювати ${config.duration} хвилинам.`;
}

/**
 * Перевіряє й нормалізує відповідь моделі: округлює секунди, відсіює
 * від'ємні/нескінченні значення та явно некоректні тренування.
 */
function sanitizeWorkout(raw: unknown): Workout | null {
  if (!raw || typeof raw !== 'object') return null;
  const w = raw as Record<string, unknown>;
  if (!Array.isArray(w.exercises)) return null;
  if (w.exercises.length < 1 || w.exercises.length > 20) return null;

  const exercises: Exercise[] = [];
  for (const ex of w.exercises) {
    const e = ex as Record<string, unknown>;
    if (typeof e.name !== 'string' || !e.name.trim()) return null;
    if (typeof e.description !== 'string') return null;
    if (typeof e.workSeconds !== 'number' || !Number.isFinite(e.workSeconds)) return null;
    if (typeof e.restSeconds !== 'number' || !Number.isFinite(e.restSeconds)) return null;

    const workSeconds = Math.round(e.workSeconds);
    const restSeconds = Math.round(e.restSeconds);
    if (workSeconds < 5 || workSeconds > 300) return null;
    if (restSeconds < 0 || restSeconds > 120) return null;

    exercises.push({
      name: e.name.trim().slice(0, 120),
      description: e.description.trim().slice(0, 400),
      workSeconds,
      restSeconds,
    });
  }

  if (typeof w.quote !== 'string' || !w.quote.trim()) return null;
  if (typeof w.estimatedCalories !== 'number' || !Number.isFinite(w.estimatedCalories)) {
    return null;
  }
  const estimatedCalories = Math.round(w.estimatedCalories);
  if (estimatedCalories < 1 || estimatedCalories > 3000) return null;

  return {
    exercises,
    quote: w.quote.trim().slice(0, 300),
    estimatedCalories,
  };
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function generateWorkout(
  config: WorkoutConfig,
  apiKey: string,
  model: AiModel,
  signal?: AbortSignal,
): Promise<Workout> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeoutId = window.setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'QuickWorkout AI',
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          { role: 'system', content: 'Ти фітнес-тренер. Відповідаєш лише валідним JSON українською.' },
          { role: 'user', content: buildPrompt(config) },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`OpenRouter ${res.status} (${model.id})`);
    }

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Порожня відповідь AI');

    const parsed = sanitizeWorkout(extractJson(content));
    if (!parsed) {
      throw new Error('Невалідний формат відповіді');
    }

    const totalSeconds = parsed.exercises.reduce(
      (sum, ex) => sum + ex.workSeconds + ex.restSeconds,
      0,
    );
    const targetSeconds = config.duration * 60;
    if (Math.abs(totalSeconds - targetSeconds) > targetSeconds * 0.3) {
      throw new Error('AI повернув тренування не тієї тривалості');
    }

    return parsed;
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abort);
  }
}

function abortError(): DOMException {
  return new DOMException('Aborted', 'AbortError');
}

function describeAiError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const status = /OpenRouter (\d{3})/.exec(message)?.[1];
  if (status) return `HTTP ${status}`;
  if (/abort|timeout/i.test(message)) return 'таймаут';
  if (message.includes('Невалідний')) return 'невалідна відповідь моделі';
  if (message.includes('тривалості')) return 'невідповідна тривалість';
  if (message.includes('Порожня')) return 'порожня відповідь моделі';
  return 'помилка мережі';
}

export async function generateWorkoutWithFallback(
  config: WorkoutConfig,
  apiKey: string | null,
  signal?: AbortSignal,
): Promise<GeneratedWorkout> {
  if (apiKey) {
    let lastError: unknown = null;
    for (const model of AI_MODELS) {
      if (signal?.aborted) throw abortError();
      try {
        const workout = await generateWorkout(config, apiKey, model, signal);
        return { workout, source: 'ai', modelLabel: model.label, aiError: null };
      } catch (err) {
        // Скасування користувачем — не вважаємо збоєм моделі
        if (signal?.aborted) throw err;
        lastError = err;
        console.warn(`AI model ${model.id} failed, trying next:`, err);
      }
    }
    if (signal?.aborted) throw abortError();
    return {
      workout: generateMockWorkout(config),
      source: 'mock',
      modelLabel: null,
      aiError: describeAiError(lastError),
    };
  }
  return {
    workout: generateMockWorkout(config),
    source: 'mock',
    modelLabel: null,
    aiError: null,
  };
}
