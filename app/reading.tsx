import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
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

const DEFAULT_READING_TIMER_SECONDS = 15 * 60;

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

const formatTimer = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const getTexts = (language: AppLanguage) => {
  if (language === 'en') {
    return {
      back: '← Back',
      title: 'Reading',
      subtitle: 'A small quiet pause for your mind. Even a few pages count.',
      timerTitle: 'Reading timer',
      timerHint:
        '15 minutes is the soft default. Later we will add 5, 10, 15 minutes and custom time.',
      start: 'Start 15 min',
      pause: 'Pause',
      restart: 'Restart',
      reset: 'Reset',
      readingDone: 'Reading completed',
      save: 'Save reading',
      saved: 'Reading saved',
      counted: 'Reading counted',
      error: 'Error',
      loadError: 'Could not load reading',
      saveError: 'Could not save reading',
      softHint:
        'You do not have to read a lot. One calm page is already a step back to yourself.',
      booksTitle: 'Books',
      booksText:
        'Soon there will be a list of books you want to read: world bestsellers, fiction, science, self-growth, and your own list.',
    };
  }

  return {
    back: '← Назад',
    title: 'Чтение',
    subtitle: 'Небольшая тихая пауза для головы. Даже несколько страниц считаются.',
    timerTitle: 'Таймер чтения',
    timerHint:
      '15 минут — мягкое значение по умолчанию. Позже добавим 5, 10, 15 минут и своё время.',
    start: 'Начать 15 минут',
    pause: 'Пауза',
    restart: 'Заново',
    reset: 'Сбросить',
    readingDone: 'Чтение выполнено',
    save: 'Сохранить чтение',
    saved: 'Чтение сохранено',
    counted: 'Чтение засчитано',
    error: 'Ошибка',
    loadError: 'Не получилось загрузить чтение',
    saveError: 'Не получилось сохранить чтение',
    softHint:
      'Не обязательно читать много. Одна спокойная страница — уже шаг обратно к себе.',
    booksTitle: 'Книги',
    booksText:
      'Скоро здесь будет список книг, которые хочется прочитать: мировые бестселлеры, художественная литература, научпоп, саморазвитие и свой список.',
  };
};

export default function ReadingScreen() {
  const router = useRouter();

  const [language, setLanguage] = useState<AppLanguage>(getAutomaticLanguage());
  const t = getTexts(language);

  const [readingDone, setReadingDone] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_READING_TIMER_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadLanguage();
      loadTodayEntry();
    }, [])
  );

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
          setSavedMessage(t.counted);
          setTimeout(() => setSavedMessage(''), 2500);

          return 0;
        }

        return previousSeconds - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, t.counted]);

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

  const loadTodayEntry = async () => {
    try {
      const savedEntry = await AsyncStorage.getItem(getTodayKey());

      if (!savedEntry) {
        return;
      }

      const parsedEntry: DayEntry = JSON.parse(savedEntry);

      setReadingDone(parsedEntry.readingDone || false);
    } catch (error) {
      Alert.alert(t.error, t.loadError);
    }
  };

  const resetReadingTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(DEFAULT_READING_TIMER_SECONDS);
    setReadingDone(false);
  };

  const saveReading = async () => {
    try {
      const savedEntry = await AsyncStorage.getItem(getTodayKey());
      const currentEntry: DayEntry = savedEntry
        ? JSON.parse(savedEntry)
        : getEmptyDayEntry();

      const updatedEntry: DayEntry = {
        ...currentEntry,
        date: getTodayDate(),
        readingDone,
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

      <Text style={styles.title}>{t.title} 📖</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.hintCard}>
        <Text style={styles.hintText}>{t.softHint}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.timerTitle}</Text>
        <Text style={styles.cardText}>{t.timerHint}</Text>

        <Text style={styles.timerDisplay}>{formatTimer(timerSeconds)}</Text>

        <View style={styles.timerControls}>
          <TouchableOpacity
            style={styles.timerButton}
            activeOpacity={0.85}
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
                  : t.start}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetButton}
            activeOpacity={0.85}
            onPress={resetReadingTimer}
          >
            <Text style={styles.resetButtonText}>{t.reset}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.checkRow}
          activeOpacity={0.8}
          onPress={() => setReadingDone(!readingDone)}
        >
          <View style={[styles.checkbox, readingDone && styles.checkboxChecked]}>
            {readingDone && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkText}>{t.readingDone}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.booksTitle}</Text>
        <Text style={styles.cardText}>{t.booksText}</Text>
      </View>

      {savedMessage ? (
        <Text style={styles.savedMessage}>{savedMessage}</Text>
      ) : null}

      <TouchableOpacity
        style={styles.saveButton}
        activeOpacity={0.85}
        onPress={saveReading}
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
  cardText: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 22,
    marginBottom: 14,
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.hunterGreen,
    textAlign: 'center',
    marginVertical: 18,
  },
  timerControls: {
    flexDirection: 'row',
    gap: 10,
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
    fontWeight: '900',
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
    fontWeight: '900',
    color: colors.deepBrown,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
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