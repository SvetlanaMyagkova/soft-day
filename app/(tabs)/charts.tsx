import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Line as SvgLine, Text as SvgText } from 'react-native-svg';

import {
  AppLanguage,
  LANGUAGE_STORAGE_KEY,
  getAutomaticLanguage,
} from '../../constants/i18n';

const colors = {
  background: '#F5F0E6',
  surface: '#FFF9EF',
  hunterGreen: '#123524',
  sageGreen: '#87906A',
  oliveGreen: '#556B2F',
  deepBrown: '#4A2E1F',
  mutedText: '#7A6A58',
  border: '#E3D6C3',
  caramel: '#B9783F',
  softRed: '#B85C4B',
};

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

type WeightGoalSettings = {
  mode: 'loss' | 'maintenance' | 'gain';
  targetMin: string;
  targetMax: string;
};

type CalorieCalculationSettings = {
  baseMetabolismCalories: string;
};

type PeriodSummary = {
  daysTotal: number;
  daysWithCalories: number;
  deficitDays: number;
  averageBalance: number;
  averageSteps: number;
  workoutDays: number;
};

const texts = {
  ru: {
    title: 'Графики',
    subtitle: 'Динамика веса, шагов, калорий, финансов и привычек по сохранённым дням.',

    noDataTitle: 'Пока нет данных',
    noDataText: 'Сохрани хотя бы один день на экране “Сегодня”.',

    summary: 'Сводка',
    last7Days: 'За 7 дней',
    last30Days: 'За 30 дней',
    year: 'За год',

    byMonths: 'По месяцам',
    noMonthlyData: 'Пока нет данных по месяцам.',

    daysWithCalories: 'Дней с калориями',
    deficitDays: 'Дней в дефиците',
    averageBalance: 'Средний баланс',
    averageSteps: 'Средние шаги',
    workouts: 'Тренировок',

    weight: 'Вес',
    noWeightData: 'Пока нет сохранённых значений веса.',

    steps: 'Шаги',
    noStepsData: 'Пока нет сохранённых значений шагов.',

    caloriesAndDeficit: 'Калории и дефицит',
    today: 'Сегодня',
    average: 'В среднем',

    averageEaten: 'Среднее съела',
    averageBurned: 'Среднее потратила',
    formulaPrefix: 'Расход =',
    formulaSuffix: 'ккал базово + шаги и тренировки сверху',

    eatenLegend: 'Съела',
    burnedLegend: 'Потратила',
    calorieBalanceByDays: 'Баланс калорий по дням',
    deficitExplanation: 'Ниже линии 0 — дефицит. Выше линии 0 — профицит.',
    noCaloriesData: 'Пока нет сохранённых значений калорий.',

    finances: 'Финансы',
    totalIncome: 'Всего доходов',
    totalExpenses: 'Всего расходов',
    finalBalance: 'Итоговый баланс',
    incomeByDays: 'Доходы по дням',
    expensesByDays: 'Расходы по дням',
    balanceByDays: 'Баланс по дням',
    noFinanceData: 'Пока нет сохранённых финансовых данных.',

    habits: 'Привычки',
    foodTracked: 'Еду записывала',
    caloriesTracked: 'КБЖУ считала',
    tenKSteps: 'Шаги внесены',
    reading: 'Чтение',

    kcal: 'ккал',
    goal: 'Цель',
    weightLoss: 'похудение',
    maintenance: 'поддержание',
    weightGain: 'набор',
    deficit: 'дефицит',
    corridor: 'коридор',
    surplus: 'профицит',

    excellentInGoal: 'отлично, в цели 🌿',
    softDeficitGood: 'мягкий дефицит, уже хорошо',
    strongDeficitCareful: 'дефицит сильный, береги себя',
    outsideGoalNoDrama: 'сегодня вне цели, ничего страшного',
    evenDayNoDeficit: 'ровный день, но не дефицит',
    perfectForMaintenance: 'идеально для поддержания 🌿',
    wentIntoDeficitOk: 'ушла в дефицит, но это окей',
    wentIntoSurplusNoted: 'ушла в профицит, просто отметили',
    softSurplus: 'мягкий профицит',
    surplusAboveGoal: 'профицит выше цели',
    notInGoalTodayOk: 'сегодня не в цели, окей',
    evenDayNoSurplus: 'ровный день, но не профицит',
  },

  en: {
    title: 'Charts',
    subtitle: 'Weight, steps, calories, finance, and habit trends based on saved days.',

    noDataTitle: 'No data yet',
    noDataText: 'Save at least one day on the Today screen.',

    summary: 'Summary',
    last7Days: 'Last 7 days',
    last30Days: 'Last 30 days',
    year: 'This year',

    byMonths: 'By month',
    noMonthlyData: 'No monthly data yet.',

    daysWithCalories: 'Days with calories',
    deficitDays: 'Deficit days',
    averageBalance: 'Average balance',
    averageSteps: 'Average steps',
    workouts: 'Workouts',

    weight: 'Weight',
    noWeightData: 'No saved weight values yet.',

    steps: 'Steps',
    noStepsData: 'No saved step values yet.',

    caloriesAndDeficit: 'Calories and deficit',
    today: 'Today',
    average: 'Average',

    averageEaten: 'Average eaten',
    averageBurned: 'Average burned',
    formulaPrefix: 'Burn =',
    formulaSuffix: 'kcal base burn + steps and workouts on top',

    eatenLegend: 'Eaten',
    burnedLegend: 'Burned',
    calorieBalanceByDays: 'Calorie balance by day',
    deficitExplanation: 'Below the 0 line means deficit. Above the 0 line means surplus.',
    noCaloriesData: 'No saved calorie values yet.',

    finances: 'Finance',
    totalIncome: 'Total income',
    totalExpenses: 'Total expenses',
    finalBalance: 'Final balance',
    incomeByDays: 'Income by day',
    expensesByDays: 'Expenses by day',
    balanceByDays: 'Balance by day',
    noFinanceData: 'No saved finance data yet.',

    habits: 'Habits',
    foodTracked: 'Food logged',
    caloriesTracked: 'Nutrition counted',
    tenKSteps: 'Steps logged',
    reading: 'Reading',

    kcal: 'kcal',
    goal: 'Goal',
    weightLoss: 'weight loss',
    maintenance: 'maintenance',
    weightGain: 'weight gain',
    deficit: 'deficit',
    corridor: 'corridor',
    surplus: 'surplus',

    excellentInGoal: 'great, within your goal 🌿',
    softDeficitGood: 'a soft deficit, already good',
    strongDeficitCareful: 'the deficit is strong, take care of yourself',
    outsideGoalNoDrama: 'outside today’s goal, no drama',
    evenDayNoDeficit: 'an even day, but not a deficit',
    perfectForMaintenance: 'perfect for maintenance 🌿',
    wentIntoDeficitOk: 'you went into deficit, and that is okay',
    wentIntoSurplusNoted: 'you went into surplus, just noted',
    softSurplus: 'a soft surplus',
    surplusAboveGoal: 'surplus is above the goal',
    notInGoalTodayOk: 'not in goal today, that is okay',
    evenDayNoSurplus: 'an even day, but not a surplus',
  },
};

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 76;
const balanceChartHeight = 220;

const normalizeNumber = (value: string | undefined) => {
  if (!value) {
    return 0;
  }

  const number = Number(value.replace(',', '.'));

  return Number.isFinite(number) ? number : 0;
};

const formatShortDate = (date: string, language: AppLanguage) => {
  return new Date(date).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'numeric',
  });
};

const formatMonthTitle = (date: Date, language: AppLanguage) => {
  return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'long',
  });
};

const sumMoneyValues = (values: Array<string | undefined>) => {
  return values.reduce((sum, value) => sum + normalizeNumber(value), 0);
};

const formatMoney = (value: number, language: AppLanguage) => {
  return `${Math.round(value).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')} ₽`;
};

const formatCaloriesSigned = (
  value: number,
  t: typeof texts.ru | typeof texts.en
) => {
  if (value > 0) {
    return `+${Math.round(value)} ${t.kcal}`;
  }

  if (value < 0) {
    return `${Math.round(value)} ${t.kcal}`;
  }

  return `0 ${t.kcal}`;
};

const getTotalIncome = (day: DayEntry) => {
  const categorizedIncome = sumMoneyValues([
    day.incomeSalary,
    day.incomeStudio,
    day.incomeExtra,
    day.incomeCashback,
  ]);

  return categorizedIncome || normalizeNumber(day.income);
};

const getTotalExpenses = (day: DayEntry) => {
  const categorizedExpenses = sumMoneyValues([
    day.expenseGroceries,
    day.expenseCafe,
    day.expenseHome,
    day.expenseBeauty,
    day.expenseClothes,
    day.expenseHealth,
    day.expenseTransport,
    day.expenseEntertainment,
    day.expensePet,
    day.expenseGifts,
    day.expenseEducation,
    day.expenseSubscriptions,
    day.expenseUsa,
    day.expenseStudio,
    day.expenseOther,
  ]);

  return categorizedExpenses || normalizeNumber(day.expenses);
};

const getBurnedCalories = (day: DayEntry, baseCalories: number) => {
  const steps = normalizeNumber(day.steps);
  const workoutCalories = normalizeNumber(day.workoutCalories);
  const stepsCalories = steps * CALORIES_PER_STEP;

  return Math.round(baseCalories + stepsCalories + workoutCalories);
};

const getCalorieBalance = (day: DayEntry, baseCalories: number) => {
  const consumed = normalizeNumber(day.calories);
  const burned = getBurnedCalories(day, baseCalories);

  return Math.round(consumed - burned);
};

const getGoalText = (
  settings: WeightGoalSettings,
  t: typeof texts.ru | typeof texts.en
) => {
  if (settings.mode === 'loss') {
    return `${t.goal}: ${t.weightLoss} · ${t.deficit} ${settings.targetMin}–${settings.targetMax} ${t.kcal}`;
  }

  if (settings.mode === 'maintenance') {
    return `${t.goal}: ${t.maintenance} · ${t.corridor} ±${settings.targetMax} ${t.kcal}`;
  }

  return `${t.goal}: ${t.weightGain} · ${t.surplus} ${settings.targetMin}–${settings.targetMax} ${t.kcal}`;
};

const getGoalEvaluation = (
  balance: number,
  settings: WeightGoalSettings,
  t: typeof texts.ru | typeof texts.en
) => {
  const targetMin = Math.abs(normalizeNumber(settings.targetMin));
  const targetMax = Math.abs(normalizeNumber(settings.targetMax));
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

const getPeriodSummary = (
  days: DayEntry[],
  baseCalories: number
): PeriodSummary => {
  const daysWithCalories = days.filter((day) => day.calories);
  const daysWithSteps = days.filter((day) => day.steps);

  const balances = daysWithCalories.map((day) =>
    getCalorieBalance(day, baseCalories)
  );
  const stepsValues = daysWithSteps.map((day) => normalizeNumber(day.steps));

  const averageBalance =
    balances.length > 0
      ? Math.round(balances.reduce((sum, value) => sum + value, 0) / balances.length)
      : 0;

  const averageSteps =
    stepsValues.length > 0
      ? Math.round(stepsValues.reduce((sum, value) => sum + value, 0) / stepsValues.length)
      : 0;

  return {
    daysTotal: days.length,
    daysWithCalories: daysWithCalories.length,
    deficitDays: balances.filter((value) => value < 0).length,
    averageBalance,
    averageSteps,
    workoutDays: days.filter((day) => day.workoutDone).length,
  };
};

const getLastDays = (history: DayEntry[], daysCount: number) => {
  const today = new Date();
  const start = new Date(today);

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysCount + 1);

  return history.filter((day) => {
    const dayDate = new Date(day.date);
    return dayDate >= start && dayDate <= today;
  });
};

const getCurrentYearDays = (history: DayEntry[]) => {
  const currentYear = new Date().getFullYear();

  return history.filter((day) => {
    return new Date(day.date).getFullYear() === currentYear;
  });
};

const getMonthlyGroups = (history: DayEntry[]) => {
  const currentYearDays = getCurrentYearDays(history);
  const groups: Record<string, DayEntry[]> = {};

  currentYearDays.forEach((day) => {
    const date = new Date(day.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }

    groups[monthKey].push(day);
  });

  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
};

const chartConfig = {
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.surface,
  decimalPlaces: 1,
  color: () => colors.hunterGreen,
  labelColor: () => colors.mutedText,
  propsForDots: {
    r: '5',
    strokeWidth: '2',
    stroke: colors.hunterGreen,
  },
  propsForBackgroundLines: {
    stroke: colors.border,
  },
};

const integerChartConfig = {
  ...chartConfig,
  decimalPlaces: 0,
};

export default function ChartsScreen() {
  const [language, setLanguage] = useState<AppLanguage>(getAutomaticLanguage());
  const t = texts[language];

  const [history, setHistory] = useState<DayEntry[]>([]);
  const [weightGoalSettings, setWeightGoalSettings] = useState<WeightGoalSettings>({
    mode: 'loss',
    targetMin: '300',
    targetMax: '500',
  });
  const [baseMetabolismCalories, setBaseMetabolismCalories] = useState(
    String(DEFAULT_BASE_METABOLISM_CALORIES)
  );

  const baseCalories =
    normalizeNumber(baseMetabolismCalories || '0') || DEFAULT_BASE_METABOLISM_CALORIES;

  useFocusEffect(
    useCallback(() => {
      loadLanguage();
      loadHistory();
      loadWeightGoalSettings();
      loadCalorieCalculationSettings();
    }, [])
  );

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

      if (savedLanguage === 'ru' || savedLanguage === 'en') {
        setLanguage(savedLanguage);
        return;
      }

      setLanguage(getAutomaticLanguage());
    } catch (error) {
      setLanguage(getAutomaticLanguage());
    }
  };

  const loadHistory = async () => {
    const historyRaw = await AsyncStorage.getItem('soft-day-history');
    const parsedHistory: DayEntry[] = historyRaw ? JSON.parse(historyRaw) : [];

    setHistory(parsedHistory);
  };

  const loadWeightGoalSettings = async () => {
    const settingsRaw = await AsyncStorage.getItem('soft-day-weight-goal-settings');

    if (!settingsRaw) {
      return;
    }

    const settings: WeightGoalSettings = JSON.parse(settingsRaw);

    setWeightGoalSettings({
      mode: settings.mode || 'loss',
      targetMin: settings.targetMin || '300',
      targetMax: settings.targetMax || '500',
    });
  };

  const loadCalorieCalculationSettings = async () => {
    const settingsRaw = await AsyncStorage.getItem(
      'soft-day-calorie-calculation-settings'
    );

    if (!settingsRaw) {
      return;
    }

    const settings: CalorieCalculationSettings = JSON.parse(settingsRaw);

    setBaseMetabolismCalories(settings.baseMetabolismCalories || '1400');
  };

  const sortedHistory = [...history].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const weekDays = getLastDays(sortedHistory, 7);
  const monthDays = getLastDays(sortedHistory, 30);
  const yearDays = getCurrentYearDays(sortedHistory);

  const weekSummary = getPeriodSummary(weekDays, baseCalories);
  const monthSummary = getPeriodSummary(monthDays, baseCalories);
  const yearSummary = getPeriodSummary(yearDays, baseCalories);
  const monthlyGroups = getMonthlyGroups(sortedHistory);

  const weightHistory = sortedHistory.filter((day) => day.weight);
  const stepsHistory = sortedHistory.filter((day) => day.steps);
  const caloriesHistory = sortedHistory.filter((day) => day.calories);
  const financeHistory = sortedHistory.filter((day) => {
    return getTotalIncome(day) > 0 || getTotalExpenses(day) > 0;
  });

  const weightLabels = weightHistory.map((day) => formatShortDate(day.date, language));
  const weightData = weightHistory.map((day) =>
    Number(day.weight.replace(',', '.'))
  );

  const stepsLabels = stepsHistory.map((day) => formatShortDate(day.date, language));
  const stepsData = stepsHistory.map((day) => Number(day.steps));

  const caloriesLabels = caloriesHistory.map((day) =>
    formatShortDate(day.date, language)
  );
  const consumedCaloriesData = caloriesHistory.map((day) => Number(day.calories));
  const burnedCaloriesData = caloriesHistory.map((day) =>
    getBurnedCalories(day, baseCalories)
  );

  const calorieBalanceData = caloriesHistory.map((day) =>
    getCalorieBalance(day, baseCalories)
  );

  const averageConsumedCalories =
    consumedCaloriesData.length > 0
      ? Math.round(
          consumedCaloriesData.reduce((sum, value) => sum + value, 0) /
            consumedCaloriesData.length
        )
      : 0;

  const averageBurnedCalories =
    burnedCaloriesData.length > 0
      ? Math.round(
          burnedCaloriesData.reduce((sum, value) => sum + value, 0) /
            burnedCaloriesData.length
        )
      : 0;

  const averageCalorieBalance =
    calorieBalanceData.length > 0
      ? Math.round(
          calorieBalanceData.reduce((sum, value) => sum + value, 0) /
            calorieBalanceData.length
        )
      : 0;

  const deficitDays = calorieBalanceData.filter((value) => value < 0).length;

  const latestCalorieBalance =
    calorieBalanceData.length > 0
      ? calorieBalanceData[calorieBalanceData.length - 1]
      : 0;

  const latestGoalEvaluation = getGoalEvaluation(
    latestCalorieBalance,
    weightGoalSettings,
    t
  );

  const averageGoalEvaluation = getGoalEvaluation(
    averageCalorieBalance,
    weightGoalSettings,
    t
  );

  const financeLabels = financeHistory.map((day) => formatShortDate(day.date, language));
  const incomeData = financeHistory.map((day) => getTotalIncome(day));
  const expensesData = financeHistory.map((day) => getTotalExpenses(day));
  const balanceData = financeHistory.map(
    (day) => getTotalIncome(day) - getTotalExpenses(day)
  );

  const totalIncome = sortedHistory.reduce(
    (sum, day) => sum + getTotalIncome(day),
    0
  );

  const totalExpenses = sortedHistory.reduce(
    (sum, day) => sum + getTotalExpenses(day),
    0
  );

  const totalBalance = totalIncome - totalExpenses;

  const totalDays = history.length;
  const foodTrackedDays = history.filter((day) => day.foodTracked).length;
  const caloriesTrackedDays = history.filter((day) => day.caloriesTracked).length;
  const stepsDoneDays = history.filter((day) => day.stepsDone).length;
  const workoutDays = history.filter((day) => day.workoutDone).length;
  const readingDays = history.filter((day) => day.readingDone).length;

  const renderZeroLine = () => {
    if (calorieBalanceData.length === 0) {
      return null;
    }

    const minValue = Math.min(...calorieBalanceData);
    const maxValue = Math.max(...calorieBalanceData);

    if (minValue === maxValue) {
      return null;
    }

    if (!(minValue < 0 && maxValue > 0)) {
      return null;
    }

    const topPadding = 35;
    const bottomPadding = 32;
    const leftPadding = 92;
    const rightPadding = 20;
    const innerHeight = balanceChartHeight - topPadding - bottomPadding;

    const zeroY =
      topPadding + (maxValue / (maxValue - minValue)) * innerHeight;

    return (
      <>
        <SvgLine
          x1={leftPadding}
          x2={chartWidth - rightPadding}
          y1={zeroY}
          y2={zeroY}
          stroke={colors.caramel}
          strokeWidth="2"
          strokeDasharray="6,4"
        />

        <SvgText
          x={chartWidth - 70}
          y={zeroY - 8}
          fill={colors.caramel}
          fontSize="12"
          fontWeight="700"
        >
          0 {t.kcal}
        </SvgText>
      </>
    );
  };

  const renderSummaryCard = (title: string, summary: PeriodSummary) => {
    return (
      <View style={styles.summaryMiniCard}>
        <Text style={styles.summaryMiniTitle}>{title}</Text>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{t.daysWithCalories}</Text>
          <Text style={styles.statValue}>
            {summary.daysWithCalories}/{summary.daysTotal}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{t.deficitDays}</Text>
          <Text style={styles.statValue}>
            {summary.deficitDays}/{summary.daysWithCalories}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{t.averageBalance}</Text>
          <Text
            style={[
              styles.balanceValue,
              summary.averageBalance > 0 && styles.balanceValueNegative,
            ]}
          >
            {formatCaloriesSigned(summary.averageBalance, t)}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{t.averageSteps}</Text>
          <Text style={styles.statValue}>
            {summary.averageSteps
              ? summary.averageSteps.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')
              : '—'}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>{t.workouts}</Text>
          <Text style={styles.statValue}>{summary.workoutDays}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      {history.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.noDataTitle}</Text>
          <Text style={styles.cardText}>{t.noDataText}</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.summary}</Text>

            {renderSummaryCard(t.last7Days, weekSummary)}
            {renderSummaryCard(t.last30Days, monthSummary)}
            {renderSummaryCard(t.year, yearSummary)}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.byMonths}</Text>

            {monthlyGroups.length > 0 ? (
              monthlyGroups.map(([monthKey, monthItems]) => {
                const firstDate = new Date(`${monthKey}-01`);
                const summary = getPeriodSummary(monthItems, baseCalories);

                return (
                  <View key={monthKey} style={styles.monthRow}>
                    <Text style={styles.monthTitle}>
                      {formatMonthTitle(firstDate, language)}
                    </Text>

                    <View style={styles.monthStats}>
                      <Text style={styles.monthText}>
                        {t.daysWithCalories}: {summary.daysWithCalories}/{summary.daysTotal}
                      </Text>
                      <Text style={styles.monthText}>
                        {t.deficitDays}: {summary.deficitDays}/{summary.daysWithCalories}
                      </Text>
                      <Text style={styles.monthText}>
                        {t.averageBalance}: {formatCaloriesSigned(summary.averageBalance, t)}
                      </Text>
                      <Text style={styles.monthText}>
                        {t.steps}: {summary.averageSteps
                          ? summary.averageSteps.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')
                          : '—'}
                      </Text>
                      <Text style={styles.monthText}>
                        {t.workouts}: {summary.workoutDays}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.cardText}>{t.noMonthlyData}</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.weight}</Text>

            {weightData.length > 0 ? (
              <LineChart
                data={{
                  labels: weightLabels,
                  datasets: [
                    {
                      data: weightData,
                    },
                  ],
                }}
                width={chartWidth}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            ) : (
              <Text style={styles.cardText}>{t.noWeightData}</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.steps}</Text>

            {stepsData.length > 0 ? (
              <LineChart
                data={{
                  labels: stepsLabels,
                  datasets: [
                    {
                      data: stepsData,
                    },
                  ],
                }}
                width={chartWidth}
                height={220}
                chartConfig={integerChartConfig}
                bezier
                style={styles.chart}
              />
            ) : (
              <Text style={styles.cardText}>{t.noStepsData}</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.caloriesAndDeficit}</Text>

            <Text style={styles.goalHint}>{getGoalText(weightGoalSettings, t)}</Text>

            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{t.today}</Text>
                <View style={styles.statusTextBlock}>
                  <Text
                    style={[
                      styles.statusValue,
                      latestGoalEvaluation.tone === 'good' && styles.statusGood,
                      latestGoalEvaluation.tone === 'warning' && styles.statusWarning,
                      latestGoalEvaluation.tone === 'bad' && styles.statusBad,
                    ]}
                  >
                    {latestGoalEvaluation.title}
                  </Text>
                  <Text style={styles.statusSubtitle}>
                    {latestGoalEvaluation.subtitle}
                  </Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{t.average}</Text>
                <View style={styles.statusTextBlock}>
                  <Text
                    style={[
                      styles.statusValue,
                      averageGoalEvaluation.tone === 'good' && styles.statusGood,
                      averageGoalEvaluation.tone === 'warning' && styles.statusWarning,
                      averageGoalEvaluation.tone === 'bad' && styles.statusBad,
                    ]}
                  >
                    {averageGoalEvaluation.title}
                  </Text>
                  <Text style={styles.statusSubtitle}>
                    {averageGoalEvaluation.subtitle}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.financeSummary}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t.averageEaten}</Text>
                <Text style={styles.statValue}>
                  {averageConsumedCalories ? `${averageConsumedCalories} ${t.kcal}` : '—'}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t.averageBurned}</Text>
                <Text style={styles.statValue}>
                  {averageBurnedCalories ? `${averageBurnedCalories} ${t.kcal}` : '—'}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t.averageBalance}</Text>
                <Text
                  style={[
                    styles.balanceValue,
                    averageCalorieBalance > 0 && styles.balanceValueNegative,
                  ]}
                >
                  {formatCaloriesSigned(averageCalorieBalance, t)}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t.deficitDays}</Text>
                <Text style={styles.statValue}>
                  {deficitDays}/{caloriesHistory.length}
                </Text>
              </View>

              <Text style={styles.formulaText}>
                {t.formulaPrefix} {baseCalories} {t.formulaSuffix}
              </Text>
            </View>

            {consumedCaloriesData.length > 0 ? (
              <>
                <LineChart
                  data={{
                    labels: caloriesLabels,
                    legend: [t.eatenLegend, t.burnedLegend],
                    datasets: [
                      {
                        data: consumedCaloriesData,
                        color: () => colors.caramel,
                        strokeWidth: 2,
                      },
                      {
                        data: burnedCaloriesData,
                        color: () => colors.oliveGreen,
                        strokeWidth: 2,
                      },
                    ],
                  }}
                  width={chartWidth}
                  height={240}
                  chartConfig={integerChartConfig}
                  bezier
                  style={styles.chart}
                />

                <Text style={styles.chartSubtitle}>{t.calorieBalanceByDays}</Text>
                <Text style={styles.cardText}>{t.deficitExplanation}</Text>

                <LineChart
                  data={{
                    labels: caloriesLabels,
                    datasets: [
                      {
                        data: calorieBalanceData,
                        color: () => colors.hunterGreen,
                        strokeWidth: 2,
                      },
                    ],
                  }}
                  width={chartWidth}
                  height={balanceChartHeight}
                  chartConfig={integerChartConfig}
                  bezier
                  style={styles.chart}
                  decorator={renderZeroLine}
                />
              </>
            ) : (
              <Text style={styles.cardText}>{t.noCaloriesData}</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.finances}</Text>

            <View style={styles.financeSummary}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t.totalIncome}</Text>
                <Text style={styles.incomeValue}>
                  {formatMoney(totalIncome, language)}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{t.totalExpenses}</Text>
                <Text style={styles.expenseValue}>
                  {formatMoney(totalExpenses, language)}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabelStrong}>{t.finalBalance}</Text>
                <Text
                  style={[
                    styles.balanceValue,
                    totalBalance < 0 && styles.balanceValueNegative,
                  ]}
                >
                  {totalBalance >= 0 ? '+' : ''}
                  {formatMoney(totalBalance, language)}
                </Text>
              </View>
            </View>

            {financeHistory.length > 0 ? (
              <>
                <Text style={styles.chartSubtitle}>{t.incomeByDays}</Text>
                <LineChart
                  data={{
                    labels: financeLabels,
                    datasets: [
                      {
                        data: incomeData,
                      },
                    ],
                  }}
                  width={chartWidth}
                  height={220}
                  chartConfig={integerChartConfig}
                  bezier
                  style={styles.chart}
                />

                <Text style={styles.chartSubtitle}>{t.expensesByDays}</Text>
                <LineChart
                  data={{
                    labels: financeLabels,
                    datasets: [
                      {
                        data: expensesData,
                      },
                    ],
                  }}
                  width={chartWidth}
                  height={220}
                  chartConfig={integerChartConfig}
                  bezier
                  style={styles.chart}
                />

                <Text style={styles.chartSubtitle}>{t.balanceByDays}</Text>
                <LineChart
                  data={{
                    labels: financeLabels,
                    datasets: [
                      {
                        data: balanceData,
                      },
                    ],
                  }}
                  width={chartWidth}
                  height={220}
                  chartConfig={integerChartConfig}
                  bezier
                  style={styles.chart}
                />
              </>
            ) : (
              <Text style={styles.cardText}>{t.noFinanceData}</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.habits}</Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{t.foodTracked}</Text>
              <Text style={styles.statValue}>
                {foodTrackedDays}/{totalDays}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{t.caloriesTracked}</Text>
              <Text style={styles.statValue}>
                {caloriesTrackedDays}/{totalDays}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{t.tenKSteps}</Text>
              <Text style={styles.statValue}>
                {stepsDoneDays}/{totalDays}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{t.workouts}</Text>
              <Text style={styles.statValue}>
                {workoutDays}/{totalDays}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{t.reading}</Text>
              <Text style={styles.statValue}>
                {readingDays}/{totalDays}
              </Text>
            </View>
          </View>
        </>
      )}
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
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.hunterGreen,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.mutedText,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.deepBrown,
    marginBottom: 14,
  },
  cardText: {
    fontSize: 16,
    color: colors.mutedText,
    lineHeight: 22,
    marginBottom: 8,
  },
  summaryMiniCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryMiniTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.hunterGreen,
    marginBottom: 8,
  },
  monthRow: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  monthStats: {
    gap: 4,
  },
  monthText: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 19,
  },
  goalHint: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.hunterGreen,
    marginBottom: 12,
  },
  chart: {
    borderRadius: 18,
    marginLeft: -10,
    marginBottom: 16,
  },
  chartSubtitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.deepBrown,
    marginTop: 10,
    marginBottom: 8,
  },
  statusCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 12,
  },
  statusLabel: {
    fontSize: 16,
    color: colors.mutedText,
  },
  statusTextBlock: {
    alignItems: 'flex-end',
    flex: 1,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.deepBrown,
    textAlign: 'right',
  },
  statusSubtitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.mutedText,
    marginTop: 2,
    textAlign: 'right',
  },
  statusGood: {
    color: colors.hunterGreen,
  },
  statusWarning: {
    color: colors.caramel,
  },
  statusBad: {
    color: colors.softRed,
  },
  financeSummary: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  statLabel: {
    fontSize: 16,
    color: colors.mutedText,
    flex: 1,
  },
  statLabelStrong: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.deepBrown,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.deepBrown,
  },
  incomeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.oliveGreen,
  },
  expenseValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.deepBrown,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.hunterGreen,
  },
  balanceValueNegative: {
    color: colors.caramel,
  },
  formulaText: {
    fontSize: 13,
    color: colors.mutedText,
    marginTop: 10,
    lineHeight: 18,
  },
});