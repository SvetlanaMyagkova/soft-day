import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  getNormalizedStepsGoal,
  getStepsStagesForGoal,
} from '../../constants/stepsGoal';
import {
  DEFAULT_USER_PROFILE,
  USER_PROFILE_STORAGE_KEY,
  UserProfileSettings,
  getSoftReminderTexts,
} from '../../constants/userProfile';

const colors = {
  background: '#F5F0E6',
  surface: '#FFF9EF',
  hunterGreen: '#123524',
  sageGreen: '#87906A',
  oliveGreen: '#556B2F',
  sand: '#C9A978',
  caramel: '#B9783F',
  deepBrown: '#4A2E1F',
  mutedText: '#7A6A58',
  border: '#E3D6C3',
  softRed: '#B85C4B',
};

Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }) as any,
});

type ReminderId = 'gratitude' | 'reading' | 'update' | 'summary';

type SoftReminder = {
  id: ReminderId;
  time: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
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

type SoftDayBackup = {
  app?: string;
  version?: number;
  exportedAt?: string;
  data?: {
    history?: unknown;
    nutritionGoals?: NutritionGoals | null;
    weightGoalSettings?: WeightGoalSettings | null;
    stepsGoalSettings?: StepsGoalSettings | null;
    calorieCalculationSettings?: CalorieCalculationSettings | null;
    reminders?: Record<ReminderId, string | null> | null;
    reminderTimes?: Record<ReminderId, string> | null;
    userProfile?: UserProfileSettings | null;
  };
};

const EMPTY_REMINDER_IDS: Record<ReminderId, string | null> = {
  gratitude: null,
  reading: null,
  update: null,
  summary: null,
};

const REMINDER_TIMES_STORAGE_KEY = 'soft-day-reminder-times';

const DEFAULT_REMINDER_TIMES: Record<ReminderId, string> = {
  gratitude: '08:00',
  reading: '11:00',
  update: '15:00',
  summary: '20:30',
};

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

const getTodayKey = () => {
  return `soft-day-${getTodayDate()}`;
};

const parseReminderTime = (time: string, fallbackTime: string) => {
  const sourceTime = /^\d{1,2}:\d{2}$/.test(time) ? time : fallbackTime;
  const [rawHour, rawMinute] = sourceTime.split(':');

  const parsedHour = Number(rawHour);
  const parsedMinute = Number(rawMinute);

  const hour = Number.isFinite(parsedHour)
    ? Math.min(23, Math.max(0, parsedHour))
    : 0;

  const minute = Number.isFinite(parsedMinute)
    ? Math.min(59, Math.max(0, parsedMinute))
    : 0;

  return {
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    hour,
    minute,
  };
};

const normalizeNumber = (value: string | undefined) => {
  if (!value) {
    return 0;
  }

  const number = Number(value.replace(',', '.').replace(/\s/g, ''));

  return Number.isFinite(number) ? number : 0;
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

const sumMoneyValues = (values: Array<string | undefined>) => {
  return values.reduce((sum, value) => sum + normalizeNumber(value), 0);
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
    day.expenseTravel || day.expenseUsa,
    day.expenseStudio,
    day.expenseOther,
    day.customExpenseAmount,
  ]);

  return categorizedExpenses || normalizeNumber(day.expenses);
};

const hasFoodLogged = (day: DayEntry) => {
  return Boolean(day.foodNote?.trim());
};

const hasCaloriesLogged = (day: DayEntry) => {
  return normalizeNumber(day.calories) > 0;
};

const hasStepsLogged = (day: DayEntry) => {
  return normalizeNumber(day.steps) > 0;
};

const hasWorkoutLogged = (day: DayEntry) => {
  return Boolean(
    day.workoutName?.trim() || normalizeNumber(day.workoutCalories) > 0
  );
};

const escapeCsvValue = (value: unknown) => {
  const text = String(value ?? '');
  const escapedText = text.replace(/"/g, '""');

  return `"${escapedText}"`;
};

const buildCsvFromHistory = (history: DayEntry[], language: AppLanguage) => {
  const headers =
    language === 'ru'
      ? [
          'Дата',
          'Вес',
          'Еда записана',
          'Калории считались',
          'Калории',
          'Описание еды',
          'Шаги',
          '10000 шагов',
          'Тренировка была',
          'Название тренировки',
          'Калории тренировки',
          'Доходы всего',
          'Расходы всего',
          'Баланс денег',
          'Доход ЗП',
          'Доход студия',
          'Доп. доход',
          'Возвраты / кэшбек',
          'Продукты',
          'Кафе / доставка',
          'Дом / быт',
          'Красота',
          'Одежда',
          'Здоровье',
          'Транспорт',
          'Развлечения',
          'Питомец',
          'Подарки',
          'Обучение',
          'Подписки',
          'Путешествия',
          'Студия расходы',
          'Другое',
          'Своя категория',
          'Сумма своей категории',
          'Благодарность',
          'Что хорошего сделала',
          'Что поддержало',
          'Чтение',
        ]
      : [
          'Date',
          'Weight',
          'Food logged',
          'Calories counted',
          'Calories',
          'Food note',
          'Steps',
          '10000 steps',
          'Workout done',
          'Workout name',
          'Workout calories',
          'Total income',
          'Total expenses',
          'Money balance',
          'Salary income',
          'Studio income',
          'Extra income',
          'Refunds / cashback',
          'Groceries',
          'Cafe / delivery',
          'Home / household',
          'Beauty',
          'Clothes',
          'Health',
          'Transport',
          'Entertainment',
          'Pet',
          'Gifts',
          'Education',
          'Subscriptions',
          'Travel',
          'Studio expenses',
          'Other',
          'Custom category',
          'Custom category amount',
          'Gratitude',
          'Something good I did',
          'What supported me',
          'Reading',
        ];

  const yes = language === 'ru' ? 'да' : 'yes';
  const no = language === 'ru' ? 'нет' : 'no';

  const sortedHistory = [...history].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const rows = sortedHistory.map((day) => {
    const totalIncome = getTotalIncome(day);
    const totalExpenses = getTotalExpenses(day);
    const moneyBalance = totalIncome - totalExpenses;

    return [
      day.date,
      day.weight,
      hasFoodLogged(day) ? yes : no,
      hasCaloriesLogged(day) ? yes : no,
      day.calories,
      day.foodNote,
      day.steps,
      hasStepsLogged(day) ? yes : no,
      hasWorkoutLogged(day) ? yes : no,
      day.workoutName || '',
      day.workoutCalories || '',
      totalIncome,
      totalExpenses,
      moneyBalance,
      day.incomeSalary || '',
      day.incomeStudio || '',
      day.incomeExtra || '',
      day.incomeCashback || '',
      day.expenseGroceries || '',
      day.expenseCafe || '',
      day.expenseHome || '',
      day.expenseBeauty || '',
      day.expenseClothes || '',
      day.expenseHealth || '',
      day.expenseTransport || '',
      day.expenseEntertainment || '',
      day.expensePet || '',
      day.expenseGifts || '',
      day.expenseEducation || '',
      day.expenseSubscriptions || '',
      day.expenseTravel || day.expenseUsa || '',
      day.expenseStudio || '',
      day.expenseOther || '',
      day.customExpenseName || '',
      day.customExpenseAmount || '',
      day.gratitude,
      day.gratitudeGoodDeed || '',
      day.gratitudeSupport || '',
      day.readingDone ? yes : no,
    ];
  });

  return [
    headers.map(escapeCsvValue).join(';'),
    ...rows.map((row) => row.map(escapeCsvValue).join(';')),
  ].join('\n');
};

const getSoftReminders = (
  language: AppLanguage,
  profile: UserProfileSettings,
  reminderTimes: Record<ReminderId, string>
): SoftReminder[] => {
  const reminderTexts = getSoftReminderTexts(language, profile);

  const gratitudeTime = parseReminderTime(
    reminderTimes.gratitude,
    DEFAULT_REMINDER_TIMES.gratitude
  );

  const readingTime = parseReminderTime(
    reminderTimes.reading,
    DEFAULT_REMINDER_TIMES.reading
  );

  const updateTime = parseReminderTime(
    reminderTimes.update,
    DEFAULT_REMINDER_TIMES.update
  );

  const summaryTime = parseReminderTime(
    reminderTimes.summary,
    DEFAULT_REMINDER_TIMES.summary
  );

  return [
    {
      id: 'gratitude',
      time: gratitudeTime.time,
      hour: gratitudeTime.hour,
      minute: gratitudeTime.minute,
      title: reminderTexts.gratitude.title,
      body: reminderTexts.gratitude.body,
    },
    {
      id: 'reading',
      time: readingTime.time,
      hour: readingTime.hour,
      minute: readingTime.minute,
      title: reminderTexts.reading.title,
      body: reminderTexts.reading.body,
    },
    {
      id: 'update',
      time: updateTime.time,
      hour: updateTime.hour,
      minute: updateTime.minute,
      title: reminderTexts.update.title,
      body: reminderTexts.update.body,
    },
    {
      id: 'summary',
      time: summaryTime.time,
      hour: summaryTime.hour,
      minute: summaryTime.minute,
      title: reminderTexts.summary.title,
      body: reminderTexts.summary.body,
    },
  ];
};

export default function SettingsScreen() {
  const router = useRouter();

  const [language, setLanguage] = useState<AppLanguage>(getAutomaticLanguage());
  const [languageMessage, setLanguageMessage] = useState('');

  const [userProfile, setUserProfile] =
    useState<UserProfileSettings>(DEFAULT_USER_PROFILE);

  const [reminderTimes, setReminderTimes] =
    useState<Record<ReminderId, string>>(DEFAULT_REMINDER_TIMES);

  const t = getTranslation(language);
  const softReminders = getSoftReminders(language, userProfile, reminderTimes);

  const accountTitle = language === 'ru' ? 'Аккаунт' : 'Account';
  const accountDescription =
    language === 'ru'
      ? 'Вход, профиль, приватность и управление данными.'
      : 'Sign-in, profile, privacy, and data management.';
  const openAccountText = language === 'ru' ? 'Открыть аккаунт' : 'Open account';

  const reminderTimeLabel = language === 'ru' ? 'Время' : 'Time';
  const invalidReminderTimeTitle =
    language === 'ru' ? 'Проверь время' : 'Check time';
  const invalidReminderTimeMessage =
    language === 'ru'
      ? 'Время нужно вводить в формате ЧЧ:ММ, например 09:30.'
      : 'Use HH:MM format, for example 09:30.';

  const importOpeningText = language === 'ru' ? 'Открываю файл…' : 'Opening file…';
  const pickerBusyText =
    language === 'ru'
      ? 'Окно выбора файла уже открывается. Закрой его и попробуй ещё раз.'
      : 'The file picker is already opening. Close it and try again.';

  const [caloriesGoal, setCaloriesGoal] = useState('1500');
  const [proteinGoal, setProteinGoal] = useState('90');
  const [nutritionMessage, setNutritionMessage] = useState('');

  const [weightGoalMode, setWeightGoalMode] =
    useState<'loss' | 'maintenance' | 'gain'>('loss');
  const [targetMin, setTargetMin] = useState('300');
  const [targetMax, setTargetMax] = useState('500');
  const [weightGoalMessage, setWeightGoalMessage] = useState('');

  const [stepsGoalSettings, setStepsGoalSettings] =
    useState<StepsGoalSettings>(DEFAULT_STEPS_GOAL_SETTINGS);
  const [stepsGoalMessage, setStepsGoalMessage] = useState('');

  const [baseMetabolismCalories, setBaseMetabolismCalories] = useState('1400');
  const [calculationMessage, setCalculationMessage] = useState('');

  const [dataMessage, setDataMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [reminderNotificationIds, setReminderNotificationIds] =
    useState<Record<ReminderId, string | null>>(EMPTY_REMINDER_IDS);

  const nutrition = calculateNutrition(caloriesGoal, proteinGoal);

  const weightGoalLabel =
    weightGoalMode === 'loss'
      ? `${t.weightGoalLoss} · ${t.deficitGoal} ${targetMin || 0}–${targetMax || 0} ${t.kcal}`
      : weightGoalMode === 'maintenance'
        ? `${t.weightGoalMaintenance} · ${t.maintenanceCorridor} ±${targetMax || 0} ${t.kcal}`
        : `${t.weightGoalGain} · ${t.surplusGoal} ${targetMin || 0}–${targetMax || 0} ${t.kcal}`;

  const normalizedDailyStepsGoal = getNormalizedStepsGoal(stepsGoalSettings);
  const stepsStages = getStepsStagesForGoal(normalizedDailyStepsGoal);

  const stepsGoalTitle = language === 'ru' ? 'Цель шагов' : 'Step goal';

  const stepsGoalDescription =
    language === 'ru'
      ? 'Задай свою цель на день. Ниже — ступени активности, по которым Soft Day будет мягко оценивать прогресс.'
      : 'Set your daily goal. Below are progress steps Soft Day will use to gently evaluate your movement.';

  const dailyStepsGoalLabel =
    language === 'ru'
      ? 'Сколько шагов хочешь проходить в день?'
      : 'How many steps do you want per day?';

  const activityStagesTitle =
    language === 'ru' ? 'Ступени активности 🌿' : 'Progress steps 🌿';

  const saveStepsGoalText =
    language === 'ru' ? 'Сохранить цель шагов' : 'Save step goal';

  const stepsGoalSavedText =
    language === 'ru' ? 'Цель шагов сохранена.' : 'Step goal saved.';

  const stepsGoalSaveError =
    language === 'ru'
      ? 'Не получилось сохранить цель шагов'
      : 'Could not save step goal';

  const baseBurnTitle = language === 'ru' ? 'Базовый расход' : 'Base burn';

  const baseBurnDescription =
    language === 'ru'
      ? 'Это примерное количество калорий, которое организм тратит за день в покое. Шаги и тренировки добавляются на экране «Сегодня».'
      : 'This is the estimated number of calories your body burns at rest during the day. Steps and workouts are added on the Today screen.';

  const baseBurnInputLabel =
    language === 'ru' ? 'Базовый метаболизм' : 'Base metabolism';

  const baseBurnNowText =
    language === 'ru'
      ? `${baseMetabolismCalories || 0} ${t.kcal} базово в день`
      : `${baseMetabolismCalories || 0} ${t.kcal} base burn per day`;

  const saveBaseBurnText =
    language === 'ru' ? 'Сохранить базовый расход' : 'Save base burn';

  const formatSteps = (value: number) => {
    return value.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US');
  };

  useFocusEffect(
    useCallback(() => {
      loadLanguage();
      loadUserProfile();
      loadNutritionGoals();
      loadWeightGoalSettings();
      loadStepsGoalSettings();
      loadCalorieCalculationSettings();
      loadReminderTimes();
      loadReminderSettings();
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
      Alert.alert(t.error, 'Could not load language');
    }
  };

  const saveLanguage = async (nextLanguage: AppLanguage) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);

      setLanguage(nextLanguage);
      setLanguageMessage(getTranslation(nextLanguage).languageSaved);

      setTimeout(() => setLanguageMessage(''), 2500);
    } catch (error) {
      Alert.alert(t.error, 'Could not save language');
    }
  };

  const loadUserProfile = async () => {
    try {
      const profileRaw = await AsyncStorage.getItem(USER_PROFILE_STORAGE_KEY);

      if (!profileRaw) {
        return;
      }

      const savedProfile: UserProfileSettings = JSON.parse(profileRaw);

      setUserProfile({
        displayName: savedProfile.displayName || '',
        gender: savedProfile.gender === 'male' ? 'male' : 'female',
      });
    } catch (error) {
      setUserProfile(DEFAULT_USER_PROFILE);
    }
  };

  const loadReminderTimes = async () => {
    try {
      const reminderTimesRaw = await AsyncStorage.getItem(
        REMINDER_TIMES_STORAGE_KEY
      );

      if (!reminderTimesRaw) {
        return;
      }

      const savedReminderTimes = JSON.parse(reminderTimesRaw);

      setReminderTimes({
        ...DEFAULT_REMINDER_TIMES,
        ...savedReminderTimes,
      });
    } catch (error) {
      setReminderTimes(DEFAULT_REMINDER_TIMES);
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

  const saveNutritionGoals = async () => {
    try {
      const goals: NutritionGoals = {
        caloriesGoal,
        proteinGoal,
      };

      await AsyncStorage.setItem('soft-day-nutrition-goals', JSON.stringify(goals));

      setNutritionMessage(t.nutritionSaved);
      setTimeout(() => setNutritionMessage(''), 2500);
    } catch (error) {
      Alert.alert(t.error, t.saveNutritionError);
    }
  };

  const loadWeightGoalSettings = async () => {
    try {
      const settingsRaw = await AsyncStorage.getItem('soft-day-weight-goal-settings');

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

  const saveWeightGoalSettings = async () => {
    try {
      const settings: WeightGoalSettings = {
        mode: weightGoalMode,
        targetMin,
        targetMax,
      };

      await AsyncStorage.setItem(
        'soft-day-weight-goal-settings',
        JSON.stringify(settings)
      );

      setWeightGoalMessage(t.goalSaved);
      setTimeout(() => setWeightGoalMessage(''), 2500);
    } catch (error) {
      Alert.alert(t.error, t.saveGoalError);
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

  const saveStepsGoalSettings = async () => {
    try {
      await AsyncStorage.setItem(
        STEPS_GOAL_STORAGE_KEY,
        JSON.stringify(stepsGoalSettings)
      );

      setStepsGoalMessage(stepsGoalSavedText);
      setTimeout(() => setStepsGoalMessage(''), 2500);
    } catch (error) {
      Alert.alert(
        t.error,
        error instanceof Error ? error.message : stepsGoalSaveError
      );
    }
  };

  const updateStepsGoalField = (value: string) => {
    setStepsGoalSettings({
      dailyGoal: value,
    });
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

  const saveCalorieCalculationSettings = async () => {
    try {
      const base = normalizeNumber(baseMetabolismCalories || '0');

      if (!base || base <= 0) {
        Alert.alert(t.checkValue, t.baseBurnMustBePositive);
        return;
      }

      const settings: CalorieCalculationSettings = {
        baseMetabolismCalories,
      };

      await AsyncStorage.setItem(
        'soft-day-calorie-calculation-settings',
        JSON.stringify(settings)
      );

      setCalculationMessage(t.calculationSaved);
      setTimeout(() => setCalculationMessage(''), 2500);
    } catch (error) {
      Alert.alert(t.error, t.saveCalculationError);
    }
  };

  const loadReminderSettings = async () => {
    try {
      const remindersRaw = await AsyncStorage.getItem('soft-day-reminders');

      if (!remindersRaw) {
        return;
      }

      const savedReminders = JSON.parse(remindersRaw);

      setReminderNotificationIds({
        ...EMPTY_REMINDER_IDS,
        ...savedReminders,
      });
    } catch (error) {
      Alert.alert(t.error, t.loadRemindersError);
    }
  };

  const saveReminderSettings = async (
    nextReminderIds: Record<ReminderId, string | null>
  ) => {
    await AsyncStorage.setItem('soft-day-reminders', JSON.stringify(nextReminderIds));
    setReminderNotificationIds(nextReminderIds);
  };

  const requestNotificationPermission = async () => {
    const permission = await Notifications.getPermissionsAsync();

    if (permission.status === 'granted') {
      return true;
    }

    const requestedPermission = await Notifications.requestPermissionsAsync();

    return requestedPermission.status === 'granted';
  };

  const scheduleDailyReminder = async (reminder: SoftReminder) => {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminder.hour,
        minute: reminder.minute,
      },
    });

    return notificationId;
  };

  const saveReminderTime = async (reminderId: ReminderId, nextTime: string) => {
    try {
      if (!/^\d{1,2}:\d{2}$/.test(nextTime)) {
        Alert.alert(invalidReminderTimeTitle, invalidReminderTimeMessage);
        return;
      }

      const normalizedTime = parseReminderTime(
        nextTime,
        DEFAULT_REMINDER_TIMES[reminderId]
      ).time;

      const nextReminderTimes = {
        ...reminderTimes,
        [reminderId]: normalizedTime,
      };

      await AsyncStorage.setItem(
        REMINDER_TIMES_STORAGE_KEY,
        JSON.stringify(nextReminderTimes)
      );

      setReminderTimes(nextReminderTimes);

      const currentNotificationId = reminderNotificationIds[reminderId];

      if (!currentNotificationId) {
        return;
      }

      await Notifications.cancelScheduledNotificationAsync(currentNotificationId);

      const updatedReminder = getSoftReminders(
        language,
        userProfile,
        nextReminderTimes
      ).find((reminder) => reminder.id === reminderId);

      if (!updatedReminder) {
        return;
      }

      const notificationId = await scheduleDailyReminder(updatedReminder);

      const nextReminderIds = {
        ...reminderNotificationIds,
        [reminderId]: notificationId,
      };

      await saveReminderSettings(nextReminderIds);
    } catch (error) {
      Alert.alert(
        t.error,
        error instanceof Error ? error.message : t.updateReminderError
      );
    }
  };

  const recreateReminderNotifications = async (
    importedReminders: Record<ReminderId, string | null> | null | undefined,
    importedReminderTimes?: Record<ReminderId, string> | null,
    importedUserProfile?: UserProfileSettings | null
  ) => {
    const nextReminderTimes = importedReminderTimes
      ? {
          ...DEFAULT_REMINDER_TIMES,
          ...importedReminderTimes,
        }
      : DEFAULT_REMINDER_TIMES;

      const nextUserProfile: UserProfileSettings = importedUserProfile
      ? {
          displayName: importedUserProfile.displayName || '',
          gender: importedUserProfile.gender === 'male' ? 'male' : 'female',
        }
      : DEFAULT_USER_PROFILE;

    const importedSoftReminders = getSoftReminders(
      language,
      nextUserProfile,
      nextReminderTimes
    );

    const enabledReminders = importedSoftReminders.filter((reminder) =>
      Boolean(importedReminders?.[reminder.id])
    );

    if (enabledReminders.length === 0) {
      await AsyncStorage.setItem(
        'soft-day-reminders',
        JSON.stringify(EMPTY_REMINDER_IDS)
      );
      setReminderNotificationIds(EMPTY_REMINDER_IDS);
      return EMPTY_REMINDER_IDS;
    }

    const hasPermission = await requestNotificationPermission();

    if (!hasPermission) {
      await AsyncStorage.setItem(
        'soft-day-reminders',
        JSON.stringify(EMPTY_REMINDER_IDS)
      );
      setReminderNotificationIds(EMPTY_REMINDER_IDS);

      Alert.alert(t.remindersNotEnabled, t.remindersPermissionNeeded);

      return EMPTY_REMINDER_IDS;
    }

    const nextReminderIds: Record<ReminderId, string | null> = {
      ...EMPTY_REMINDER_IDS,
    };

    for (const reminder of enabledReminders) {
      const notificationId = await scheduleDailyReminder(reminder);
      nextReminderIds[reminder.id] = notificationId;
    }

    await AsyncStorage.setItem('soft-day-reminders', JSON.stringify(nextReminderIds));
    setReminderNotificationIds(nextReminderIds);

    return nextReminderIds;
  };

  const toggleReminder = async (reminder: SoftReminder) => {
    try {
      const hasPermission = await requestNotificationPermission();

      if (!hasPermission) {
        Alert.alert(t.noPermission, t.allowNotifications);
        return;
      }

      const currentNotificationId = reminderNotificationIds[reminder.id];

      if (currentNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(currentNotificationId);

        const nextReminderIds = {
          ...reminderNotificationIds,
          [reminder.id]: null,
        };

        await saveReminderSettings(nextReminderIds);
        return;
      }

      const notificationId = await scheduleDailyReminder(reminder);

      const nextReminderIds = {
        ...reminderNotificationIds,
        [reminder.id]: notificationId,
      };

      await saveReminderSettings(nextReminderIds);
    } catch (error) {
      console.log('Reminder error:', error);

      Alert.alert(
        t.error,
        error instanceof Error ? error.message : t.updateReminderError
      );
    }
  };

  const exportData = async () => {
    try {
      const [
        historyRaw,
        nutritionGoalsRaw,
        weightGoalSettingsRaw,
        stepsGoalSettingsRaw,
        calorieCalculationSettingsRaw,
        remindersRaw,
        reminderTimesRaw,
        userProfileRaw,
      ] = await AsyncStorage.multiGet([
        'soft-day-history',
        'soft-day-nutrition-goals',
        'soft-day-weight-goal-settings',
        STEPS_GOAL_STORAGE_KEY,
        'soft-day-calorie-calculation-settings',
        'soft-day-reminders',
        REMINDER_TIMES_STORAGE_KEY,
        USER_PROFILE_STORAGE_KEY,
      ]);

      const exportPayload = {
        app: 'Soft Day',
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          history: historyRaw[1] ? JSON.parse(historyRaw[1]) : [],
          nutritionGoals: nutritionGoalsRaw[1]
            ? JSON.parse(nutritionGoalsRaw[1])
            : null,
          weightGoalSettings: weightGoalSettingsRaw[1]
            ? JSON.parse(weightGoalSettingsRaw[1])
            : null,
          stepsGoalSettings: stepsGoalSettingsRaw[1]
            ? JSON.parse(stepsGoalSettingsRaw[1])
            : null,
          calorieCalculationSettings: calorieCalculationSettingsRaw[1]
            ? JSON.parse(calorieCalculationSettingsRaw[1])
            : null,
          reminders: remindersRaw[1] ? JSON.parse(remindersRaw[1]) : null,
          reminderTimes: reminderTimesRaw[1]
            ? JSON.parse(reminderTimesRaw[1])
            : null,
          userProfile: userProfileRaw[1] ? JSON.parse(userProfileRaw[1]) : null,
        },
      };

      const fileName = `soft-day-backup-${new Date()
        .toISOString()
        .split('T')[0]}.json`;

      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(exportPayload, null, 2)
      );

      const isSharingAvailable = await Sharing.isAvailableAsync();

      if (!isSharingAvailable) {
        setDataMessage(`${t.fileSaved}: ${fileName}`);
        setTimeout(() => setDataMessage(''), 3500);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Soft Day JSON export',
        UTI: 'public.json',
      });

      setDataMessage(t.jsonExportReady);
      setTimeout(() => setDataMessage(''), 2500);
    } catch (error) {
      console.log('Export error:', error);

      Alert.alert(
        t.error,
        error instanceof Error ? error.message : t.exportDataError
      );
    }
  };

  const exportCsvData = async () => {
    try {
      const historyRaw = await AsyncStorage.getItem('soft-day-history');
      const history: DayEntry[] = historyRaw ? JSON.parse(historyRaw) : [];

      if (history.length === 0) {
        Alert.alert(t.noExportDataTitle, t.noExportDataMessage);
        return;
      }

      const csv = buildCsvFromHistory(history, language);

      const fileName = `soft-day-history-${new Date()
        .toISOString()
        .split('T')[0]}.csv`;

      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csv);

      const isSharingAvailable = await Sharing.isAvailableAsync();

      if (!isSharingAvailable) {
        setDataMessage(`${t.csvSaved}: ${fileName}`);
        setTimeout(() => setDataMessage(''), 3500);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Soft Day CSV export',
        UTI: 'public.comma-separated-values-text',
      });

      setDataMessage(t.csvExportReady);
      setTimeout(() => setDataMessage(''), 2500);
    } catch (error) {
      console.log('CSV export error:', error);

      Alert.alert(
        t.error,
        error instanceof Error ? error.message : t.exportCsvError
      );
    }
  };

  const clearToday = () => {
    Alert.alert(t.resetTodayTitle, t.resetTodayMessage, [
      {
        text: t.cancel,
        style: 'cancel',
      },
      {
        text: t.reset,
        style: 'destructive',
        onPress: async () => {
          try {
            const todayDate = getTodayDate();

            await AsyncStorage.removeItem(getTodayKey());

            const historyRaw = await AsyncStorage.getItem('soft-day-history');
            const history: DayEntry[] = historyRaw ? JSON.parse(historyRaw) : [];

            const updatedHistory = history.filter((item) => item.date !== todayDate);

            await AsyncStorage.setItem(
              'soft-day-history',
              JSON.stringify(updatedHistory)
            );

            setDataMessage(t.todayReset);
            setTimeout(() => setDataMessage(''), 3500);

            Alert.alert(t.done, t.todayResetDone);
          } catch (error) {
            Alert.alert(t.error, t.clearTodayError);
          }
        },
      },
    ]);
  };

  const clearHistory = () => {
    Alert.alert(t.clearHistoryTitle, t.clearHistoryMessage, [
      {
        text: t.cancel,
        style: 'cancel',
      },
      {
        text: t.clearHistory,
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('soft-day-history');

            setDataMessage(t.historyCleared);
            setTimeout(() => setDataMessage(''), 3500);

            Alert.alert(t.done, t.historyClearedDone);
          } catch (error) {
            Alert.alert(t.error, t.clearHistoryError);
          }
        },
      },
    ]);
  };

  const importData = async () => {
    if (isImporting) {
      return;
    }

    setIsImporting(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets?.[0];

      if (!file?.uri) {
        Alert.alert(t.error, t.fileSelectError);
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(file.uri);
      const backup: SoftDayBackup = JSON.parse(fileContent);

      if (backup.app !== 'Soft Day' || !backup.data) {
        Alert.alert(t.wrongFileTitle, t.wrongFileMessage);
        return;
      }

      Alert.alert(t.importDataTitle, t.importDataMessage, [
        {
          text: t.cancel,
          style: 'cancel',
        },
        {
          text: t.importDataButton,
          style: 'destructive',
          onPress: async () => {
            try {
              await Notifications.cancelAllScheduledNotificationsAsync();

              await AsyncStorage.multiSet([
                [
                  'soft-day-history',
                  JSON.stringify(backup.data?.history || []),
                ],
                [
                  'soft-day-nutrition-goals',
                  JSON.stringify(
                    backup.data?.nutritionGoals || {
                      caloriesGoal: '1500',
                      proteinGoal: '90',
                    }
                  ),
                ],
                [
                  'soft-day-weight-goal-settings',
                  JSON.stringify(
                    backup.data?.weightGoalSettings || {
                      mode: 'loss',
                      targetMin: '300',
                      targetMax: '500',
                    }
                  ),
                ],
                [
                  STEPS_GOAL_STORAGE_KEY,
                  JSON.stringify(
                    backup.data?.stepsGoalSettings || DEFAULT_STEPS_GOAL_SETTINGS
                  ),
                ],
                [
                  'soft-day-calorie-calculation-settings',
                  JSON.stringify(
                    backup.data?.calorieCalculationSettings || {
                      baseMetabolismCalories: '1400',
                    }
                  ),
                ],
                [
                  REMINDER_TIMES_STORAGE_KEY,
                  JSON.stringify(
                    backup.data?.reminderTimes || DEFAULT_REMINDER_TIMES
                  ),
                ],
                [
                  USER_PROFILE_STORAGE_KEY,
                  JSON.stringify(
                    backup.data?.userProfile || DEFAULT_USER_PROFILE
                  ),
                ],
              ]);

              const restoredProfile =
                backup.data?.userProfile || DEFAULT_USER_PROFILE;

              const restoredReminderTimes =
                backup.data?.reminderTimes || DEFAULT_REMINDER_TIMES;

              setUserProfile({
                displayName: restoredProfile.displayName || '',
                gender: restoredProfile.gender === 'male' ? 'male' : 'female',
              });

              setReminderTimes({
                ...DEFAULT_REMINDER_TIMES,
                ...restoredReminderTimes,
              });

              const recreatedReminders = await recreateReminderNotifications(
                backup.data?.reminders,
                restoredReminderTimes,
                restoredProfile
              );

              await loadNutritionGoals();
              await loadWeightGoalSettings();
              await loadStepsGoalSettings();
              await loadCalorieCalculationSettings();

              const restoredCount =
                Object.values(recreatedReminders).filter(Boolean).length;

              setDataMessage(
                restoredCount > 0
                  ? `${t.dataImportedWithReminders}: ${restoredCount}.`
                  : t.dataImported
              );
              setTimeout(() => setDataMessage(''), 4500);

              Alert.alert(
                t.done,
                restoredCount > 0
                  ? `${t.dataImportedWithReminders}: ${restoredCount}. ${t.importedUpdateTabs}`
                  : `${t.dataImported} ${t.importedUpdateTabs}`
              );
            } catch (error) {
              Alert.alert(t.error, t.applyImportError);
            }
          },
        },
      ]);
    } catch (error) {
      console.log('Import error:', error);

      const errorMessage =
        error instanceof Error ? error.message : t.importDataError;

      if (errorMessage.includes('Different document picking in progress')) {
        Alert.alert(t.error, pickerBusyText);
        return;
      }

      Alert.alert(t.error, errorMessage);
    } finally {
      setTimeout(() => {
        setIsImporting(false);
      }, 800);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={styles.title}>{t.settings}</Text>
        <Text style={styles.subtitle}>{t.settingsSubtitle}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{accountTitle}</Text>

          <Text style={styles.cardDescription}>{accountDescription}</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.primaryButtonText}>{openAccountText}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.appLanguage}</Text>

          <Text style={styles.cardDescription}>{t.appLanguageDescription}</Text>

          <View style={styles.languageButtonsRow}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                language === 'ru' && styles.languageButtonActive,
              ]}
              activeOpacity={0.85}
              onPress={() => saveLanguage('ru')}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  language === 'ru' && styles.languageButtonTextActive,
                ]}
              >
                {t.russian}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageButton,
                language === 'en' && styles.languageButtonActive,
              ]}
              activeOpacity={0.85}
              onPress={() => saveLanguage('en')}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  language === 'en' && styles.languageButtonTextActive,
                ]}
              >
                {t.english}
              </Text>
            </TouchableOpacity>
          </View>

          {languageMessage ? (
            <Text style={styles.savedMessage}>{languageMessage}</Text>
          ) : null}

          <Text style={styles.smallMutedText}>{t.nextLocalizationNote}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.nutritionGoal}</Text>

          {nutrition ? (
            <Text style={styles.cardDescription}>
              {t.nutritionNow}: {nutrition.calories} {t.kcal} · {t.protein}{' '}
              {nutrition.protein} · {t.fats} {nutrition.fat} · {t.carbs}{' '}
              {nutrition.carbs}
            </Text>
          ) : (
            <Text style={styles.cardDescription}>{t.nutritionDescription}</Text>
          )}

          <TextInput
            style={styles.input}
            placeholder={t.caloriesPerDayPlaceholder}
            placeholderTextColor={colors.mutedText}
            keyboardType="number-pad"
            value={caloriesGoal}
            onChangeText={setCaloriesGoal}
          />

          <TextInput
            style={styles.input}
            placeholder={t.proteinGramsPlaceholder}
            placeholderTextColor={colors.mutedText}
            keyboardType="number-pad"
            value={proteinGoal}
            onChangeText={setProteinGoal}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={saveNutritionGoals}
          >
            <Text style={styles.primaryButtonText}>{t.saveNutrition}</Text>
          </TouchableOpacity>

          {nutritionMessage ? (
            <Text style={styles.savedMessage}>{nutritionMessage}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.weightGoal}</Text>
          <Text style={styles.cardDescription}>{weightGoalLabel}</Text>

          <View style={styles.modeButtonsRow}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                weightGoalMode === 'loss' && styles.modeButtonActive,
              ]}
              onPress={() => setWeightGoalMode('loss')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  weightGoalMode === 'loss' && styles.modeButtonTextActive,
                ]}
              >
                {t.weightLoss}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                weightGoalMode === 'maintenance' && styles.modeButtonActive,
              ]}
              onPress={() => setWeightGoalMode('maintenance')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  weightGoalMode === 'maintenance' && styles.modeButtonTextActive,
                ]}
              >
                {t.weightMaintenance}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                weightGoalMode === 'gain' && styles.modeButtonActive,
              ]}
              onPress={() => setWeightGoalMode('gain')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  weightGoalMode === 'gain' && styles.modeButtonTextActive,
                ]}
              >
                {t.weightGain}
              </Text>
            </TouchableOpacity>
          </View>

          {weightGoalMode === 'loss' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder={t.minDeficitPlaceholder}
                placeholderTextColor={colors.mutedText}
                keyboardType="number-pad"
                value={targetMin}
                onChangeText={setTargetMin}
              />

              <TextInput
                style={styles.input}
                placeholder={t.maxDeficitPlaceholder}
                placeholderTextColor={colors.mutedText}
                keyboardType="number-pad"
                value={targetMax}
                onChangeText={setTargetMax}
              />
            </>
          ) : null}

          {weightGoalMode === 'maintenance' ? (
            <TextInput
              style={styles.input}
              placeholder={t.maintenanceCorridorPlaceholder}
              placeholderTextColor={colors.mutedText}
              keyboardType="number-pad"
              value={targetMax}
              onChangeText={setTargetMax}
            />
          ) : null}

          {weightGoalMode === 'gain' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder={t.minSurplusPlaceholder}
                placeholderTextColor={colors.mutedText}
                keyboardType="number-pad"
                value={targetMin}
                onChangeText={setTargetMin}
              />

              <TextInput
                style={styles.input}
                placeholder={t.maxSurplusPlaceholder}
                placeholderTextColor={colors.mutedText}
                keyboardType="number-pad"
                value={targetMax}
                onChangeText={setTargetMax}
              />
            </>
          ) : null}

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={saveWeightGoalSettings}
          >
            <Text style={styles.primaryButtonText}>{t.saveGoal}</Text>
          </TouchableOpacity>

          {weightGoalMessage ? (
            <Text style={styles.savedMessage}>{weightGoalMessage}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{stepsGoalTitle}</Text>
          <Text style={styles.cardDescription}>{stepsGoalDescription}</Text>

          <Text style={styles.fieldLabel}>{dailyStepsGoalLabel}</Text>

          <TextInput
            style={styles.input}
            placeholder="10000"
            placeholderTextColor={colors.mutedText}
            keyboardType="number-pad"
            value={stepsGoalSettings.dailyGoal}
            onChangeText={updateStepsGoalField}
          />

          <View style={styles.stepsStagesBlock}>
            <Text style={styles.stepsStagesTitle}>{activityStagesTitle}</Text>

            {stepsStages.map((stage) => (
              <View key={`${stage.level}-${stage.value}`} style={styles.stepsStageRow}>
                <Text style={styles.stepsStageValue}>{formatSteps(stage.value)}</Text>

                <View style={styles.stepsStageTextBlock}>
                  <Text style={styles.stepsStageTitle}>
                    {language === 'ru' ? stage.titleRu : stage.titleEn}
                  </Text>
                  <Text style={styles.stepsStageSubtitle}>
                    {language === 'ru' ? stage.subtitleRu : stage.subtitleEn}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={saveStepsGoalSettings}
          >
            <Text style={styles.primaryButtonText}>{saveStepsGoalText}</Text>
          </TouchableOpacity>

          {stepsGoalMessage ? (
            <Text style={styles.savedMessage}>{stepsGoalMessage}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{baseBurnTitle}</Text>

          <Text style={styles.cardDescription}>{baseBurnDescription}</Text>

          <Text style={styles.fieldLabel}>{baseBurnInputLabel}</Text>

          <TextInput
            style={styles.input}
            placeholder="1400"
            placeholderTextColor={colors.mutedText}
            keyboardType="number-pad"
            value={baseMetabolismCalories}
            onChangeText={setBaseMetabolismCalories}
          />

          <Text style={styles.smallMutedText}>{baseBurnNowText}</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={saveCalorieCalculationSettings}
          >
            <Text style={styles.primaryButtonText}>{saveBaseBurnText}</Text>
          </TouchableOpacity>

          {calculationMessage ? (
            <Text style={styles.savedMessage}>{calculationMessage}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.softReminders}</Text>

          <Text style={styles.cardDescription}>{t.softRemindersDescription}</Text>

          {softReminders.map((reminder) => {
            const isEnabled = Boolean(reminderNotificationIds[reminder.id]);

            return (
              <View
                key={reminder.id}
                style={[styles.reminderRow, isEnabled && styles.reminderRowActive]}
              >
                <TouchableOpacity
                  style={styles.reminderToggleArea}
                  activeOpacity={0.85}
                  onPress={() => toggleReminder(reminder)}
                >
                  <View style={[styles.checkbox, isEnabled && styles.checkboxChecked]}>
                    {isEnabled && <Text style={styles.checkMark}>✓</Text>}
                  </View>

                  <View style={styles.reminderContent}>
                    <Text style={styles.reminderTime}>{reminder.time}</Text>
                    <Text style={styles.reminderTitle}>{reminder.title}</Text>
                    <Text style={styles.reminderBody}>{reminder.body}</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.reminderTimeEditBlock}>
                  <Text style={styles.reminderTimeLabel}>{reminderTimeLabel}</Text>

                  <TextInput
                    style={styles.reminderTimeInput}
                    value={reminderTimes[reminder.id]}
                    placeholder="09:00"
                    placeholderTextColor={colors.mutedText}
                    keyboardType="numbers-and-punctuation"
                    onChangeText={(value) =>
                      setReminderTimes((currentTimes) => ({
                        ...currentTimes,
                        [reminder.id]: value,
                      }))
                    }
                    onEndEditing={(event) =>
                      saveReminderTime(reminder.id, event.nativeEvent.text)
                    }
                  />
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.data}</Text>

          <Text style={styles.cardDescription}>{t.dataDescription}</Text>

          <View style={styles.dataSection}>
            <Text style={styles.dataSectionTitle}>{t.backups}</Text>
            <Text style={styles.dataSectionText}>{t.backupsDescription}</Text>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={exportData}
            >
              <Text style={styles.primaryButtonText}>{t.exportJson}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                isImporting && styles.disabledButton,
              ]}
              activeOpacity={0.85}
              disabled={isImporting}
              onPress={importData}
            >
              <Text style={styles.secondaryButtonText}>
                {isImporting ? importOpeningText : t.importJson}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dataSection}>
            <Text style={styles.dataSectionTitle}>{t.table}</Text>
            <Text style={styles.dataSectionText}>{t.tableDescription}</Text>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={exportCsvData}
            >
              <Text style={styles.secondaryButtonText}>{t.exportCsv}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneTitle}>{t.dangerZone}</Text>
            <Text style={styles.dangerZoneText}>{t.dangerZoneDescription}</Text>

            <TouchableOpacity
              style={styles.dangerButton}
              activeOpacity={0.85}
              onPress={clearHistory}
            >
              <Text style={styles.dangerButtonText}>{t.clearHistory}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dangerButton}
              activeOpacity={0.85}
              onPress={clearToday}
            >
              <Text style={styles.dangerButtonText}>{t.clearToday}</Text>
            </TouchableOpacity>
          </View>

          {dataMessage ? (
            <Text style={styles.savedMessage}>{dataMessage}</Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 70,
    paddingBottom: 260,
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
    lineHeight: 22,
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
    marginBottom: 10,
  },
  cardDescription: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 22,
    marginBottom: 16,
  },
  smallMutedText: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 21,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '800',
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
  primaryButton: {
    backgroundColor: colors.sand,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.deepBrown,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.55,
  },
  secondaryButtonText: {
    color: colors.hunterGreen,
    fontSize: 16,
    fontWeight: '800',
  },
  dangerButton: {
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.softRed,
    marginTop: 10,
  },
  dangerButtonText: {
    color: colors.softRed,
    fontSize: 16,
    fontWeight: '800',
  },
  savedMessage: {
    color: colors.oliveGreen,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  modeButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  modeButton: {
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeButtonActive: {
    backgroundColor: colors.hunterGreen,
    borderColor: colors.hunterGreen,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.deepBrown,
  },
  modeButtonTextActive: {
    color: colors.surface,
  },
  stepsStagesBlock: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  stepsStagesTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 10,
  },
  stepsStageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stepsStageValue: {
    width: 72,
    fontSize: 15,
    fontWeight: '900',
    color: colors.hunterGreen,
  },
  stepsStageTextBlock: {
    flex: 1,
  },
  stepsStageTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 2,
  },
  stepsStageSubtitle: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
  },
  reminderRow: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reminderRowActive: {
    borderColor: colors.sageGreen,
  },
  reminderToggleArea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reminderTimeEditBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reminderTimeLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.mutedText,
    marginBottom: 6,
  },
  reminderTimeInput: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.deepBrown,
    width: 110,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTime: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.hunterGreen,
    marginBottom: 3,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 3,
  },
  reminderBody: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 19,
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
  dataSection: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dataSectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 6,
  },
  dataSectionText: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
    marginBottom: 12,
  },
  dangerZone: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.softRed,
  },
  dangerZoneTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.softRed,
    marginBottom: 6,
  },
  dangerZoneText: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
    marginBottom: 12,
  },
  languageButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  languageButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageButtonActive: {
    backgroundColor: colors.hunterGreen,
    borderColor: colors.hunterGreen,
  },
  languageButtonText: {
    color: colors.deepBrown,
    fontSize: 16,
    fontWeight: '800',
  },
  languageButtonTextActive: {
    color: colors.surface,
  },
});