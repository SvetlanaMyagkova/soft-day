import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  caramel: '#B9783F',
  deepBrown: '#4A2E1F',
  mutedText: '#7A6A58',
  border: '#E3D6C3',
  softRed: '#B85C4B',
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

type WorkoutItem = {
  id: string;
  name: string;
  minutes: string;
};

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

const getTodayKey = () => {
  return `soft-day-${getTodayDate()}`;
};

const getEmptyWorkout = (): WorkoutItem => {
  return {
    id: `${Date.now()}-${Math.random()}`,
    name: '',
    minutes: '',
  };
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

const getWorkoutCaloriesPerMinute = (value: string) => {
  const normalizedValue = value.toLowerCase();

  if (
    normalizedValue.includes('йога') ||
    normalizedValue.includes('yoga') ||
    normalizedValue.includes('растяж') ||
    normalizedValue.includes('stretch')
  ) {
    return 3;
  }

  if (
    normalizedValue.includes('пилатес') ||
    normalizedValue.includes('pilates')
  ) {
    return 4;
  }

  if (
    normalizedValue.includes('ходьб') ||
    normalizedValue.includes('прогул') ||
    normalizedValue.includes('walk')
  ) {
    return 4;
  }

  if (normalizedValue.includes('танц') || normalizedValue.includes('dance')) {
    return 5.5;
  }

  if (
    normalizedValue.includes('силов') ||
    normalizedValue.includes('зал') ||
    normalizedValue.includes('gym') ||
    normalizedValue.includes('strength')
  ) {
    return 6;
  }

  if (
    normalizedValue.includes('вел') ||
    normalizedValue.includes('bike') ||
    normalizedValue.includes('cycling')
  ) {
    return 7;
  }

  if (
    normalizedValue.includes('прыж') ||
    normalizedValue.includes('скакал') ||
    normalizedValue.includes('jump') ||
    normalizedValue.includes('skipping')
  ) {
    return 8;
  }

  if (normalizedValue.includes('плав') || normalizedValue.includes('swim')) {
    return 8;
  }

  if (
    normalizedValue.includes('бег') ||
    normalizedValue.includes('run') ||
    normalizedValue.includes('running')
  ) {
    return 9;
  }

  return 5;
};

const getWorkoutItemCalories = (workout: WorkoutItem) => {
  const minutes = normalizeNumber(workout.minutes);

  if (!minutes) {
    return 0;
  }

  return Math.round(minutes * getWorkoutCaloriesPerMinute(workout.name));
};

const getEstimatedWorkoutCalories = (workouts: WorkoutItem[]) => {
  return workouts.reduce((sum, workout) => {
    return sum + getWorkoutItemCalories(workout);
  }, 0);
};

const formatWorkoutNameForStorage = (workouts: WorkoutItem[]) => {
  return workouts
    .map((workout) => {
      const name = workout.name.trim();
      const minutes = workout.minutes.trim();

      if (!name && !minutes) {
        return '';
      }

      if (name && minutes) {
        return `${name} ${minutes} мин`;
      }

      return name || `${minutes} мин`;
    })
    .filter(Boolean)
    .join(', ');
};

const extractMinutesFromText = (value: string) => {
  const match = value.match(
    /(\d+)\s*(минут|минуты|минута|мин|m|min|minutes|minute)/i
  );

  if (!match?.[1]) {
    return '';
  }

  return match[1];
};

const removeMinutesFromText = (value: string) => {
  return value
    .replace(/(\d+)\s*(минут|минуты|минута|мин|m|min|minutes|minute)/i, '')
    .trim();
};

const parseWorkoutItemsFromStorage = (value: string | undefined) => {
  if (!value?.trim()) {
    return [getEmptyWorkout()];
  }

  const parts = value
    .split(/[,;+\n]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return [getEmptyWorkout()];
  }

  return parts.map((part) => {
    return {
      id: `${Date.now()}-${Math.random()}`,
      name: removeMinutesFromText(part),
      minutes: extractMinutesFromText(part),
    };
  });
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
      workoutNamePlaceholder: 'For example, Pilates',
      workoutMinutesPlaceholder: 'Min',
      addWorkout: '+ Add workout',
      removeWorkout: '×',
      workoutHint:
        'Add one workout per row. Soft Day will estimate calories for each workout and sum them.',
      workoutCaloriesTitle: 'Active workout calories',
      workoutCaloriesPlaceholder: 'For example, 250',
      workoutCaloriesHint:
        'This value is editable. If your watch or app shows active calories, you can replace the estimate manually.',
      suggestedCalories: 'Estimated average',
      workoutRowCalories: 'avg.',
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
    workoutNamePlaceholder: 'Например, пилатес',
    workoutMinutesPlaceholder: 'Мин',
    addWorkout: '+ Добавить тренировку',
    removeWorkout: '×',
    workoutHint:
      'Добавляй каждую тренировку отдельной строкой. Soft Day посчитает среднюю оценку по каждой и сложит итог.',
    workoutCaloriesTitle: 'Активные ккал тренировки',
    workoutCaloriesPlaceholder: 'Например, 250',
    workoutCaloriesHint:
      'Значение можно менять вручную. Если часы или приложение показывают активные калории — просто замени подсказку.',
    suggestedCalories: 'Средняя оценка',
    workoutRowCalories: 'ср.',
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
  const lastAutoWorkoutCaloriesRef = useRef('');

  const [steps, setSteps] = useState('');
  const [workouts, setWorkouts] = useState<WorkoutItem[]>([getEmptyWorkout()]);
  const [workoutCalories, setWorkoutCalories] = useState('');
  const [isWorkoutCaloriesManual, setIsWorkoutCaloriesManual] = useState(false);

  const [stepsGoalSettings, setStepsGoalSettings] =
    useState<StepsGoalSettings>(DEFAULT_STEPS_GOAL_SETTINGS);

  const estimatedWorkoutCalories = getEstimatedWorkoutCalories(workouts);
  const suggestedWorkoutCalories =
    estimatedWorkoutCalories > 0 ? String(estimatedWorkoutCalories) : '';

  const workoutName = formatWorkoutNameForStorage(workouts);

  const stepsCalories = Math.round(normalizeNumber(steps) * CALORIES_PER_STEP);
  const trainingCalories = Math.round(normalizeNumber(workoutCalories));

  const stepsGoalEvaluation = getStepsGoalEvaluation(steps, stepsGoalSettings);

  const hasStepsLogged = normalizeNumber(steps) > 0;
  const hasWorkoutLogged =
    workoutName.trim().length > 0 || normalizeNumber(workoutCalories) > 0;

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
  }, [steps, workouts, workoutCalories]);

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
    const parsedWorkouts = parseWorkoutItemsFromStorage(parsedEntry.workoutName);
    const savedWorkoutCalories = parsedEntry.workoutCalories || '';
    const parsedEstimatedCalories = getEstimatedWorkoutCalories(parsedWorkouts);
    const nextSuggestedCalories =
      parsedEstimatedCalories > 0 ? String(parsedEstimatedCalories) : '';

    setSteps(parsedEntry.steps || '');
    setWorkouts(parsedWorkouts);

    if (savedWorkoutCalories) {
      setWorkoutCalories(savedWorkoutCalories);
    } else {
      setWorkoutCalories(nextSuggestedCalories);
    }

    lastAutoWorkoutCaloriesRef.current = nextSuggestedCalories;

    setIsWorkoutCaloriesManual(
      savedWorkoutCalories.length > 0 &&
        savedWorkoutCalories !== nextSuggestedCalories
    );
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
        stepsDone: hasStepsLogged,
        workoutDone: hasWorkoutLogged,
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

      await AsyncStorage.setItem(
        'soft-day-history',
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      return;
    }
  };

  const syncWorkoutCalories = (nextWorkouts: WorkoutItem[]) => {
    const nextEstimatedCalories = getEstimatedWorkoutCalories(nextWorkouts);
    const nextSuggestedCalories =
      nextEstimatedCalories > 0 ? String(nextEstimatedCalories) : '';

    const canAutofillWorkoutCalories =
      !isWorkoutCaloriesManual ||
      workoutCalories.trim().length === 0 ||
      workoutCalories === lastAutoWorkoutCaloriesRef.current;

    if (canAutofillWorkoutCalories) {
      setWorkoutCalories(nextSuggestedCalories);
      lastAutoWorkoutCaloriesRef.current = nextSuggestedCalories;
      setIsWorkoutCaloriesManual(false);
    }
  };

  const updateWorkoutName = (id: string, value: string) => {
    setWorkouts((currentWorkouts) => {
      const nextWorkouts = currentWorkouts.map((workout) =>
        workout.id === id ? { ...workout, name: value } : workout
      );

      syncWorkoutCalories(nextWorkouts);

      return nextWorkouts;
    });
  };

  const updateWorkoutMinutes = (id: string, value: string) => {
    setWorkouts((currentWorkouts) => {
      const nextWorkouts = currentWorkouts.map((workout) =>
        workout.id === id ? { ...workout, minutes: value } : workout
      );

      syncWorkoutCalories(nextWorkouts);

      return nextWorkouts;
    });
  };

  const addWorkout = () => {
    setWorkouts((currentWorkouts) => {
      const nextWorkouts = [...currentWorkouts, getEmptyWorkout()];

      syncWorkoutCalories(nextWorkouts);

      return nextWorkouts;
    });
  };

  const removeWorkout = (id: string) => {
    setWorkouts((currentWorkouts) => {
      const nextWorkouts =
        currentWorkouts.length > 1
          ? currentWorkouts.filter((workout) => workout.id !== id)
          : currentWorkouts;

      syncWorkoutCalories(nextWorkouts);

      return nextWorkouts;
    });
  };

  const handleWorkoutCaloriesChange = (value: string) => {
    setWorkoutCalories(value);

    setIsWorkoutCaloriesManual(
      value.trim().length > 0 && value !== lastAutoWorkoutCaloriesRef.current
    );
  };

  const goBack = async () => {
    await persistTraining();
    router.back();
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
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
                <Text style={styles.stepsProgressTitle}>
                  {stepsProgressTitle}
                </Text>
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
          <Text style={styles.mutedLine}>{t.workoutHint}</Text>

          {workouts.map((workout, index) => {
            const workoutCaloriesByRow = getWorkoutItemCalories(workout);
            const canRemoveWorkout = workouts.length > 1;

            return (
              <View key={workout.id} style={styles.workoutItem}>
                <View style={styles.workoutItemHeader}>
                  <Text style={styles.workoutItemTitle}>
                    {language === 'ru'
                      ? `Тренировка ${index + 1}`
                      : `Workout ${index + 1}`}
                  </Text>

                  {canRemoveWorkout ? (
                    <TouchableOpacity
                      style={styles.removeWorkoutButton}
                      activeOpacity={0.85}
                      onPress={() => removeWorkout(workout.id)}
                    >
                      <Text style={styles.removeWorkoutButtonText}>
                        {t.removeWorkout}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TextInput
                  style={styles.input}
                  placeholder={t.workoutNamePlaceholder}
                  placeholderTextColor={colors.mutedText}
                  value={workout.name}
                  onChangeText={(value) => updateWorkoutName(workout.id, value)}
                />

                <View style={styles.workoutMinutesRow}>
                  <TextInput
                    style={styles.minutesInput}
                    placeholder={t.workoutMinutesPlaceholder}
                    placeholderTextColor={colors.mutedText}
                    keyboardType="number-pad"
                    value={workout.minutes}
                    onChangeText={(value) =>
                      updateWorkoutMinutes(workout.id, value)
                    }
                  />

                  <View style={styles.workoutItemCaloriesBox}>
                    <Text style={styles.workoutItemCaloriesLabel}>
                      {t.workoutRowCalories}
                    </Text>
                    <Text style={styles.workoutItemCaloriesValue}>
                      +{workoutCaloriesByRow} {t.kcal}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.addWorkoutButton}
            activeOpacity={0.85}
            onPress={addWorkout}
          >
            <Text style={styles.addWorkoutButtonText}>{t.addWorkout}</Text>
          </TouchableOpacity>

          {suggestedWorkoutCalories ? (
            <View style={styles.suggestedCaloriesBox}>
              <Text style={styles.suggestedCaloriesLabel}>
                {t.suggestedCalories}
              </Text>
              <Text style={styles.suggestedCaloriesValue}>
                +{suggestedWorkoutCalories} {t.kcal}
              </Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>{t.workoutCaloriesTitle}</Text>

          <TextInput
            style={styles.input}
            placeholder={t.workoutCaloriesPlaceholder}
            placeholderTextColor={colors.mutedText}
            keyboardType="number-pad"
            value={workoutCalories}
            onChangeText={handleWorkoutCaloriesChange}
          />

          <Text style={styles.mutedLine}>{t.workoutCaloriesHint}</Text>

          <View style={styles.workoutSummaryBox}>
            <Text style={styles.workoutSummaryLabel}>
              {t.workoutCaloriesTitle}
            </Text>
            <Text style={styles.workoutSummaryValue}>
              +{trainingCalories} {t.kcal}
            </Text>
          </View>
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
    paddingBottom: 320,
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
  workoutItem: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  workoutItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  workoutItemTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.deepBrown,
  },
  removeWorkoutButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeWorkoutButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.softRed,
    lineHeight: 22,
  },
  workoutMinutesRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  minutesInput: {
    width: 96,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.deepBrown,
  },
  workoutItemCaloriesBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workoutItemCaloriesLabel: {
    fontSize: 13,
    color: colors.mutedText,
    marginBottom: 3,
  },
  workoutItemCaloriesValue: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.hunterGreen,
  },
  addWorkoutButton: {
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.sageGreen,
    marginBottom: 14,
  },
  addWorkoutButtonText: {
    color: colors.hunterGreen,
    fontSize: 16,
    fontWeight: '900',
  },
  suggestedCaloriesBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sageGreen,
    marginBottom: 14,
  },
  suggestedCaloriesLabel: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 6,
  },
  suggestedCaloriesValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.hunterGreen,
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
});