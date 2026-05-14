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

const colors = {
  background: '#F5F0E6',
  surface: '#FFF9EF',
  hunterGreen: '#123524',
  sageGreen: '#87906A',
  oliveGreen: '#556B2F',
  deepBrown: '#4A2E1F',
  mutedText: '#7A6A58',
  border: '#E3D6C3',
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

type NutritionGoals = {
  caloriesGoal: string;
  proteinGoal: string;
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

const getTexts = (language: AppLanguage) => {
  if (language === 'en') {
    return {
      back: '← Back',
      title: 'Food',
      subtitle: 'A calm place for calories, notes, and nutrition tracking.',
      todayCalories: 'Calories today',
      caloriesPlaceholder: 'How many kcal you ate today',
      noteTitle: 'Food notes',
      notePlaceholder: 'Breakfast, coffee, lunch, snack, dinner…',
      error: 'Error',
      loadError: 'Could not load food',
      goalTitle: 'Daily guide',
      noGoal: 'You can set calories and protein goals in Settings.',
      kcal: 'kcal',
      protein: 'protein',
      fats: 'fats',
      carbs: 'carbs',
      gramsShort: 'g',
      softHint: 'No need to make it perfect. A rough note is already useful.',
    };
  }

  return {
    back: '← Назад',
    title: 'Еда',
    subtitle: 'Спокойное место для калорий, заметок и мягкого учёта питания.',
    todayCalories: 'Калории сегодня',
    caloriesPlaceholder: 'Сколько ккал съела за день',
    noteTitle: 'Что ела',
    notePlaceholder: 'Завтрак, кофе, обед, перекус, ужин…',
    error: 'Ошибка',
    loadError: 'Не получилось загрузить еду',
    goalTitle: 'Ориентир на день',
    noGoal: 'Цель калорий и белка можно задать в настройках.',
    kcal: 'ккал',
    protein: 'белки',
    fats: 'жиры',
    carbs: 'углеводы',
    gramsShort: 'г',
    softHint: 'Не нужно идеально. Даже примерная заметка уже помогает.',
  };
};

export default function FoodScreen() {
  const router = useRouter();

  const [language, setLanguage] = useState<AppLanguage>(getAutomaticLanguage());
  const t = getTexts(language);

  const isFoodLoadedRef = useRef(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [calories, setCalories] = useState('');
  const [foodNote, setFoodNote] = useState('');

  const [caloriesGoal, setCaloriesGoal] = useState('1500');
  const [proteinGoal, setProteinGoal] = useState('90');

  const nutrition = calculateNutrition(caloriesGoal, proteinGoal);
  const consumedCalories = normalizeNumber(calories);

  const hasFoodLogged = foodNote.trim().length > 0;
  const hasCaloriesLogged = normalizeNumber(calories) > 0;

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
    if (!isFoodLoadedRef.current) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      persistFood();
    }, 700);
  }, [calories, foodNote]);

  const loadScreenData = async () => {
    try {
      isFoodLoadedRef.current = false;

      await loadLanguage();
      await loadNutritionGoals();
      await loadTodayEntry();

      setTimeout(() => {
        isFoodLoadedRef.current = true;
      }, 0);
    } catch (error) {
      isFoodLoadedRef.current = true;
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
      return;
    }
  };

  const loadTodayEntry = async () => {
    const savedEntry = await AsyncStorage.getItem(getTodayKey());

    if (!savedEntry) {
      return;
    }

    const parsedEntry: DayEntry = JSON.parse(savedEntry);

    setCalories(parsedEntry.calories || '');
    setFoodNote(parsedEntry.foodNote || '');
  };

  const persistFood = async () => {
    try {
      const savedEntry = await AsyncStorage.getItem(getTodayKey());
      const currentEntry: DayEntry = savedEntry
        ? JSON.parse(savedEntry)
        : getEmptyDayEntry();

      const updatedEntry: DayEntry = {
        ...currentEntry,
        date: getTodayDate(),
        calories,
        foodNote,
        foodTracked: hasFoodLogged,
        caloriesTracked: hasCaloriesLogged,
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

      <Text style={styles.title}>{t.title} 🍽️</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.goalTitle}</Text>

        {nutrition ? (
          <Text style={styles.cardText}>
            {nutrition.calories} {t.kcal} · {t.protein} {nutrition.protein}{' '}
            {t.gramsShort} · {t.fats} {nutrition.fat} {t.gramsShort} · {t.carbs}{' '}
            {nutrition.carbs} {t.gramsShort}
          </Text>
        ) : (
          <Text style={styles.cardText}>{t.noGoal}</Text>
        )}

        <Text style={styles.softHint}>{t.softHint}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.todayCalories}</Text>

        <TextInput
          style={styles.input}
          placeholder={t.caloriesPlaceholder}
          placeholderTextColor={colors.mutedText}
          keyboardType="number-pad"
          value={calories}
          onChangeText={setCalories}
        />

        <View style={styles.calorieBox}>
          <Text style={styles.calorieLabel}>{t.todayCalories}</Text>
          <Text style={styles.calorieValue}>
            {consumedCalories > 0 ? Math.round(consumedCalories) : '—'}
          </Text>
          <Text style={styles.calorieUnit}>{t.kcal}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.noteTitle}</Text>

        <TextInput
          style={[styles.input, styles.bigInput]}
          placeholder={t.notePlaceholder}
          placeholderTextColor={colors.mutedText}
          multiline
          value={foodNote}
          onChangeText={setFoodNote}
        />
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
    paddingBottom: 80,
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
  cardText: {
    fontSize: 16,
    color: colors.deepBrown,
    lineHeight: 23,
  },
  softHint: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
    marginTop: 10,
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
    marginBottom: 14,
  },
  bigInput: {
    minHeight: 112,
    textAlignVertical: 'top',
  },
  calorieBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calorieLabel: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 6,
  },
  calorieValue: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.deepBrown,
  },
  calorieUnit: {
    fontSize: 13,
    color: colors.mutedText,
    marginTop: 2,
  },
});