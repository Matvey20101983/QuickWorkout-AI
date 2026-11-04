export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export type DurationOption = 7 | 12 | 15;

export type TargetZone = 'back_neck' | 'core' | 'full_body';

export interface Exercise {
  name: string;
  description: string;
  workSeconds: number;
  restSeconds: number;
}

export interface Workout {
  exercises: Exercise[];
  quote: string;
  estimatedCalories: number;
}

export interface WorkoutConfig {
  energy: EnergyLevel;
  duration: DurationOption;
  zone: TargetZone;
}

export const ENERGY_LABELS: Record<EnergyLevel, string> = {
  1: 'Зовсім виснажений',
  2: 'Втомлений',
  3: 'Нормально',
  4: 'Бадьорий',
  5: 'Повний сил',
};

export const DURATION_OPTIONS: {
  value: DurationOption;
  label: string;
  sublabel: string;
}[] = [
  { value: 7, label: '7 хв', sublabel: 'Експрес' },
  { value: 12, label: '12 хв', sublabel: 'Оптимум' },
  { value: 15, label: '15 хв', sublabel: 'Максимум' },
];

export const TARGET_ZONES: {
  value: TargetZone;
  label: string;
  description: string;
  icon: 'back' | 'core' | 'full';
}[] = [
  {
    value: 'back_neck',
    label: 'Спина та шия',
    description: 'Зняти затиски після сидіння',
    icon: 'back',
  },
  { value: 'core',
    label: 'Прес та кор',
    description: 'Середина тіла та стабільність',
    icon: 'core',
  },
  {
    value: 'full_body',
    label: 'Усе тіло',
    description: 'Комплекс на всі групи мʼязів',
    icon: 'full',
  },
];
