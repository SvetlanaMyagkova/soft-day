export const STEPS_GOAL_STORAGE_KEY = 'soft-day-steps-goal-settings';

export type StepsGoalSettings = {
  dailyGoal: string;
};

export type StepsGoalLevel =
  | 'none'
  | 'softStart'
  | 'goodDay'
  | 'strongDay'
  | 'goalReached';

export type StepsStage = {
  value: number;
  level: StepsGoalLevel;
  titleRu: string;
  titleEn: string;
  subtitleRu: string;
  subtitleEn: string;
};

export type StepsGoalEvaluation = {
  steps: number;
  dailyGoal: number;
  level: StepsGoalLevel;
  titleRu: string;
  titleEn: string;
  subtitleRu: string;
  subtitleEn: string;
  progressPercent: number;
  nextStage?: StepsStage;
};

export const DEFAULT_STEPS_GOAL_SETTINGS: StepsGoalSettings = {
  dailyGoal: '10000',
};

export const DEFAULT_STEPS_STAGES: StepsStage[] = [
  {
    value: 3000,
    level: 'softStart',
    titleRu: 'Мягкий минимум',
    titleEn: 'Soft minimum',
    subtitleRu: 'Бережная цель на спокойный день 🌿',
    subtitleEn: 'A gentle goal for a calm day 🌿',
  },
  {
    value: 5000,
    level: 'goodDay',
    titleRu: 'Хороший день',
    titleEn: 'Good day',
    subtitleRu: 'Хороший уровень движения без давления',
    subtitleEn: 'A good level of movement without pressure',
  },
  {
    value: 7000,
    level: 'strongDay',
    titleRu: 'Сильный день',
    titleEn: 'Strong day',
    subtitleRu: 'Очень достойная активность',
    subtitleEn: 'A very solid activity level',
  },
  {
    value: 10000,
    level: 'goalReached',
    titleRu: 'Идеал дня',
    titleEn: 'Ideal day',
    subtitleRu: 'Мощный день, можно собой гордиться 🌿',
    subtitleEn: 'A strong day to feel proud of 🌿',
  },
];

export const normalizeStepsNumber = (value: string | number | undefined) => {
  if (value === undefined || value === null) {
    return 0;
  }

  const number =
    typeof value === 'number' ? value : Number(String(value).replace(',', '.'));

  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
};

export const getNormalizedStepsGoal = (settings: StepsGoalSettings) => {
  return (
    normalizeStepsNumber(settings.dailyGoal) ||
    normalizeStepsNumber(DEFAULT_STEPS_GOAL_SETTINGS.dailyGoal)
  );
};

export const getStepsStagesForGoal = (dailyGoal: number) => {
  const customGoalAlreadyExists = DEFAULT_STEPS_STAGES.some((stage) => {
    return stage.value === dailyGoal;
  });

  if (customGoalAlreadyExists) {
    return DEFAULT_STEPS_STAGES;
  }

  const baseStages = DEFAULT_STEPS_STAGES.filter((stage) => {
    return stage.value < dailyGoal;
  });

  const customGoalStage: StepsStage = {
    value: dailyGoal,
    level: 'goalReached',
    titleRu: 'Моя цель дня',
    titleEn: 'My daily goal',
    subtitleRu: 'Личная цель на сегодня 🌿',
    subtitleEn: 'Your personal goal for today 🌿',
  };

  return [...baseStages, customGoalStage].sort((a, b) => a.value - b.value);
};

export const getStepsGoalEvaluation = (
  steps: string | number | undefined,
  settings: StepsGoalSettings
): StepsGoalEvaluation => {
  const stepsValue = normalizeStepsNumber(steps);
  const dailyGoal = getNormalizedStepsGoal(settings);
  const stages = getStepsStagesForGoal(dailyGoal);

  const progressPercent =
    dailyGoal > 0
      ? Math.min(100, Math.round((stepsValue / dailyGoal) * 100))
      : 0;

  const reachedStages = stages.filter((stage) => {
    return stepsValue >= stage.value;
  });

  const currentStage = reachedStages[reachedStages.length - 1];
  const nextStage = stages.find((stage) => {
    return stepsValue < stage.value;
  });

  if (currentStage) {
    return {
      steps: stepsValue,
      dailyGoal,
      level: currentStage.level,
      titleRu: currentStage.titleRu,
      titleEn: currentStage.titleEn,
      subtitleRu: currentStage.subtitleRu,
      subtitleEn: currentStage.subtitleEn,
      progressPercent,
      nextStage,
    };
  }

  return {
    steps: stepsValue,
    dailyGoal,
    level: 'none',
    titleRu: 'Пока разгоняемся',
    titleEn: 'Warming up',
    subtitleRu: 'Сегодня просто замечаем движение',
    subtitleEn: 'Today we simply notice the movement',
    progressPercent,
    nextStage,
  };
};

export const getStepsGoalTitle = (
  level: StepsGoalLevel,
  language: 'ru' | 'en'
) => {
  const titles = {
    none: {
      ru: 'Пока разгоняемся',
      en: 'Warming up',
    },
    softStart: {
      ru: 'Мягкий минимум',
      en: 'Soft minimum',
    },
    goodDay: {
      ru: 'Хороший день',
      en: 'Good day',
    },
    strongDay: {
      ru: 'Сильный день',
      en: 'Strong day',
    },
    goalReached: {
      ru: 'Идеал дня',
      en: 'Ideal day',
    },
  };

  return titles[level][language];
};