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
} from '../constants/i18n';
import {
  DEFAULT_STEPS_GOAL_SETTINGS,
  STEPS_GOAL_STORAGE_KEY,
  StepsGoalSettings,
  getStepsGoalEvaluation,
} from '../constants/stepsGoal';

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
};

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

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

const getTodayKey = () => {
  return `soft-day-${getTodayDate()}`;
};

const getEmptyDayEntry = (): DayEntry => {
  return {
    date: getTodayDate(),

    weight: '',

    foodTracked: false,
    caloriesTracked: false,
    calories: '',
    foodNote: '',

    income: '',
    expenses: '',

    incomeSalary: '',
    incomeStudio: '',
    incomeExtra: '',
    incomeCashback: '',

    expenseGroceries: '',
    expenseCafe: '',
    expenseHome: '',
    expenseBeauty: '',
    expenseClothes: '',
    expenseHealth: '',
    expenseTransport: '',
    expenseEntertainment: '',
    expensePet: '',
    expenseGifts: '',
    expenseEducation: '',
    expenseSubscriptions: '',
    expenseTravel: '',
    expenseUsa: '',
    expenseStudio: '',
    expenseOther: '',

    customExpenseName: '',
    customExpenseAmount: '',

    steps: '',
    stepsDone: false,
    workoutDone: false,
    workoutName: '',
    workoutCalories: '',

    gratitude: '',
    gratitudeGoodDeed: '',
    gratitudeSupport: '',

    readingDone: false,
  };
};

const normalizeNumber = (value: string | undefined) => {
  if (!value) {
    return 0;
  }

  const number = Number(value.replace(',', '.').replace(/\s/g, ''));

  return Number.isFinite(number) ? number : 0;
};

const getTexts = (language: AppLanguage) => {
  if (language === 'en') {
    return {
      back: '← Back',
      title: 'Movement',
      subtitle: 'Steps, workouts, and active calories — without pressure.',
      stepsTitle: 'Steps today',
      stepsPlaceholder: 'How many steps you walked',
      stepsCaloriesHint: 'Steps add about',
      toBurn: 'to your burn',
      workoutTitle: 'Workout',
      workoutPlaceholder: 'For example, Pilates 50 min',
      workoutHint: 'Write what you did. You can leave it empty if there was no workout.',
      workoutCaloriesTitle: 'Active workout calories',
      workoutCaloriesPlaceholder: 'For example, 250',
      workoutCaloriesHint:
        'If your watch or app shows active calories, enter them here. Later we will suggest an approximate value automatically.',
      stepsDone: 'Steps logged',
      workoutDone: 'Workout completed',
      error: 'Error',
      loadError: 'Could not load movement',
      kcal: 'kcal',
      dailyGoalCompleted: 'Daily goal completed 🌿',
      nextStep: 'To the next step',
      steps: 'steps',
      softHint:
        'A short walk also counts. The app is here to support you, not to push.',
    };
  }

  return {
    back: '← Назад',
    title: 'Движение',
    subtitle: 'Шаги, тренировки и активные калории — без давления.',
    stepsTitle: 'Шаги сегодня',
    stepsPlaceholder: 'Сколько шагов прошла',
    stepsCaloriesHint: 'Шаги добавляют примерно',
    toBurn: 'к расходу',
    workoutTitle: 'Тренировка',
    workoutPlaceholder: 'Например, пилатес 50 минут',
    workoutHint: 'Напиши, что делала. Можно оставить пустым, если тренировки не было.',
    workoutCaloriesTitle: 'Активные ккал тренировки',
    workoutCaloriesPlaceholder: 'Например, 250',
    workoutCaloriesHint:
      'Если часы или приложение показывают активные калории — внеси их сюда. Позже мы добавим примерную подсказку автоматически.',
    stepsDone: 'Шаги внесены',
    workoutDone: 'Тренировка была',
    error: 'Ошибка',
    loadError: 'Не получилось загрузить движение',
    kcal: 'ккал',
    dailyGoalCompleted: 'Цель на день выполнена 🌿',
    nextStep: 'До следующей ступени',
    steps: 'шагов',
    softHint:
      'Короткая прогулка тоже считается. Приложение не подгоняет, а поддерживает.',
  };
};

export default function TrainingScreen() {
  const router = useRouter();

  const [language, setLanguage] = useState<AppLanguage>(getAutomaticLanguage());
  const t = getTexts(language);

  const isTrainingLoadedRef = useRef(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [steps, setSteps] = useState('');
  const [stepsDone, setStepsDone] = useState(false);
  const [workoutDone, setWorkoutDone] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutCalories, setWorkoutCalories] = useState('');

  const [stepsGoalSettings, setStepsGoalSettings] =
    useState<StepsGoalSettings>(DEFAULT_STEPS_GOAL_SETTINGS);

  const stepsCalories = Math.round(normalizeNumber(steps) * CALORIES_PER_STEP);
  const trainingCalories = Math.round(normalizeNumber(workoutCalories));

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
      ? `${stepsGoalEvaluation.steps.toLocaleString('ru-RU')} / ${stepsGoalEvaluation.dailyGoal.toLocaleString('ru-RU')} ${t.steps}`
      : `${stepsGoalEvaluation.steps.toLocaleString('en-US')} / ${stepsGoalEvaluation.dailyGoal.toLocaleString('en-US')} ${t.steps}`;

  const nextStepsText = stepsGoalEvaluation.nextStage
    ? `${t.nextStep}: ${Math.max(
        0,
        stepsGoalEvaluation.nextStage.value - stepsGoalEvaluation.steps
      ).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')} ${t.steps}`
    : t.dailyGoalCompleted;

  useFocusEffect(
    useCallback(() => {
      loadScreenData();
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
    if (!isTrainingLoadedRef.current) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      persistTraining();
    }, 700);
  }, [steps, stepsDone, workoutDone, workoutName, workoutCalories]);

  const loadScreenData = async () => {
    try {
      isTrainingLoadedRef.current = false;

      await loadLanguage();
      await loadStepsGoalSettings();
      await loadTodayEntry();

      setTimeout(() => {
        isTrainingLoadedRef.current = true;
      }, 0);
    } catch (error) {
      isTrainingLoadedRef.current = true;
      Alert.alert(t.error, t.loadError);
    }
  };

  const loadLanguage = async () => {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (savedLanguage === 'ru' || savedLanguage === 'en') {
      setLanguage(savedLanguage);
      return;
    }

    setLanguage(getAutomaticLanguage());
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

  const loadTodayEntry = async () => {
    const savedEntry = await AsyncStorage.getItem(getTodayKey());

    if (!savedEntry) {
      return;
    }

    const parsedEntry: DayEntry = JSON.parse(savedEntry);

    setSteps(parsedEntry.steps || '');
    setStepsDone(parsedEntry.stepsDone || false);
    setWorkoutDone(parsedEntry.workoutDone || false);
    setWorkoutName(parsedEntry.workoutName || '');
    setWorkoutCalories(parsedEntry.workoutCalories || '');
  };

  const persistTraining = async () => {
    try {
      const savedEntry = await AsyncStorage.getItem(getTodayKey());
      const currentEntry: DayEntry = savedEntry
        ? JSON.parse(savedEntry)
        : getEmptyDayEntry();

      const updatedEntry: DayEntry = {
        ...currentEntry,
        date: getTodayDate(),
        steps,
        stepsDone,
        workoutDone,
        workoutName,
        workoutCalories,
      };

      await AsyncStorage.setItem(getTodayKey(), JSON.stringify(updatedEntry));

      const historyRaw = await AsyncStorage.getItem('soft-day-history');
      const history: DayEntry[] = historyRaw ? JSON.parse(historyRaw) : [];

      const updatedHistory = [
        updatedEntry,
        ...history.filter((item) => item.date !== updatedEntry.date),
      ];

      await AsyncStorage.setItem('soft-day-history', JSON.stringify(updatedHistory));
    } catch (error) {
      return;
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.85}
      >
        <Text style={styles.backButtonText}>{t.back}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{t.title} 👟</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.hintCard}>
        <Text style={styles.hintText}>{t.softHint}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.stepsTitle}</Text>

        <TextInput
          style={styles.input}
          placeholder={t.stepsPlaceholder}
          placeholderTextColor={colors.mutedText}
          keyboardType="number-pad"
          value={steps}
          onChangeText={setSteps}
        />

        <Text style={styles.mutedLine}>
          {t.stepsCaloriesHint} +{stepsCalories} {t.kcal} {t.toBurn}
        </Text>

        <View style={styles.stepsProgressBox}>
          <View style={styles.stepsProgressHeader}>
            <View style={styles.stepsProgressTextBlock}>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.workoutTitle}</Text>

        <TextInput
          style={styles.input}
          placeholder={t.workoutPlaceholder}
          placeholderTextColor={colors.mutedText}
          value={workoutName}
          onChangeText={setWorkoutName}
        />

        <Text style={styles.mutedLine}>{t.workoutHint}</Text>

        <Text style={styles.fieldLabel}>{t.workoutCaloriesTitle}</Text>

        <TextInput
          style={styles.input}
          placeholder={t.workoutCaloriesPlaceholder}
          placeholderTextColor={colors.mutedText}
          keyboardType="number-pad"
          value={workoutCalories}
          onChangeText={setWorkoutCalories}
        />

        <Text style={styles.mutedLine}>{t.workoutCaloriesHint}</Text>

        <View style={styles.workoutSummaryBox}>
          <Text style={styles.workoutSummaryLabel}>{t.workoutCaloriesTitle}</Text>
          <Text style={styles.workoutSummaryValue}>
            +{trainingCalories} {t.kcal}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.checkRow}
          activeOpacity={0.8}
          onPress={() => setStepsDone(!stepsDone)}
        >
          <View style={[styles.checkbox, stepsDone && styles.checkboxChecked]}>
            {stepsDone && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkText}>{t.stepsDone}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkRow}
          activeOpacity={0.8}
          onPress={() => setWorkoutDone(!workoutDone)}
        >
          <View style={[styles.checkbox, workoutDone && styles.checkboxChecked]}>
            {workoutDone && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkText}>{t.workoutDone}</Text>
        </TouchableOpacity>
      </View>
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
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  backButtonText: {
    color: colors.hunterGreen,
    fontSize: 15,
    fontWeight: '800',
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: colors.hunterGreen,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.mutedText,
    lineHeight: 23,
    marginBottom: 18,
  },
  hintCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hintText: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 22,
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
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.deepBrown,
    marginBottom: 12,
  },
  mutedLine: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 8,
    marginLeft: 4,
  },
  stepsProgressBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  stepsProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  stepsProgressTextBlock: {
    flex: 1,
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
  workoutSummaryBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workoutSummaryLabel: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 6,
  },
  workoutSummaryValue: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.hunterGreen,
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
});