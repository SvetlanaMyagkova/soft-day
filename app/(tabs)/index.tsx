import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AppLanguage,
  LANGUAGE_STORAGE_KEY,
  getAutomaticLanguage,
  getTranslation,
} from '../../constants/i18n';
import {
  DEFAULT_STEPS_GOAL_SETTINGS,
  STEPS_GOAL_STORAGE_KEY,
  StepsGoalSettings,
  getStepsGoalEvaluation,
} from '../../constants/stepsGoal';

const colors = {
  background: '#F5F0E6',
  surface: '#FFF9EF',
  hunterGreen: '#123524',
  sageGreen: '#87906A',
  oliveGreen: '#556B2F',
  warmNude: '#D8C0A0',
  sand: '#C9A978',
  caramel: '#B9783F',
  deepBrown: '#4A2E1F',
  mutedText: '#7A6A58',
  border: '#E3D6C3',
  softRed: '#B85C4B',
};

const DEFAULT_BASE_METABOLISM_CALORIES = 1400;
const CALORIES_PER_STEP = 0.04;
const FINANCE_SETTINGS_STORAGE_KEY = 'soft-day-finance-settings';

type DayEntry = {
  date: string;

  weight: string;

  foodTracked: boolean;
  caloriesTracked: boolean;
  calories: string;
  foodNote: string;

  income: string;
  expenses: string;

  incomeSalary?: string;
  incomeStudio?: string;
  incomeExtra?: string;
  incomeCashback?: string;

  expenseGroceries?: string;
  expenseCafe?: string;
  expenseHome?: string;
  expenseBeauty?: string;
  expenseClothes?: string;
  expenseHealth?: string;
  expenseTransport?: string;
  expenseEntertainment?: string;
  expensePet?: string;
  expenseGifts?: string;
  expenseEducation?: string;
  expenseSubscriptions?: string;
  expenseTravel?: string;
  expenseUsa?: string;
  expenseStudio?: string;
  expenseOther?: string;

  customExpenseName?: string;
  customExpenseAmount?: string;

  steps: string;
  stepsDone: boolean;
  workoutDone: boolean;
  workoutName?: string;
  workoutCalories?: string;

  gratitude: string;
  gratitudeGoodDeed?: string;
  gratitudeSupport?: string;

  readingDone: boolean;
};

type NutritionGoals = {
  caloriesGoal: string;
  proteinGoal: string;
};

type WeightGoalSettings = {
  mode: 'loss' | 'maintenance' | 'gain';
  targetMin: string;
  targetMax: string;
};

type CalorieCalculationSettings = {
  baseMetabolismCalories: string;
};

type FinanceSettings = {
  accountBalance: string;
  dailyLimit: string;
  monthlyIncome: string;
};

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

const getTodayKey = () => {
  return `soft-day-${getTodayDate()}`;
};

const getTodayLabel = (language: AppLanguage) => {
  return new Date().toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'long',
  });
};

const normalizeNumber = (value: string | undefined) => {
  if (!value) {
    return 0;
  }

  const number = Number(value.replace(',', '.').replace(/\s/g, ''));

  return Number.isFinite(number) ? number : 0;
};

const sumMoneyValues = (values: Array<string | undefined>) => {
  return values.reduce((sum, value) => sum + normalizeNumber(value), 0);
};

const formatMoney = (value: number, language: AppLanguage) => {
  return `${Math.round(value).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')} ₽`;
};

const formatCaloriesSigned = (
  value: number,
  t: ReturnType<typeof getTranslation>
) => {
  if (value > 0) {
    return `+${Math.round(value)} ${t.kcal}`;
  }

  if (value < 0) {
    return `${Math.round(value)} ${t.kcal}`;
  }

  return `0 ${t.kcal}`;
};

const calculateNutrition = (caloriesGoal: string, proteinGoal: string) => {
  const calories = normalizeNumber(caloriesGoal);
  const protein = normalizeNumber(proteinGoal);

  if (!calories || !protein) {
    return null;
  }

  const proteinCalories = protein * 4;
  const fatCalories = calories * 0.3;
  const fat = Math.round(fatCalories / 9);
  const carbsCalories = calories - proteinCalories - fatCalories;
  const carbs = Math.max(0, Math.round(carbsCalories / 4));

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    fat,
    carbs,
  };
};

const formatWeightGoalLabel = (
  mode: 'loss' | 'maintenance' | 'gain',
  targetMin: string,
  targetMax: string,
  t: ReturnType<typeof getTranslation>
) => {
  if (mode === 'loss') {
    return `${t.weightGoalLoss} · ${t.deficitGoal} ${targetMin || 0}–${targetMax || 0} ${t.kcal}`;
  }

  if (mode === 'maintenance') {
    return `${t.weightGoalMaintenance} · ${t.maintenanceCorridor} ±${targetMax || 0} ${t.kcal}`;
  }

  return `${t.weightGoalGain} · ${t.surplusGoal} ${targetMin || 0}–${targetMax || 0} ${t.kcal}`;
};

const getGoalEvaluation = (
  balance: number,
  settings: WeightGoalSettings,
  t: ReturnType<typeof getTranslation>
) => {
  const targetMin = Math.abs(normalizeNumber(settings.targetMin || '0'));
  const targetMax = Math.abs(normalizeNumber(settings.targetMax || '0'));
  const roundedBalance = Math.round(balance);

  if (settings.mode === 'loss') {
    if (balance < 0) {
      const deficit = Math.abs(roundedBalance);

      if (deficit >= targetMin && deficit <= targetMax) {
        return {
          title: `${t.deficit} ${deficit} ${t.kcal}`,
          subtitle: t.excellentInGoal,
          tone: 'good' as const,
        };
      }

      if (deficit < targetMin) {
        return {
          title: `${t.deficit} ${deficit} ${t.kcal}`,
          subtitle: t.softDeficitGood,
          tone: 'good' as const,
        };
      }

      return {
        title: `${t.deficit} ${deficit} ${t.kcal}`,
        subtitle: t.strongDeficitCareful,
        tone: 'warning' as const,
      };
    }

    if (balance > 0) {
      return {
        title: `${t.surplus} ${Math.abs(roundedBalance)} ${t.kcal}`,
        subtitle: t.outsideGoalNoDrama,
        tone: 'bad' as const,
      };
    }

    return {
      title: t.maintenance,
      subtitle: t.evenDayNoDeficit,
      tone: 'warning' as const,
    };
  }

  if (settings.mode === 'maintenance') {
    const corridor = targetMax;

    if (Math.abs(balance) <= corridor) {
      return {
        title: formatCaloriesSigned(roundedBalance, t),
        subtitle: t.perfectForMaintenance,
        tone: 'good' as const,
      };
    }

    if (balance < 0) {
      return {
        title: `${t.deficit} ${Math.abs(roundedBalance)} ${t.kcal}`,
        subtitle: t.wentIntoDeficitOk,
        tone: 'warning' as const,
      };
    }

    return {
      title: `${t.surplus} ${Math.abs(roundedBalance)} ${t.kcal}`,
      subtitle: t.wentIntoSurplusNoted,
      tone: 'warning' as const,
    };
  }

  if (balance > 0) {
    const surplus = Math.abs(roundedBalance);

    if (surplus >= targetMin && surplus <= targetMax) {
      return {
        title: `${t.surplus} ${surplus} ${t.kcal}`,
        subtitle: t.excellentInGoal,
        tone: 'good' as const,
      };
    }

    if (surplus < targetMin) {
      return {
        title: `${t.surplus} ${surplus} ${t.kcal}`,
        subtitle: t.softSurplus,
        tone: 'good' as const,
      };
    }

    return {
      title: `${t.surplus} ${surplus} ${t.kcal}`,
      subtitle: t.surplusAboveGoal,
      tone: 'warning' as const,
    };
  }

  if (balance < 0) {
    return {
      title: `${t.deficit} ${Math.abs(roundedBalance)} ${t.kcal}`,
      subtitle: t.notInGoalTodayOk,
      tone: 'bad' as const,
    };
  }

  return {
    title: t.maintenance,
    subtitle: t.evenDayNoSurplus,
    tone: 'warning' as const,
  };
};

export default function HomeScreen() {
  const router = useRouter();

  const [language, setLanguage] = useState<AppLanguage>(getAutomaticLanguage());
  const t = getTranslation(language);

  const isTodayLoadedRef = useRef(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [weight, setWeight] = useState('');

  const [foodTracked, setFoodTracked] = useState(false);
  const [caloriesTracked, setCaloriesTracked] = useState(false);
  const [calories, setCalories] = useState('');
  const [foodNote, setFoodNote] = useState('');

  const [incomeSalary, setIncomeSalary] = useState('');
  const [incomeStudio, setIncomeStudio] = useState('');
  const [incomeExtra, setIncomeExtra] = useState('');
  const [incomeCashback, setIncomeCashback] = useState('');

  const [expenseGroceries, setExpenseGroceries] = useState('');
  const [expenseCafe, setExpenseCafe] = useState('');
  const [expenseHome, setExpenseHome] = useState('');
  const [expenseBeauty, setExpenseBeauty] = useState('');
  const [expenseClothes, setExpenseClothes] = useState('');
  const [expenseHealth, setExpenseHealth] = useState('');
  const [expenseTransport, setExpenseTransport] = useState('');
  const [expenseEntertainment, setExpenseEntertainment] = useState('');
  const [expensePet, setExpensePet] = useState('');
  const [expenseGifts, setExpenseGifts] = useState('');
  const [expenseEducation, setExpenseEducation] = useState('');
  const [expenseSubscriptions, setExpenseSubscriptions] = useState('');
  const [expenseTravel, setExpenseTravel] = useState('');
  const [expenseStudio, setExpenseStudio] = useState('');
  const [expenseOther, setExpenseOther] = useState('');

  const [customExpenseName, setCustomExpenseName] = useState('');
  const [customExpenseAmount, setCustomExpenseAmount] = useState('');

  const [accountBalance, setAccountBalance] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');

  const [steps, setSteps] = useState('');
  const [stepsDone, setStepsDone] = useState(false);
  const [workoutDone, setWorkoutDone] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutCalories, setWorkoutCalories] = useState('');

  const [gratitude, setGratitude] = useState('');
  const [gratitudeGoodDeed, setGratitudeGoodDeed] = useState('');
  const [gratitudeSupport, setGratitudeSupport] = useState('');

  const [readingDone, setReadingDone] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const [caloriesGoal, setCaloriesGoal] = useState('1500');
  const [proteinGoal, setProteinGoal] = useState('90');

  const [weightGoalMode, setWeightGoalMode] =
    useState<'loss' | 'maintenance' | 'gain'>('loss');
  const [targetMin, setTargetMin] = useState('300');
  const [targetMax, setTargetMax] = useState('500');

  const [stepsGoalSettings, setStepsGoalSettings] =
    useState<StepsGoalSettings>(DEFAULT_STEPS_GOAL_SETTINGS);

  const [baseMetabolismCalories, setBaseMetabolismCalories] = useState(
    String(DEFAULT_BASE_METABOLISM_CALORIES)
  );

  const nutrition = calculateNutrition(caloriesGoal, proteinGoal);

  const baseCalories =
    normalizeNumber(baseMetabolismCalories || '0') ||
    DEFAULT_BASE_METABOLISM_CALORIES;

  const weightGoalLabel = formatWeightGoalLabel(
    weightGoalMode,
    targetMin,
    targetMax,
    t
  );

  const totalIncome = sumMoneyValues([
    incomeSalary,
    incomeStudio,
    incomeExtra,
    incomeCashback,
  ]);

  const totalExpenses = sumMoneyValues([
    expenseGroceries,
    expenseCafe,
    expenseHome,
    expenseBeauty,
    expenseClothes,
    expenseHealth,
    expenseTransport,
    expenseEntertainment,
    expensePet,
    expenseGifts,
    expenseEducation,
    expenseSubscriptions,
    expenseTravel,
    expenseStudio,
    expenseOther,
    customExpenseAmount,
  ]);

  const hasFinance = totalIncome > 0 || totalExpenses > 0;

  const consumedCalories = normalizeNumber(calories || '0');
  const stepsCalories = normalizeNumber(steps || '0') * CALORIES_PER_STEP;
  const trainingCalories = normalizeNumber(workoutCalories || '0');

  const burnedCalories = Math.round(
    baseCalories + stepsCalories + trainingCalories
  );

  const calorieBalance = Math.round(consumedCalories - burnedCalories);

  const dailyGoalEvaluation = getGoalEvaluation(
    calorieBalance,
    {
      mode: weightGoalMode,
      targetMin,
      targetMax,
    },
    t
  );

  const stepsGoalEvaluation = getStepsGoalEvaluation(steps, stepsGoalSettings);

  const stepsProgressTitle =
    language === 'ru'
      ? stepsGoalEvaluation.titleRu
      : stepsGoalEvaluation.titleEn;

  const stepsProgressLabel =
    language === 'ru'
      ? `${stepsGoalEvaluation.steps.toLocaleString('ru-RU')} / ${stepsGoalEvaluation.dailyGoal.toLocaleString('ru-RU')} шагов`
      : `${stepsGoalEvaluation.steps.toLocaleString('en-US')} / ${stepsGoalEvaluation.dailyGoal.toLocaleString('en-US')} steps`;

  const hasCaloriesForSummary = consumedCalories > 0;

  const hasSteps = stepsDone || stepsGoalEvaluation.steps > 0;

  const hasGratitude =
    gratitude.trim().length > 0 ||
    gratitudeGoodDeed.trim().length > 0 ||
    gratitudeSupport.trim().length > 0;

  const gratitudeEntriesCount = [
    gratitude.trim(),
    gratitudeGoodDeed.trim(),
    gratitudeSupport.trim(),
  ].filter(Boolean).length;

  const gratitudeWidgetPreview = hasGratitude
    ? language === 'ru'
      ? `${gratitudeEntriesCount} ${
          gratitudeEntriesCount === 1 ? 'запись' : 'записи'
        } · ты уже заметила хорошее сегодня`
      : `${gratitudeEntriesCount} ${
          gratitudeEntriesCount === 1 ? 'note' : 'notes'
        } · you already noticed something good today`
    : language === 'ru'
      ? 'Можно начать с малого — за что ты благодарна сегодня?'
      : 'You can start small — what are you grateful for today?';

  const dailyLimitNumber = normalizeNumber(dailyLimit);
  const accountBalanceNumber = normalizeNumber(accountBalance);
  const hasDailyLimit = dailyLimitNumber > 0;
  const leftToday = dailyLimitNumber - totalExpenses;
  const isOverLimit = hasDailyLimit && totalExpenses > dailyLimitNumber;

  const moneyTodayStatus = hasDailyLimit
    ? isOverLimit
      ? language === 'ru'
        ? 'Выше лимита, просто отметили. Без драмы.'
        : 'Above the limit, just noted. No drama.'
      : language === 'ru'
        ? 'День пока в комфортном лимите 🌿'
        : 'The day is within a comfortable limit 🌿'
    : accountBalanceNumber > 0
      ? language === 'ru'
        ? 'Лимит можно задать в разделе “Финансы”.'
        : 'You can set a limit inside Finance.'
      : language === 'ru'
        ? 'Можно задать счёт и лимит в разделе “Финансы”.'
        : 'You can set account balance and limit inside Finance.';

  const gratitudeWidgetTitle =
    language === 'ru' ? 'Благодарность 🌿' : 'Gratitude 🌿';

  const gratitudeWidgetSubtitle = hasGratitude
    ? language === 'ru'
      ? 'Сегодня уже есть мягкая опора'
      : 'You already have a soft note for today'
    : language === 'ru'
      ? 'Одна простая фраза\nуже считается'
      : 'One simple sentence\nalready counts';

  const movementWidgetTitle =
    language === 'ru' ? 'Движение 👟' : 'Movement 👟';

  const movementWidgetSubtitle =
    stepsGoalEvaluation.steps > 0
      ? language === 'ru'
        ? `${stepsGoalEvaluation.steps.toLocaleString('ru-RU')} шагов сегодня`
        : `${stepsGoalEvaluation.steps.toLocaleString('en-US')} steps today`
      : language === 'ru'
        ? 'Можно начать\nс короткой прогулки'
        : 'You can start\nwith a short walk';

  const movementWidgetPreview =
    workoutName.trim() ||
    (stepsGoalEvaluation.steps > 0
      ? `${stepsProgressTitle} · ${stepsProgressLabel}`
      : language === 'ru'
        ? 'Шаги, тренировки и активные калории будут здесь.'
        : 'Steps, workouts, and active calories will be here.');

  const readingWidgetTitle =
    language === 'ru' ? 'Чтение 📖' : 'Reading 📖';

  const readingWidgetSubtitle = readingDone
    ? language === 'ru'
      ? 'Чтение сегодня уже засчитано'
      : 'Reading is already counted today'
    : language === 'ru'
      ? 'Несколько страниц — уже\nспокойная пауза для себя'
      : 'A few pages already\nmake a calm pause';

  const readingWidgetPreview = readingDone
    ? language === 'ru'
      ? 'Тихая пауза для головы уже была 🌿'
      : 'A quiet pause for your mind is already here 🌿'
    : language === 'ru'
      ? 'Даже одна спокойная страница уже считается.'
      : 'Even one calm page already counts.';

  const widgetAction = language === 'ru' ? 'Открыть' : 'Open';

  const dailyMarks = [
    {
      key: 'gratitude',
      done: hasGratitude,
      label: language === 'ru' ? 'Записала благодарность' : 'Gratitude written',
      onPress: () => router.push('/gratitude'),
    },
    {
      key: 'food',
      done: foodTracked,
      label: language === 'ru' ? 'Сегодня записывала еду' : 'Food logged',
      onPress: () => setFoodTracked(!foodTracked),
    },
    {
      key: 'calories',
      done: caloriesTracked,
      label: language === 'ru' ? 'Считала калории' : 'Calories counted',
      onPress: () => setCaloriesTracked(!caloriesTracked),
    },
    {
      key: 'steps',
      done: hasSteps,
      label: language === 'ru' ? 'Внесла шаги' : 'Steps logged',
      onPress: () => setStepsDone(!stepsDone),
    },
    {
      key: 'workout',
      done: workoutDone,
      label: language === 'ru' ? 'Сделала тренировку' : 'Workout done',
      onPress: () => setWorkoutDone(!workoutDone),
    },
    {
      key: 'reading',
      done: readingDone,
      label: language === 'ru' ? 'Почитала' : 'Reading done',
      onPress: () => setReadingDone(!readingDone),
    },
    {
      key: 'finance',
      done: hasFinance,
      label: language === 'ru' ? 'Внесла финансы' : 'Finance added',
      onPress: () => router.push('/finance'),
    },
  ];

  const completedTodayCount = dailyMarks.filter((item) => item.done).length;
  const totalTodayGoals = dailyMarks.length;

  useFocusEffect(
    useCallback(() => {
      loadLanguage();
      loadTodayEntry();
      loadNutritionGoals();
      loadWeightGoalSettings();
      loadStepsGoalSettings();
      loadCalorieCalculationSettings();
      loadFinanceSettings();
    }, [])
  );

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isTodayLoadedRef.current) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      persistTodayEntry();
    }, 700);
  }, [
    weight,
    foodTracked,
    caloriesTracked,
    calories,
    foodNote,
    incomeSalary,
    incomeStudio,
    incomeExtra,
    incomeCashback,
    expenseGroceries,
    expenseCafe,
    expenseHome,
    expenseBeauty,
    expenseClothes,
    expenseHealth,
    expenseTransport,
    expenseEntertainment,
    expensePet,
    expenseGifts,
    expenseEducation,
    expenseSubscriptions,
    expenseTravel,
    expenseStudio,
    expenseOther,
    customExpenseName,
    customExpenseAmount,
    steps,
    stepsDone,
    workoutDone,
    workoutName,
    workoutCalories,
    gratitude,
    gratitudeGoodDeed,
    gratitudeSupport,
    readingDone,
  ]);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

      if (savedLanguage === 'ru' || savedLanguage === 'en') {
        setLanguage(savedLanguage);
        return;
      }

      setLanguage(getAutomaticLanguage());
    } catch (error) {
      Alert.alert(t.error, 'Could not load language');
    }
  };

  const loadFinanceSettings = async () => {
    try {
      const settingsRaw = await AsyncStorage.getItem(FINANCE_SETTINGS_STORAGE_KEY);

      if (!settingsRaw) {
        return;
      }

      const settings: FinanceSettings = JSON.parse(settingsRaw);

      setAccountBalance(settings.accountBalance || '');
      setDailyLimit(settings.dailyLimit || '');
    } catch (error) {
      return;
    }
  };

  const loadTodayEntry = async () => {
    try {
      isTodayLoadedRef.current = false;

      const savedEntry = await AsyncStorage.getItem(getTodayKey());

      if (!savedEntry) {
        isTodayLoadedRef.current = true;
        return;
      }

      const parsedEntry: DayEntry = JSON.parse(savedEntry);

      setWeight(parsedEntry.weight || '');

      setFoodTracked(parsedEntry.foodTracked || false);
      setCaloriesTracked(parsedEntry.caloriesTracked || false);
      setCalories(parsedEntry.calories || '');
      setFoodNote(parsedEntry.foodNote || '');

      setIncomeSalary(parsedEntry.incomeSalary || '');
      setIncomeStudio(parsedEntry.incomeStudio || '');
      setIncomeExtra(parsedEntry.incomeExtra || '');
      setIncomeCashback(parsedEntry.incomeCashback || '');

      setExpenseGroceries(parsedEntry.expenseGroceries || '');
      setExpenseCafe(parsedEntry.expenseCafe || '');
      setExpenseHome(parsedEntry.expenseHome || '');
      setExpenseBeauty(parsedEntry.expenseBeauty || '');
      setExpenseClothes(parsedEntry.expenseClothes || '');
      setExpenseHealth(parsedEntry.expenseHealth || '');
      setExpenseTransport(parsedEntry.expenseTransport || '');
      setExpenseEntertainment(parsedEntry.expenseEntertainment || '');
      setExpensePet(parsedEntry.expensePet || '');
      setExpenseGifts(parsedEntry.expenseGifts || '');
      setExpenseEducation(parsedEntry.expenseEducation || '');
      setExpenseSubscriptions(parsedEntry.expenseSubscriptions || '');
      setExpenseTravel(parsedEntry.expenseTravel || parsedEntry.expenseUsa || '');
      setExpenseStudio(parsedEntry.expenseStudio || '');
      setExpenseOther(parsedEntry.expenseOther || parsedEntry.expenses || '');

      setCustomExpenseName(parsedEntry.customExpenseName || '');
      setCustomExpenseAmount(parsedEntry.customExpenseAmount || '');

      setSteps(parsedEntry.steps || '');
      setStepsDone(parsedEntry.stepsDone || false);
      setWorkoutDone(parsedEntry.workoutDone || false);
      setWorkoutName(parsedEntry.workoutName || '');
      setWorkoutCalories(parsedEntry.workoutCalories || '');

      setGratitude(parsedEntry.gratitude || '');
      setGratitudeGoodDeed(parsedEntry.gratitudeGoodDeed || '');
      setGratitudeSupport(parsedEntry.gratitudeSupport || '');

      setReadingDone(parsedEntry.readingDone || false);

      setTimeout(() => {
        isTodayLoadedRef.current = true;
      }, 0);
    } catch (error) {
      isTodayLoadedRef.current = true;
      Alert.alert(t.error, t.loadDayError);
    }
  };

  const loadNutritionGoals = async () => {
    try {
      const goalsRaw = await AsyncStorage.getItem('soft-day-nutrition-goals');

      if (!goalsRaw) {
        return;
      }

      const goals: NutritionGoals = JSON.parse(goalsRaw);

      setCaloriesGoal(goals.caloriesGoal || '1500');
      setProteinGoal(goals.proteinGoal || '90');
    } catch (error) {
      Alert.alert(t.error, t.loadNutritionError);
    }
  };

  const loadWeightGoalSettings = async () => {
    try {
      const settingsRaw = await AsyncStorage.getItem(
        'soft-day-weight-goal-settings'
      );

      if (!settingsRaw) {
        return;
      }

      const settings: WeightGoalSettings = JSON.parse(settingsRaw);

      setWeightGoalMode(settings.mode || 'loss');
      setTargetMin(settings.targetMin || '300');
      setTargetMax(settings.targetMax || '500');
    } catch (error) {
      Alert.alert(t.error, t.loadWeightGoalError);
    }
  };

  const loadStepsGoalSettings = async () => {
    try {
      const settingsRaw = await AsyncStorage.getItem(STEPS_GOAL_STORAGE_KEY);

      if (!settingsRaw) {
        return;
      }

      const settings: StepsGoalSettings = JSON.parse(settingsRaw);

      setStepsGoalSettings({
        dailyGoal: settings.dailyGoal || DEFAULT_STEPS_GOAL_SETTINGS.dailyGoal,
      });
    } catch (error) {
      setStepsGoalSettings(DEFAULT_STEPS_GOAL_SETTINGS);
    }
  };

  const loadCalorieCalculationSettings = async () => {
    try {
      const settingsRaw = await AsyncStorage.getItem(
        'soft-day-calorie-calculation-settings'
      );

      if (!settingsRaw) {
        return;
      }

      const settings: CalorieCalculationSettings = JSON.parse(settingsRaw);

      setBaseMetabolismCalories(settings.baseMetabolismCalories || '1400');
    } catch (error) {
      Alert.alert(t.error, t.loadCalculationError);
    }
  };

  const persistTodayEntry = async () => {
    try {
      const entry: DayEntry = {
        date: getTodayDate(),

        weight,

        foodTracked,
        caloriesTracked,
        calories,
        foodNote,

        income: String(totalIncome || ''),
        expenses: String(totalExpenses || ''),

        incomeSalary,
        incomeStudio,
        incomeExtra,
        incomeCashback,

        expenseGroceries,
        expenseCafe,
        expenseHome,
        expenseBeauty,
        expenseClothes,
        expenseHealth,
        expenseTransport,
        expenseEntertainment,
        expensePet,
        expenseGifts,
        expenseEducation,
        expenseSubscriptions,
        expenseTravel,
        expenseUsa: '',
        expenseStudio,
        expenseOther,

        customExpenseName,
        customExpenseAmount,

        steps,
        stepsDone,
        workoutDone,
        workoutName,
        workoutCalories,

        gratitude,
        gratitudeGoodDeed,
        gratitudeSupport,

        readingDone,
      };

      await AsyncStorage.setItem(getTodayKey(), JSON.stringify(entry));

      const historyRaw = await AsyncStorage.getItem('soft-day-history');
      const history: DayEntry[] = historyRaw ? JSON.parse(historyRaw) : [];

      const updatedHistory = [
        entry,
        ...history.filter((item) => item.date !== entry.date),
      ];

      await AsyncStorage.setItem(
        'soft-day-history',
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      return;
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.appName}>{t.appName}</Text>
        <Text style={styles.date}>
          {t.todayDatePrefix}, {getTodayLabel(language)}
        </Text>
        <Text style={styles.subtitle}>{t.todaySubtitle}</Text>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeaderRow}>
          <Text style={styles.progressTitle}>{t.dayProgress}</Text>
          <Text style={styles.progressCount}>
            {completedTodayCount}/{totalTodayGoals}
          </Text>
        </View>

        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${(completedTodayCount / totalTodayGoals) * 100}%` },
            ]}
          />
        </View>

        <Text style={styles.progressText}>
          {completedTodayCount === 0
            ? t.softStart
            : completedTodayCount === totalTodayGoals
              ? t.dayClosedFully
              : `${t.completedToday} ${completedTodayCount} / ${totalTodayGoals}`}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.widgetCard}
        activeOpacity={0.86}
        onPress={() => router.push('/gratitude')}
      >
        <View style={styles.widgetTopRow}>
          <View style={styles.widgetIcon}>
            <Text style={styles.widgetIconText}>🌿</Text>
          </View>

          <View style={styles.widgetTextBlock}>
            <Text style={styles.widgetTitle}>{gratitudeWidgetTitle}</Text>
            <Text style={styles.widgetSubtitle}>{gratitudeWidgetSubtitle}</Text>
          </View>

          <Text style={styles.widgetAction}>{widgetAction}</Text>
        </View>

        <View style={styles.widgetStatusBox}>
          <Text style={styles.widgetStatusText}>{gratitudeWidgetPreview}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.widgetCard}
        activeOpacity={0.86}
        onPress={() => router.push('/training')}
      >
        <View style={styles.widgetTopRow}>
          <View style={styles.widgetIcon}>
            <Text style={styles.widgetIconText}>👟</Text>
          </View>

          <View style={styles.widgetTextBlock}>
            <Text style={styles.widgetTitle}>{movementWidgetTitle}</Text>
            <Text style={styles.widgetSubtitle}>{movementWidgetSubtitle}</Text>
          </View>

          <Text style={styles.widgetAction}>{widgetAction}</Text>
        </View>

        <Text style={styles.widgetPreview} numberOfLines={2}>
          {movementWidgetPreview}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.widgetCard}
        activeOpacity={0.86}
        onPress={() => router.push('/reading')}
      >
        <View style={styles.widgetTopRow}>
          <View style={styles.widgetIcon}>
            <Text style={styles.widgetIconText}>📖</Text>
          </View>

          <View style={styles.widgetTextBlock}>
            <Text style={styles.widgetTitle}>{readingWidgetTitle}</Text>
            <Text style={styles.widgetSubtitle}>{readingWidgetSubtitle}</Text>
          </View>

          <Text style={styles.widgetAction}>{widgetAction}</Text>
        </View>

        <Text style={styles.widgetPreview} numberOfLines={2}>
          {readingWidgetPreview}
        </Text>
      </TouchableOpacity>

      <View style={styles.compactGoalCard}>
        <Text style={styles.compactGoalTitle}>
          {language === 'ru' ? 'Ориентир на день' : 'Daily guide'}
        </Text>

        {nutrition ? (
          <Text style={styles.compactGoalText}>
            {nutrition.calories} {t.kcal} · {t.protein} {nutrition.protein}{' '}
            {t.gramsShort} · {t.fats} {nutrition.fat} {t.gramsShort} ·{' '}
            {t.carbs} {nutrition.carbs} {t.gramsShort}
          </Text>
        ) : (
          <Text style={styles.compactGoalText}>
            {t.nutritionCanBeSetInSettings}
          </Text>
        )}

        <Text style={styles.compactGoalText}>{weightGoalLabel}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.weight}</Text>

        <TextInput
          style={styles.input}
          placeholder={t.weightPlaceholder}
          placeholderTextColor={colors.mutedText}
          keyboardType="decimal-pad"
          value={weight}
          onChangeText={setWeight}
        />
      </View>

      <TouchableOpacity
        style={styles.foodBigCard}
        activeOpacity={0.86}
        onPress={() => router.push('/food')}
      >
        <View style={styles.foodBigHeader}>
          <View style={styles.foodBigTitleBlock}>
            <View style={styles.foodBigIcon}>
              <Text style={styles.foodBigIconText}>🍽️</Text>
            </View>

            <View style={styles.foodBigTextBlock}>
              <Text style={styles.foodBigTitle}>
                {language === 'ru' ? 'Еда' : 'Food'}
              </Text>
              <Text style={styles.foodBigSubtitle}>
                {language === 'ru'
                  ? 'Съела / потратила'
                  : 'Eaten / burned'}
              </Text>
            </View>
          </View>

          <Text style={styles.foodBigAction}>{widgetAction}</Text>
        </View>

        <View style={styles.foodBigGrid}>
          <View style={styles.foodBigBox}>
            <Text style={styles.foodBigLabel}>{t.eaten}</Text>
            <Text style={styles.foodBigValue}>
              {hasCaloriesForSummary ? `${Math.round(consumedCalories)}` : '—'}
            </Text>
            <Text style={styles.foodBigUnit}>{t.kcal}</Text>
          </View>

          <View style={styles.foodBigBox}>
            <Text style={styles.foodBigLabel}>{t.burned}</Text>
            <Text style={styles.foodBigValue}>
              {hasCaloriesForSummary ? `${burnedCalories}` : '—'}
            </Text>
            <Text style={styles.foodBigUnit}>{t.kcal}</Text>
          </View>
        </View>

        <View
          style={[
            styles.foodBigStatusBox,
            hasCaloriesForSummary &&
              dailyGoalEvaluation.tone === 'good' &&
              styles.foodBigStatusGood,
            hasCaloriesForSummary &&
              dailyGoalEvaluation.tone === 'warning' &&
              styles.foodBigStatusWarning,
            hasCaloriesForSummary &&
              dailyGoalEvaluation.tone === 'bad' &&
              styles.foodBigStatusBad,
          ]}
        >
          <Text style={styles.foodBigStatusLabel}>
            {language === 'ru' ? 'Баланс дня' : 'Daily balance'}
          </Text>

          <Text
            style={[
              styles.foodBigStatusValue,
              hasCaloriesForSummary &&
                dailyGoalEvaluation.tone === 'good' &&
                styles.summaryGood,
              hasCaloriesForSummary &&
                dailyGoalEvaluation.tone === 'warning' &&
                styles.summaryWarning,
              hasCaloriesForSummary &&
                dailyGoalEvaluation.tone === 'bad' &&
                styles.summaryBad,
            ]}
          >
            {hasCaloriesForSummary ? dailyGoalEvaluation.title : t.noDataYet}
          </Text>

          <Text style={styles.foodBigStatusText}>
            {hasCaloriesForSummary
              ? dailyGoalEvaluation.subtitle
              : language === 'ru'
                ? 'Калории можно внести в разделе “Еда”.'
                : 'You can add calories inside Food.'}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.financeBigCard}
        activeOpacity={0.86}
        onPress={() => router.push('/finance')}
      >
        <View style={styles.financeBigHeader}>
          <View style={styles.financeBigTitleBlock}>
            <View style={styles.financeBigIcon}>
              <Text style={styles.financeBigIconText}>💳</Text>
            </View>

            <View style={styles.financeBigTextBlock}>
              <Text style={styles.financeBigTitle}>
                {language === 'ru' ? 'Финансы' : 'Finance'}
              </Text>
              <Text style={styles.financeBigSubtitle}>
                {language === 'ru'
                  ? 'Деньги на сегодня'
                  : 'Money for today'}
              </Text>
            </View>
          </View>

          <Text style={styles.financeBigAction}>{widgetAction}</Text>
        </View>

        <View style={styles.financeBigGrid}>
          <View style={styles.financeBigBox}>
            <Text style={styles.financeBigLabel}>
              {language === 'ru' ? 'Потрачено' : 'Spent'}
            </Text>
            <Text style={styles.financeBigValue}>
              {formatMoney(totalExpenses, language)}
            </Text>
          </View>

          <View style={styles.financeBigBox}>
            <Text style={styles.financeBigLabel}>
              {language === 'ru' ? 'Лимит' : 'Limit'}
            </Text>
            <Text style={styles.financeBigValue}>
              {hasDailyLimit ? formatMoney(dailyLimitNumber, language) : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.financeBigStatusBox}>
          <Text style={styles.financeBigStatusLabel}>
            {hasDailyLimit
              ? isOverLimit
                ? language === 'ru'
                  ? 'Выше лимита'
                  : 'Above limit'
                : language === 'ru'
                  ? 'Осталось'
                  : 'Left'
              : accountBalanceNumber > 0
                ? language === 'ru'
                  ? 'На счету'
                  : 'On account'
                : language === 'ru'
                  ? 'Статус'
                  : 'Status'}
          </Text>

          <Text
            style={[
              styles.financeBigStatusValue,
              isOverLimit && styles.financeBigWarning,
            ]}
          >
            {hasDailyLimit
              ? formatMoney(Math.abs(leftToday), language)
              : accountBalanceNumber > 0
                ? formatMoney(accountBalanceNumber, language)
                : language === 'ru'
                  ? 'Не задано'
                  : 'Not set'}
          </Text>

          <Text style={styles.financeBigStatusText}>{moneyTodayStatus}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.marksCard}>
        <Text style={styles.marksTitle}>
          {language === 'ru' ? 'Отметки дня' : 'Daily notes'}
        </Text>

        <Text style={styles.marksSubtitle}>
          {language === 'ru'
            ? 'Быстрые галочки без давления.\nЧто было сделано за сегодня.'
            : 'Quick gentle checks.\nWhat has been done today.'}
        </Text>

        <View style={styles.marksList}>
          {dailyMarks.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.markRow}
              onPress={item.onPress}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, item.done && styles.checkboxChecked]}>
                {item.done && <Text style={styles.checkMark}>✓</Text>}
              </View>

              <Text style={styles.markText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {savedMessage ? (
        <Text style={styles.savedMessage}>{savedMessage}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 70,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 26,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.hunterGreen,
    marginBottom: 6,
  },
  date: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.deepBrown,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: colors.mutedText,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.deepBrown,
  },
  progressCount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.hunterGreen,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: colors.background,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.hunterGreen,
    borderRadius: 999,
  },
  progressText: {
    fontSize: 15,
    color: colors.mutedText,
  },
  widgetCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  widgetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  widgetIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  widgetIconText: {
    fontSize: 21,
  },
  widgetTextBlock: {
    flex: 1,
  },
  widgetTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 3,
  },
  widgetSubtitle: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 19,
  },
  widgetAction: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.hunterGreen,
  },
  widgetPreview: {
    fontSize: 15,
    color: colors.deepBrown,
    lineHeight: 21,
  },
  widgetStatusBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  widgetStatusText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.deepBrown,
    lineHeight: 21,
  },
  compactGoalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactGoalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.deepBrown,
    marginBottom: 10,
  },
  compactGoalText: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 22,
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.deepBrown,
    marginBottom: 14,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.deepBrown,
    marginBottom: 14,
  },
  foodBigCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginTop: 6,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  foodBigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  foodBigTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  foodBigIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  foodBigIconText: {
    fontSize: 21,
  },
  foodBigTextBlock: {
    flex: 1,
  },
  foodBigTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 3,
  },
  foodBigSubtitle: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 19,
  },
  foodBigAction: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.hunterGreen,
  },
  foodBigGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  foodBigBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  foodBigLabel: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 6,
  },
  foodBigValue: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.deepBrown,
  },
  foodBigUnit: {
    fontSize: 13,
    color: colors.mutedText,
    marginTop: 2,
  },
  foodBigStatusBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  foodBigStatusGood: {
    borderColor: colors.sageGreen,
  },
  foodBigStatusWarning: {
    borderColor: colors.caramel,
  },
  foodBigStatusBad: {
    borderColor: colors.softRed,
  },
  foodBigStatusLabel: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 6,
  },
  foodBigStatusValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 4,
  },
  foodBigStatusText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.mutedText,
    lineHeight: 19,
  },
  financeBigCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  financeBigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  financeBigTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  financeBigIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  financeBigIconText: {
    fontSize: 21,
  },
  financeBigTextBlock: {
    flex: 1,
  },
  financeBigTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 3,
  },
  financeBigSubtitle: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 19,
  },
  financeBigAction: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.hunterGreen,
  },
  financeBigGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  financeBigBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  financeBigLabel: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 6,
  },
  financeBigValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.deepBrown,
  },
  financeBigStatusBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  financeBigStatusLabel: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 6,
  },
  financeBigStatusValue: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.hunterGreen,
    marginBottom: 4,
  },
  financeBigWarning: {
    color: colors.softRed,
  },
  financeBigStatusText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.mutedText,
    lineHeight: 19,
  },
  marksCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  marksTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 6,
  },
  marksSubtitle: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
    marginBottom: 14,
  },
  marksList: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  markText: {
    fontSize: 16,
    color: colors.deepBrown,
    flex: 1,
    lineHeight: 22,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.sageGreen,
    marginRight: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.hunterGreen,
    borderColor: colors.hunterGreen,
  },
  checkMark: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
  },
  summaryGood: {
    color: colors.hunterGreen,
  },
  summaryWarning: {
    color: colors.caramel,
  },
  summaryBad: {
    color: colors.softRed,
  },
  savedMessage: {
    textAlign: 'center',
    color: colors.oliveGreen,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
});