import type { Workout, WorkoutConfig } from './types';
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

function validateWorkout(raw: unknown): raw is Workout {
  if (!raw || typeof raw !== 'object') return false;
  const w = raw as Record<string, unknown>;
  if (!Array.isArray(w.exercises)) return false;
  if (w.exercises.length < 1 || w.exercises.length > 20) return false;
  for (const ex of w.exercises) {
    const e = ex as Record<string, unknown>;
    if (typeof e.name !== 'string' || typeof e.description !== 'string') return false;
    if (typeof e.workSeconds !== 'number' || typeof e.restSeconds !== 'number') return false;
  }
  if (typeof w.quote !== 'string') return false;
  if (typeof w.estimatedCalories !== 'number') return false;
  return true;
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
): Promise<Workout> {
  const controller = new AbortController();
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

    const parsed = extractJson(content);
    if (!parsed || !validateWorkout(parsed)) {
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
  }
}

export async function generateWorkoutWithFallback(
  config: WorkoutConfig,
  apiKey: string | null,
): Promise<GeneratedWorkout> {
  if (apiKey) {
    for (const model of AI_MODELS) {
      try {
        const workout = await generateWorkout(config, apiKey, model);
        return { workout, source: 'ai', modelLabel: model.label };
      } catch (err) {
        console.warn(`AI model ${model.id} failed, trying next:`, err);
      }
    }
  }
  return {
    workout: generateMockWorkout(config),
    source: 'mock',
    modelLabel: null,
  };
}
