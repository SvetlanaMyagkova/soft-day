import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
  sand: '#C9A978',
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
  expenseUsa?: string;
  expenseStudio?: string;
  expenseOther?: string;

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
    expenseUsa: '',
    expenseStudio: '',
    expenseOther: '',

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

const normalizeNumber = (value: string) => {
  const number = Number(value.replace(',', '.'));
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
      foodTracked: 'I logged food',
      caloriesTracked: 'I counted calories',
      save: 'Save food',
      saved: 'Food saved',
      error: 'Error',
      loadError: 'Could not load food',
      saveError: 'Could not save food',
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
    foodTracked: 'Еду записывала',
    caloriesTracked: 'Калории считала',
    save: 'Сохранить еду',
    saved: 'Еда сохранена',
    error: 'Ошибка',
    loadError: 'Не получилось загрузить еду',
    saveError: 'Не получилось сохранить еду',
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

  const [calories, setCalories] = useState('');
  const [foodNote, setFoodNote] = useState('');
  const [foodTracked, setFoodTracked] = useState(false);
  const [caloriesTracked, setCaloriesTracked] = useState(false);

  const [caloriesGoal, setCaloriesGoal] = useState('1500');
  const [proteinGoal, setProteinGoal] = useState('90');

  const [savedMessage, setSavedMessage] = useState('');

  const nutrition = calculateNutrition(caloriesGoal, proteinGoal);
  const consumedCalories = normalizeNumber(calories || '0');

  useFocusEffect(
    useCallback(() => {
      loadLanguage();
      loadNutritionGoals();
      loadTodayEntry();
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
    try {
      const savedEntry = await AsyncStorage.getItem(getTodayKey());

      if (!savedEntry) {
        return;
      }

      const parsedEntry: DayEntry = JSON.parse(savedEntry);

      setCalories(parsedEntry.calories || '');
      setFoodNote(parsedEntry.foodNote || '');
      setFoodTracked(parsedEntry.foodTracked || false);
      setCaloriesTracked(parsedEntry.caloriesTracked || false);
    } catch (error) {
      Alert.alert(t.error, t.loadError);
    }
  };

  const saveFood = async () => {
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
        foodTracked,
        caloriesTracked,
      };

      await AsyncStorage.setItem(getTodayKey(), JSON.stringify(updatedEntry));

      const historyRaw = await AsyncStorage.getItem('soft-day-history');
      const history: DayEntry[] = historyRaw ? JSON.parse(historyRaw) : [];

      const updatedHistory = [
        updatedEntry,
        ...history.filter((item) => item.date !== updatedEntry.date),
      ];

      await AsyncStorage.setItem('soft-day-history', JSON.stringify(updatedHistory));

      setSavedMessage(t.saved);
      setTimeout(() => setSavedMessage(''), 2500);
    } catch (error) {
      Alert.alert(t.error, t.saveError);
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

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.checkRow}
          activeOpacity={0.8}
          onPress={() => setFoodTracked(!foodTracked)}
        >
          <View style={[styles.checkbox, foodTracked && styles.checkboxChecked]}>
            {foodTracked && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkText}>{t.foodTracked}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkRow}
          activeOpacity={0.8}
          onPress={() => setCaloriesTracked(!caloriesTracked)}
        >
          <View
            style={[styles.checkbox, caloriesTracked && styles.checkboxChecked]}
          >
            {caloriesTracked && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkText}>{t.caloriesTracked}</Text>
        </TouchableOpacity>
      </View>

      {savedMessage ? (
        <Text style={styles.savedMessage}>{savedMessage}</Text>
      ) : null}

      <TouchableOpacity
        style={styles.saveButton}
        activeOpacity={0.85}
        onPress={saveFood}
      >
        <Text style={styles.saveButtonText}>{t.save}</Text>
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
  savedMessage: {
    textAlign: 'center',
    color: colors.oliveGreen,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: colors.sand,
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: {
    color: colors.deepBrown,
    fontSize: 18,
    fontWeight: '900',
  },
});