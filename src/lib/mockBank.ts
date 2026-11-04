import type { Exercise, TargetZone, Workout, WorkoutConfig } from './types';

const BACK_NECK_BANK: Exercise[] = [
  {
    name: 'Круги плечима назад',
    description:
      'Встаньте прямо, руки вздовж тіла. Повільно робіть великі колі плечима назад — 5 разів, потім уперед — 5 разів. Розкриває грудну клітку та знімає затиск шиї.',
    workSeconds: 40,
    restSeconds: 20,
  },
  {
    name: 'Ретракція лопаток',
    description:
      'Зведіть лопатки разом, ніби тримаєте олівець між ними. Затримайте 3 секунди, розслабте. Допомагає проти «компʼютерної постави».',
    workSeconds: 40,
    restSeconds: 20,
  },
  {
    name: 'Нахили голови вбік',
    description:
      'Обережно нахиліть голову до правого плеча, рука тягнеться донизу. Тримайте 20 секунд, потім ліворуч. Мʼяко розтягує бокові мʼязи шиї.',
    workSeconds: 40,
    restSeconds: 20,
  },
  {
    name: 'Кішка-Корова',
    description:
      'На чотирьох точках: на видиху вигніть спину вгору (кішка), на вдиху опустіть живіт до підлоги (корова). Плавно, без ривків.',
    workSeconds: 45,
    restSeconds: 15,
  },
  {
    name: 'Розтяжка «Нитка»',
    description:
      'Сядьте на пʼяти, руки витягніть уперед, лоб до підлоги. Тягніть руки далі, відчуваюте розтяжку в плечах та верхній частині спини.',
    workSeconds: 45,
    restSeconds: 15,
  },
  {
    name: 'Повороти торсу сидячи',
    description:
      'Сядьте схрестно, праву руку за ліве коліно, ліву за спину. Поворот торсу, тримайте 15 секунд, потім змініть бік. Знімає затиски в попереку.',
    workSeconds: 40,
    restSeconds: 20,
  },
  {
    name: '«Дерево» з піднятими руками',
    description:
      'Встаньте на одну ногу, інгу зігніть. Руки вгору, тягніться до стелі. Активізує кор, покращує рівновагу та розслабляє шию через активні руки.',
    workSeconds: 35,
    restSeconds: 25,
  },
  {
    name: 'Розтяжка грудних у дверному прорізі',
    description:
      'Встаніть у дверний проріз, зігніть лікті під 90°, відштовхніться від косяків. Відчуйте розтяжку грудних. Знімає затиск після сидіння за ноутом.',
    workSeconds: 40,
    restSeconds: 20,
  },
];

const CORE_BANK: Exercise[] = [
  {
    name: 'Планка на ліктях',
    description:
      'Лікті під плечима, тіло в лінії від пʼят до маківки. Живіт підтягнуто, сідниці напружені. Не провалюйте поперек.',
    workSeconds: 40,
    restSeconds: 20,
  },
  {
    name: 'Мертвий жук',
    description:
      'На спині, руки вгору, ноги зігнуті під 90°. Повільно опускайте протилежну руку та ногу, не відриваючи поперек від підлоги.',
    workSeconds: 40,
    restSeconds: 20,
  },
  {
    name: 'Альпініст (mountain climbers)',
    description:
      'У позиції планки на прямих руках швидко підтягуйте коліна до грудях почергово. Тримайте таз стабільно, не стрибайте.',
    workSeconds: 35,
    restSeconds: 25,
  },
  {
    name: 'Скручування (crunches)',
    description:
      'На спині, ноги зігнуті. Відірвіть лопатки від підлоги, тягніться грудьми до стегон. Підборіддя не притискуйте.',
    workSeconds: 40,
    restSeconds: 20,
  },
  {
    name: 'Бокова планка',
    description:
      'На лікті збоку, тіло в лінії. Затримайте стабільно, потім змініть бік. Працює косі мʼязи живота.',
    workSeconds: 30,
    restSeconds: 30,
  },
  {
    name: 'Ножиці',
    description:
      'Лежачи на спині, підніміть прямі ноги на 15 см. Хрест-навхрест рухи ногами, прес напружений. Поперек притиснутий.',
    workSeconds: 35,
    restSeconds: 25,
  },
  {
    name: '«Пташка-собака»',
    description:
      'На чотирьох: витягніть праву руку вперед та ліву ногу назад, рівно. Затримайте 2 секунди, змініть сторону. Стабілізує кор.',
    workSeconds: 40,
    restSeconds: 20,
  },
  {
    name: 'Зворотне скручування',
    description:
      'На спині, ноги зігнуті. Підніміть таз, підтягуючи коліна до грудях. Контрольовано опустіть. Працює нижній прес.',
    workSeconds: 40,
    restSeconds: 20,
  },
];

const FULL_BODY_BANK: Exercise[] = [
  {
    name: 'Присідання',
    description:
      'Стопи на ширині плечей. Опускайте таз назад і вниз, коліна за носками. Глибина — стегна паралельно підлозі. Спина пряма.',
    workSeconds: 40,
    restSeconds: 20,
  },
  {
    name: 'Віджимання (з колін можна)',
    description:
      'Руки трохи ширше плечей. Опускайте груди до підлоги, лікті під 45°. Тіло в лінії. Якщо складно — з колін.',
    workSeconds: 40,
    restSeconds: 20,
  },
  {
    name: 'Випади',
    description:
      'Крокніть вперед, опустіть таз до підлоги. Обидва коліна під 90°. Відштовхніться назад. Почергово кожну ногу.',
    workSeconds: 40,
    restSeconds: 20,
  },
  {
    name: 'Берпи (спрощені)',
    description:
      'Присядьте, поставте руки на підлогу, вийдіть у планку, поверніться, встаньте з легким стрибком. Темп спокійний.',
    workSeconds: 35,
    restSeconds: 25,
  },
  {
    name: '«Зіркові стрибки»',
    description:
      'Стрибок з розставленими ногами та руками вгору-в сторони. Приземлення мʼяко. Розганяє серцебиття.',
    workSeconds: 35,
    restSeconds: 25,
  },
  {
    name: '«Альпініст»',
    description:
      'Планка на прямих руках, підтягуйте коліна до грудях швидко почергово. Таз нерухомий, прес напружений.',
    workSeconds: 35,
    restSeconds: 25,
  },
  {
    name: 'Присідання «пліє»',
    description:
      'Стопи широко, носки розведені. Присідайте, коліна в сторони. Активізує внутрішню поверхню стегон та сідниці.',
    workSeconds: 40,
    restSeconds: 20,
  },
  {
    name: '«Велосипед»',
    description:
      'На спині, ноги від підлоги. Почергово тягніться протилежним ліктем до коліна. Прес напружений весь час.',
    workSeconds: 40,
    restSeconds: 20,
  },
];

const QUOTES = [
  'Найкраще тренування — це те, що ти зробив сьогодні, а не відклав на завтра.',
  '10 хвилин для себе краще, ніж 0 хвилин для спортзалу.',
  'Твоє тіло — це єдине місце, де тобі доведеться жити. Піклуйся про нього.',
  'Сила не в тому, щоб ніколи не падати, а в тому, щоб підніматися після кожного падіння.',
  'Дисципліна — це міст між цілями та результатами.',
  'Ти сильніший, ніж думаєш. Зроби сьогодні ще один крок.',
  'Рух — це життя. Нехай сьогодні ти рухаєшся з радістю.',
];

const BANK: Record<TargetZone, Exercise[]> = {
  back_neck: BACK_NECK_BANK,
  core: CORE_BANK,
  full_body: FULL_BODY_BANK,
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildExercises(bank: Exercise[], targetSeconds: number): Exercise[] {
  const result: Exercise[] = [];
  let total = 0;
  let pool: Exercise[] = [];

  while (total < targetSeconds) {
    if (pool.length === 0) {
      pool = shuffle(bank);
      // Avoid the same exercise twice in a row when starting a new round
      if (
        result.length > 0 &&
        pool[pool.length - 1].name === result[result.length - 1].name
      ) {
        [pool[0], pool[pool.length - 1]] = [pool[pool.length - 1], pool[0]];
      }
    }

    const exercise = pool.pop()!;
    result.push(exercise);
    total += exercise.workSeconds + exercise.restSeconds;
  }

  return result;
}

export function generateMockWorkout(config: WorkoutConfig): Workout {
  const bank = BANK[config.zone];
  // Bank exercises are ~60 seconds each (work + rest), so scale their
  // count to the selected duration instead of always returning 3.
  const exercises = buildExercises(bank, config.duration * 60);

  const energyFactor = 0.7 + config.energy * 0.12;
  const calories = Math.round(
    config.duration * 6.5 * (config.zone === 'full_body' ? 1.15 : 0.9) * energyFactor,
  );

  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  return { exercises, quote, estimatedCalories: calories };
}
