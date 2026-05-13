import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

const READING_TIMER_SECONDS = 15 * 60;
const DEFAULT_BASE_METABOLISM_CALORIES = 1400;
const CALORIES_PER_STEP = 0.04;

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
  expenseUsa?: string;
  expenseStudio?: string;
  expenseOther?: string;

  steps: string;
  stepsDone: boolean;
  workoutDone: boolean;
  workoutName?: string;
  workoutCalories?: string;

  gratitude: string;

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

const normalizeNumber = (value: string) => {
  return Number(value.replace(',', '.'));
};

const sumMoneyValues = (values: string[]) => {
  return values.reduce((sum, value) => {
    const number = normalizeNumber(value || '0');
    return sum + (Number.isFinite(number) ? number : 0);
  }, 0);
};

const formatMoney = (value: number, language: AppLanguage) => {
  if (language === 'ru') {
    return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
  }

  return `${Math.round(value).toLocaleString('en-US')} ₽`;
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

const formatTimer = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export default function HomeScreen() {
  const [language, setLanguage] = useState<AppLanguage>(getAutomaticLanguage());
  const t = getTranslation(language);

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
  const [expenseUsa, setExpenseUsa] = useState('');
  const [expenseStudio, setExpenseStudio] = useState('');
  const [expenseOther, setExpenseOther] = useState('');

  const [isFinanceEditing, setIsFinanceEditing] = useState(false);

  const [steps, setSteps] = useState('');
  const [stepsDone, setStepsDone] = useState(false);
  const [workoutDone, setWorkoutDone] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutCalories, setWorkoutCalories] = useState('');

  const [gratitude, setGratitude] = useState('');

  const [readingDone, setReadingDone] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const [timerSeconds, setTimerSeconds] = useState(READING_TIMER_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

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
    expenseUsa,
    expenseStudio,
    expenseOther,
  ]);

  const dayBalance = totalIncome - totalExpenses;

  const consumedCalories = normalizeNumber(calories || '0');
  const stepsCalories = normalizeNumber(steps || '0') * CALORIES_PER_STEP;
  const trainingCalories = normalizeNumber(workoutCalories || '0');

  const roundedStepsCalories = Math.round(stepsCalories);
  const roundedTrainingCalories = Math.round(trainingCalories);

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

  const stepsProgressSubtitle =
    language === 'ru'
      ? stepsGoalEvaluation.subtitleRu
      : stepsGoalEvaluation.subtitleEn;

  const stepsProgressLabel =
    language === 'ru'
      ? `${stepsGoalEvaluation.steps.toLocaleString('ru-RU')} / ${stepsGoalEvaluation.dailyGoal.toLocaleString('ru-RU')} шагов`
      : `${stepsGoalEvaluation.steps.toLocaleString('en-US')} / ${stepsGoalEvaluation.dailyGoal.toLocaleString('en-US')} steps`;

  const nextStepsText = stepsGoalEvaluation.nextStage
    ? language === 'ru'
      ? `До следующей ступени: ${Math.max(
          0,
          stepsGoalEvaluation.nextStage.value - stepsGoalEvaluation.steps
        ).toLocaleString('ru-RU')} шагов`
      : `To the next step: ${Math.max(
          0,
          stepsGoalEvaluation.nextStage.value - stepsGoalEvaluation.steps
        ).toLocaleString('en-US')} steps`
    : language === 'ru'
      ? 'Цель на день выполнена 🌿'
      : 'Daily goal completed 🌿';

  const stepsDoneLabel = language === 'ru' ? 'Шаги внесены' : 'Steps logged';

  const workoutNameLabel =
    language === 'ru' ? 'Тренировка' : 'Workout';

  const workoutNamePlaceholder =
    language === 'ru'
      ? 'Например, пилатес 50 минут'
      : 'For example, Pilates 50 min';

  const workoutNameHint =
    language === 'ru'
      ? 'Напиши, что делала. Можно оставить пустым, если тренировки не было.'
      : 'Write what you did. You can leave it empty if there was no workout.';

  const workoutCaloriesHint =
    language === 'ru'
      ? `Укажи активные калории тренировки, если они есть в часах или приложении. Сейчас тренировка добавляет +${roundedTrainingCalories} ${t.kcal} к расходу.`
      : `Enter active workout calories if your watch or app shows them. Now workout adds +${roundedTrainingCalories} ${t.kcal} to your burn.`;

  const hasCaloriesForSummary = consumedCalories > 0;

  const completedTodayCount = [
    foodTracked,
    caloriesTracked,
    stepsDone,
    workoutDone,
    gratitude.trim().length > 0,
    readingDone,
  ].filter(Boolean).length;

  const totalTodayGoals = 6;

  useFocusEffect(
    useCallback(() => {
      loadLanguage();
      loadNutritionGoals();
      loadWeightGoalSettings();
      loadStepsGoalSettings();
      loadCalorieCalculationSettings();
    }, [])
  );

  useEffect(() => {
    loadTodayEntry();
  }, []);

  useEffect(() => {
    if (!isTimerRunning) {
      return;
    }

    const interval = setInterval(() => {
      setTimerSeconds((previousSeconds) => {
        if (previousSeconds <= 1) {
          clearInterval(interval);
          setIsTimerRunning(false);
          setReadingDone(true);
          setSavedMessage(t.readingCounted);
          setTimeout(() => setSavedMessage(''), 2500);

          return 0;
        }

        return previousSeconds - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, t.readingCounted]);

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

  const loadTodayEntry = async () => {
    try {
      const savedEntry = await AsyncStorage.getItem(getTodayKey());

      if (!savedEntry) {
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
      setExpenseUsa(parsedEntry.expenseUsa || '');
      setExpenseStudio(parsedEntry.expenseStudio || '');
      setExpenseOther(parsedEntry.expenseOther || parsedEntry.expenses || '');

      setSteps(parsedEntry.steps || '');
      setStepsDone(parsedEntry.stepsDone || false);
      setWorkoutDone(parsedEntry.workoutDone || false);
      setWorkoutName(parsedEntry.workoutName || '');
      setWorkoutCalories(parsedEntry.workoutCalories || '');

      setGratitude(parsedEntry.gratitude || '');

      setReadingDone(parsedEntry.readingDone || false);
    } catch (error) {
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

  const resetReadingTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(READING_TIMER_SECONDS);
    setReadingDone(false);
  };

  const saveTodayEntry = async () => {
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
        expenseUsa,
        expenseStudio,
        expenseOther,

        steps,
        stepsDone,
        workoutDone,
        workoutName,
        workoutCalories,

        gratitude,

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

      setSavedMessage(t.daySaved);
      setTimeout(() => setSavedMessage(''), 2500);
    } catch (error) {
      Alert.alert(t.error, t.saveDayError);
    }
  };

  const incomeFields = [
    { label: t.salary, value: incomeSalary, setValue: setIncomeSalary },
    { label: t.studio, value: incomeStudio, setValue: setIncomeStudio },
    { label: t.extraIncome, value: incomeExtra, setValue: setIncomeExtra },
    { label: t.cashback, value: incomeCashback, setValue: setIncomeCashback },
  ];

  const expenseFields = [
    { label: t.groceries, value: expenseGroceries, setValue: setExpenseGroceries },
    { label: t.cafeDelivery, value: expenseCafe, setValue: setExpenseCafe },
    { label: t.home, value: expenseHome, setValue: setExpenseHome },
    { label: t.beauty, value: expenseBeauty, setValue: setExpenseBeauty },
    { label: t.clothes, value: expenseClothes, setValue: setExpenseClothes },
    { label: t.health, value: expenseHealth, setValue: setExpenseHealth },
    { label: t.transport, value: expenseTransport, setValue: setExpenseTransport },
    {
      label: t.entertainment,
      value: expenseEntertainment,
      setValue: setExpenseEntertainment,
    },
    { label: t.pet, value: expensePet, setValue: setExpensePet },
    { label: t.gifts, value: expenseGifts, setValue: setExpenseGifts },
    { label: t.education, value: expenseEducation, setValue: setExpenseEducation },
    {
      label: t.subscriptions,
      value: expenseSubscriptions,
      setValue: setExpenseSubscriptions,
    },
    { label: t.usa, value: expenseUsa, setValue: setExpenseUsa },
    { label: t.studioExpenses, value: expenseStudio, setValue: setExpenseStudio },
    { label: t.other, value: expenseOther, setValue: setExpenseOther },
  ];

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

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeaderRow}>
          <Text style={styles.summaryTitle}>{t.todayCalories}</Text>
          <Text style={styles.summaryHint}>{t.todayCaloriesHint}</Text>
        </View>

        <TextInput
          style={styles.summaryInput}
          placeholder={t.caloriesForDay}
          placeholderTextColor={colors.mutedText}
          keyboardType="number-pad"
          value={calories}
          onChangeText={setCalories}
        />

        <View style={styles.calorieStatsRow}>
          <View style={styles.calorieStatBox}>
            <Text style={styles.calorieStatLabel}>{t.eaten}</Text>
            <Text style={styles.calorieStatValue}>
              {hasCaloriesForSummary ? Math.round(consumedCalories) : '—'}
            </Text>
            <Text style={styles.calorieStatUnit}>{t.kcal}</Text>
          </View>

          <View style={styles.calorieStatBox}>
            <Text style={styles.calorieStatLabel}>{t.burned}</Text>
            <Text style={styles.calorieStatValue}>
              {hasCaloriesForSummary ? burnedCalories : '—'}
            </Text>
            <Text style={styles.calorieStatUnit}>{t.kcal}</Text>
          </View>
        </View>

        <View style={styles.burnBreakdownBox}>
          <Text style={styles.burnBreakdownTitle}>
            {language === 'ru' ? 'Из чего складывается расход' : 'Burn breakdown'}
          </Text>

          <View style={styles.burnBreakdownRow}>
            <Text style={styles.burnBreakdownLabel}>
              {language === 'ru' ? 'Базовый метаболизм' : 'Base metabolism'}
            </Text>
            <Text style={styles.burnBreakdownValue}>
              {Math.round(baseCalories)} {t.kcal}
            </Text>
          </View>

          <View style={styles.burnBreakdownRow}>
            <Text style={styles.burnBreakdownLabel}>
              {language === 'ru' ? 'Шаги' : 'Steps'}
            </Text>
            <Text style={styles.burnBreakdownValue}>
              +{roundedStepsCalories} {t.kcal}
            </Text>
          </View>

          <View style={styles.burnBreakdownRow}>
            <Text style={styles.burnBreakdownLabel}>
              {language === 'ru' ? 'Тренировка' : 'Workout'}
            </Text>
            <Text style={styles.burnBreakdownValue}>
              +{roundedTrainingCalories} {t.kcal}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.balanceBox,
            hasCaloriesForSummary &&
              dailyGoalEvaluation.tone === 'good' &&
              styles.balanceBoxGood,
            hasCaloriesForSummary &&
              dailyGoalEvaluation.tone === 'warning' &&
              styles.balanceBoxWarning,
            hasCaloriesForSummary &&
              dailyGoalEvaluation.tone === 'bad' &&
              styles.balanceBoxBad,
          ]}
        >
          <Text style={styles.balanceBoxLabel}>{t.dayBalanceCalories}</Text>

          <Text
            style={[
              styles.balanceBoxValue,
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

          <Text style={styles.balanceBoxSubtitle}>
            {hasCaloriesForSummary
              ? dailyGoalEvaluation.subtitle
              : t.noCaloriesHint}
          </Text>
        </View>

        <Text style={styles.summaryFormula}>
          {hasCaloriesForSummary
            ? `${baseCalories} ${t.caloriesFormulaFilled}`
            : t.caloriesFormulaEmpty}
        </Text>
      </View>

      <View style={styles.compactGoalCard}>
        <Text style={styles.compactGoalTitle}>{t.orientation}</Text>

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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.food}</Text>

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setFoodTracked(!foodTracked)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, foodTracked && styles.checkboxChecked]}>
            {foodTracked && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkText}>{t.foodTracked}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setCaloriesTracked(!caloriesTracked)}
          activeOpacity={0.8}
        >
          <View
            style={[styles.checkbox, caloriesTracked && styles.checkboxChecked]}
          >
            {caloriesTracked && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkText}>{t.caloriesTracked}</Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.input, styles.bigInput]}
          placeholder={t.foodNotePlaceholder}
          placeholderTextColor={colors.mutedText}
          multiline
          value={foodNote}
          onChangeText={setFoodNote}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.financeHeaderRow}>
          <Text style={styles.cardTitle}>{t.finance}</Text>

          <TouchableOpacity
            style={styles.editGoalButton}
            activeOpacity={0.85}
            onPress={() => setIsFinanceEditing(!isFinanceEditing)}
          >
            <Text style={styles.editGoalButtonText}>
              {isFinanceEditing ? t.hide : t.categories}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.financeSummary}>
          <View style={styles.financeSummaryRow}>
            <Text style={styles.financeLabel}>{t.income}</Text>
            <Text style={styles.financeIncome}>
              {formatMoney(totalIncome, language)}
            </Text>
          </View>

          <View style={styles.financeSummaryRow}>
            <Text style={styles.financeLabel}>{t.expenses}</Text>
            <Text style={styles.financeExpense}>
              {formatMoney(totalExpenses, language)}
            </Text>
          </View>

          <View style={styles.financeDivider} />

          <View style={styles.financeSummaryRow}>
            <Text style={styles.financeBalanceLabel}>{t.dayMoneyBalance}</Text>
            <Text
              style={[
                styles.financeBalance,
                dayBalance < 0 && styles.financeBalanceNegative,
              ]}
            >
              {dayBalance >= 0 ? '+' : ''}
              {formatMoney(dayBalance, language)}
            </Text>
          </View>
        </View>

        {isFinanceEditing ? (
          <View style={styles.financeEditBlock}>
            <Text style={styles.financeSectionTitle}>{t.income}</Text>

            {incomeFields.map((field) => (
              <View key={field.label} style={styles.moneyRow}>
                <Text style={styles.moneyLabel}>{field.label}</Text>
                <TextInput
                  style={styles.moneyInput}
                  placeholder="0"
                  placeholderTextColor={colors.mutedText}
                  keyboardType="number-pad"
                  value={field.value}
                  onChangeText={field.setValue}
                />
              </View>
            ))}

            <Text style={styles.financeSectionTitle}>{t.expenses}</Text>

            {expenseFields.map((field) => (
              <View key={field.label} style={styles.moneyRow}>
                <Text style={styles.moneyLabel}>{field.label}</Text>
                <TextInput
                  style={styles.moneyInput}
                  placeholder="0"
                  placeholderTextColor={colors.mutedText}
                  keyboardType="number-pad"
                  value={field.value}
                  onChangeText={field.setValue}
                />
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.movement}</Text>

        <TextInput
          style={styles.input}
          placeholder={t.stepsTodayPlaceholder}
          placeholderTextColor={colors.mutedText}
          keyboardType="number-pad"
          value={steps}
          onChangeText={setSteps}
        />

        <Text style={styles.activityCaloriesHint}>
          {language === 'ru'
            ? `Шаги добавляют примерно +${roundedStepsCalories} ${t.kcal} к расходу`
            : `Steps add about +${roundedStepsCalories} ${t.kcal} to your burn`}
        </Text>

        <View style={styles.stepsProgressBox}>
          <View style={styles.stepsProgressHeader}>
            <View>
              <Text style={styles.stepsProgressTitle}>{stepsProgressTitle}</Text>
              <Text style={styles.stepsProgressSubtitle}>
                {stepsProgressSubtitle}
              </Text>
            </View>

            <Text style={styles.stepsProgressPercent}>
              {stepsGoalEvaluation.progressPercent}%
            </Text>
          </View>

          <Text style={styles.stepsProgressLabel}>{stepsProgressLabel}</Text>

          <View style={styles.stepsProgressBarBackground}>
            <View
              style={[
                styles.stepsProgressBarFill,
                { width: `${stepsGoalEvaluation.progressPercent}%` },
              ]}
            />
          </View>

          <Text style={styles.stepsNextText}>{nextStepsText}</Text>
        </View>

        <View style={styles.workoutBlock}>
          <Text style={styles.sectionLabel}>{workoutNameLabel}</Text>

          <TextInput
            style={styles.input}
            placeholder={workoutNamePlaceholder}
            placeholderTextColor={colors.mutedText}
            value={workoutName}
            onChangeText={setWorkoutName}
          />

          <Text style={styles.activityCaloriesHint}>{workoutNameHint}</Text>

          <TextInput
            style={styles.input}
            placeholder={t.workoutCaloriesPlaceholder}
            placeholderTextColor={colors.mutedText}
            keyboardType="number-pad"
            value={workoutCalories}
            onChangeText={setWorkoutCalories}
          />

          <Text style={styles.activityCaloriesHint}>{workoutCaloriesHint}</Text>
        </View>

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setStepsDone(!stepsDone)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, stepsDone && styles.checkboxChecked]}>
            {stepsDone && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkText}>{stepsDoneLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setWorkoutDone(!workoutDone)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, workoutDone && styles.checkboxChecked]}>
            {workoutDone && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkText}>{t.workoutDone}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.gratitude}</Text>

        <TextInput
          style={[styles.input, styles.bigInput]}
          placeholder={t.gratitudePlaceholder}
          placeholderTextColor={colors.mutedText}
          multiline
          value={gratitude}
          onChangeText={setGratitude}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.reading}</Text>

        <Text style={styles.timerDisplay}>{formatTimer(timerSeconds)}</Text>

        <View style={styles.timerControls}>
          <TouchableOpacity
            style={styles.timerButton}
            activeOpacity={0.8}
            onPress={() => {
              if (timerSeconds === 0) {
                resetReadingTimer();
                return;
              }

              setIsTimerRunning(!isTimerRunning);
            }}
          >
            <Text style={styles.timerButtonText}>
              {timerSeconds === 0
                ? t.restart
                : isTimerRunning
                  ? t.pause
                  : t.start15Minutes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetButton}
            activeOpacity={0.8}
            onPress={resetReadingTimer}
          >
            <Text style={styles.resetButtonText}>{t.reset}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setReadingDone(!readingDone)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, readingDone && styles.checkboxChecked]}>
            {readingDone && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkText}>{t.readingDone}</Text>
        </TouchableOpacity>
      </View>

      {savedMessage ? (
        <Text style={styles.savedMessage}>{savedMessage}</Text>
      ) : null}

      <TouchableOpacity
        style={styles.saveButton}
        activeOpacity={0.85}
        onPress={saveTodayEntry}
      >
        <Text style={styles.saveButtonText}>{t.saveDay}</Text>
      </TouchableOpacity>
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
    marginBottom: 22,
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
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryHeaderRow: {
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.deepBrown,
  },
  summaryHint: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
    marginTop: 4,
  },
  summaryInput: {
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
  calorieStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  calorieStatBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calorieStatLabel: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 6,
  },
  calorieStatValue: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.deepBrown,
  },
  calorieStatUnit: {
    fontSize: 13,
    color: colors.mutedText,
    marginTop: 2,
  },
  burnBreakdownBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  burnBreakdownTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 10,
  },
  burnBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  burnBreakdownLabel: {
    fontSize: 14,
    color: colors.mutedText,
    flex: 1,
  },
  burnBreakdownValue: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.hunterGreen,
  },
  balanceBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  balanceBoxGood: {
    borderColor: colors.sageGreen,
  },
  balanceBoxWarning: {
    borderColor: colors.caramel,
  },
  balanceBoxBad: {
    borderColor: colors.softRed,
  },
  balanceBoxLabel: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 6,
  },
  balanceBoxValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 4,
  },
  balanceBoxSubtitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.mutedText,
    lineHeight: 19,
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
  summaryFormula: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
    marginTop: 4,
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
  editGoalButton: {
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editGoalButtonText: {
    color: colors.hunterGreen,
    fontSize: 14,
    fontWeight: '800',
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
  sectionLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 8,
    marginLeft: 4,
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
  bigInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  financeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  financeSummary: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
  },
  financeSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  financeLabel: {
    fontSize: 16,
    color: colors.mutedText,
  },
  financeIncome: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.oliveGreen,
  },
  financeExpense: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.deepBrown,
  },
  financeDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  financeBalanceLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.deepBrown,
  },
  financeBalance: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.hunterGreen,
  },
  financeBalanceNegative: {
    color: colors.caramel,
  },
  financeEditBlock: {
    marginTop: 16,
  },
  financeSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.deepBrown,
    marginTop: 8,
    marginBottom: 10,
  },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  moneyLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.deepBrown,
  },
  moneyInput: {
    width: 120,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.deepBrown,
    textAlign: 'right',
  },
  activityCaloriesHint: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
    marginTop: -6,
    marginBottom: 14,
    marginLeft: 4,
  },
  workoutBlock: {
    marginTop: 2,
    marginBottom: 4,
  },
  stepsProgressBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  stepsProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  stepsProgressTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 3,
  },
  stepsProgressSubtitle: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 19,
  },
  stepsProgressPercent: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.hunterGreen,
  },
  stepsProgressLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.hunterGreen,
    marginBottom: 8,
  },
  stepsProgressBarBackground: {
    height: 10,
    backgroundColor: colors.surface,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  stepsProgressBarFill: {
    height: '100%',
    backgroundColor: colors.hunterGreen,
    borderRadius: 999,
  },
  stepsNextText: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
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
  checkText: {
    fontSize: 16,
    color: colors.deepBrown,
    flex: 1,
  },
  timerDisplay: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.hunterGreen,
    textAlign: 'center',
    marginBottom: 14,
  },
  timerControls: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  timerButton: {
    flex: 1,
    backgroundColor: colors.sand,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  timerButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.deepBrown,
  },
  resetButton: {
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  savedMessage: {
    textAlign: 'center',
    color: colors.oliveGreen,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: colors.hunterGreen,
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '800',
  },
});