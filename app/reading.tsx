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

const DEFAULT_READING_TIMER_SECONDS = 15 * 60;
const BOOKS_STORAGE_KEY = 'soft-day-books';

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

type BookStatus = 'want' | 'reading' | 'done';

type BookItem = {
  id: string;
  title: string;
  author: string;
  status: BookStatus;
  createdAt: string;
};

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getTodayDate = () => {
  return getLocalDateString();
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

const normalizeMinutes = (value: string) => {
  const number = Number(value.replace(',', '.').replace(/\s/g, ''));

  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }

  return Math.round(number);
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
        '15 minutes is the soft default. You can choose less or set your own time.',
      fiveMinutes: '5 min',
      tenMinutes: '10 min',
      fifteenMinutes: '15 min',
      customTime: 'Custom',
      customTimeTitle: 'Your time',
      customTimePlaceholder: 'Minutes',
      applyCustomTime: 'Set time',
      start: 'Start',
      pause: 'Pause',
      restart: 'Restart',
      reset: 'Reset',

      timerFinishedTitle: 'Timer finished 🌿',
      timerFinishedText: 'Mark reading for today?',
      confirmReading: 'Yes, I read',
      notNow: 'Not now',
      counted: 'Reading counted',

      error: 'Error',
      loadError: 'Could not load reading',

      softHint:
        'You do not have to read a lot. One calm page is already a step back to yourself.',

      todayStatusTitle: 'Today’s reading',
      todayStatusDone: 'Reading is counted for today 🌿',
      todayStatusEmpty:
        'Start the timer here, or mark reading on the Today screen.',

      booksTitle: 'Books',
      booksText:
        'Your soft reading shelf: add books you want to read, are reading now, or have already finished.',
      addBookTitle: 'Add a book',
      bookTitlePlaceholder: 'Book title',
      bookAuthorPlaceholder: 'Author, optional',
      addBook: 'Add book',
      emptyBooksTitle: 'No books yet',
      emptyBooksText: 'Add the first book when you are ready.',
      wantToRead: 'Want to read',
      readingNow: 'Reading',
      finished: 'Finished',
      deleteBook: 'Delete',
      bookTitleRequired: 'Add the book title first.',
      bookSaved: 'Book added',
    };
  }

  return {
    back: '← Назад',
    title: 'Чтение',
    subtitle: 'Небольшая тихая пауза для головы. Даже несколько страниц считаются.',

    timerTitle: 'Таймер чтения',
    timerHint:
      '15 минут — мягкое значение по умолчанию. Можно выбрать меньше или задать своё время.',
    fiveMinutes: '5 мин',
    tenMinutes: '10 мин',
    fifteenMinutes: '15 мин',
    customTime: 'Своё',
    customTimeTitle: 'Своё время',
    customTimePlaceholder: 'Минуты',
    applyCustomTime: 'Задать время',
    start: 'Начать',
    pause: 'Пауза',
    restart: 'Заново',
    reset: 'Сбросить',

    timerFinishedTitle: 'Таймер завершён 🌿',
    timerFinishedText: 'Отметить чтение за сегодня?',
    confirmReading: 'Да, я почитала',
    notNow: 'Не сейчас',
    counted: 'Чтение засчитано',

    error: 'Ошибка',
    loadError: 'Не получилось загрузить чтение',

    softHint:
      'Не обязательно читать много. Одна спокойная страница — уже шаг обратно к себе.',

    todayStatusTitle: 'Чтение сегодня',
    todayStatusDone: 'Чтение сегодня засчитано 🌿',
    todayStatusEmpty:
      'Запусти таймер здесь или отметь чтение на экране “Сегодня”.',

    booksTitle: 'Книги',
    booksText:
      'Твоя мягкая книжная полка: добавляй книги, которые хочешь прочитать, читаешь сейчас или уже прочитала.',
    addBookTitle: 'Добавить книгу',
    bookTitlePlaceholder: 'Название книги',
    bookAuthorPlaceholder: 'Автор, необязательно',
    addBook: 'Добавить книгу',
    emptyBooksTitle: 'Книг пока нет',
    emptyBooksText: 'Добавь первую книгу, когда будет настроение.',
    wantToRead: 'Хочу прочитать',
    readingNow: 'Читаю',
    finished: 'Прочитано',
    deleteBook: 'Удалить',
    bookTitleRequired: 'Сначала добавь название книги.',
    bookSaved: 'Книга добавлена',
  };
};

export default function ReadingScreen() {
  const router = useRouter();

  const [language, setLanguage] = useState<AppLanguage>(getAutomaticLanguage());
  const t = getTexts(language);

  const isReadingLoadedRef = useRef(false);
  const isBooksLoadedRef = useRef(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const booksSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [readingDone, setReadingDone] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_READING_TIMER_SECONDS);
  const [selectedTimerSeconds, setSelectedTimerSeconds] = useState(
    DEFAULT_READING_TIMER_SECONDS
  );
  const [customMinutes, setCustomMinutes] = useState('');
  const [isCustomTimeVisible, setIsCustomTimeVisible] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerFinished, setIsTimerFinished] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const [books, setBooks] = useState<BookItem[]>([]);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');

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

      if (booksSaveTimeoutRef.current) {
        clearTimeout(booksSaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isReadingLoadedRef.current) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      persistReading();
    }, 700);
  }, [readingDone]);

  useEffect(() => {
    if (!isBooksLoadedRef.current) {
      return;
    }

    if (booksSaveTimeoutRef.current) {
      clearTimeout(booksSaveTimeoutRef.current);
    }

    booksSaveTimeoutRef.current = setTimeout(() => {
      persistBooks();
    }, 500);
  }, [books]);

  useEffect(() => {
    if (!isTimerRunning) {
      return;
    }

    const interval = setInterval(() => {
      setTimerSeconds((previousSeconds) => {
        if (previousSeconds <= 1) {
          clearInterval(interval);
          setIsTimerRunning(false);
          setIsTimerFinished(true);
          return 0;
        }

        return previousSeconds - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const loadScreenData = async () => {
    try {
      isReadingLoadedRef.current = false;
      isBooksLoadedRef.current = false;

      await loadLanguage();
      await loadTodayEntry();
      await loadBooks();

      setTimeout(() => {
        isReadingLoadedRef.current = true;
        isBooksLoadedRef.current = true;
      }, 0);
    } catch (error) {
      isReadingLoadedRef.current = true;
      isBooksLoadedRef.current = true;
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

  const loadTodayEntry = async () => {
    const savedEntry = await AsyncStorage.getItem(getTodayKey());

    if (!savedEntry) {
      return;
    }

    const parsedEntry: DayEntry = JSON.parse(savedEntry);

    setReadingDone(parsedEntry.readingDone || false);
  };

  const loadBooks = async () => {
    const booksRaw = await AsyncStorage.getItem(BOOKS_STORAGE_KEY);
    const savedBooks: BookItem[] = booksRaw ? JSON.parse(booksRaw) : [];

    setBooks(savedBooks);
  };

  const persistBooks = async () => {
    try {
      await AsyncStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books));
    } catch (error) {
      return;
    }
  };

  const selectTimerDuration = (seconds: number) => {
    setIsTimerRunning(false);
    setIsTimerFinished(false);
    setSelectedTimerSeconds(seconds);
    setTimerSeconds(seconds);
    setIsCustomTimeVisible(false);
  };

  const applyCustomTimer = () => {
    const minutes = normalizeMinutes(customMinutes);

    if (!minutes) {
      return;
    }

    selectTimerDuration(minutes * 60);
    setCustomMinutes('');
  };

  const resetReadingTimer = () => {
    setIsTimerRunning(false);
    setIsTimerFinished(false);
    setTimerSeconds(selectedTimerSeconds);
  };

  const confirmReadingDone = () => {
    setReadingDone(true);
    setIsTimerFinished(false);
    setSavedMessage(t.counted);
    setTimeout(() => setSavedMessage(''), 2500);
  };

  const dismissTimerFinished = () => {
    setIsTimerFinished(false);
  };

  const persistReading = async () => {
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
    } catch (error) {
      return;
    }
  };

  const addBook = () => {
    const trimmedTitle = bookTitle.trim();
    const trimmedAuthor = bookAuthor.trim();

    if (!trimmedTitle) {
      Alert.alert(t.error, t.bookTitleRequired);
      return;
    }

    const nextBook: BookItem = {
      id: `${Date.now()}`,
      title: trimmedTitle,
      author: trimmedAuthor,
      status: 'want',
      createdAt: new Date().toISOString(),
    };

    setBooks([nextBook, ...books]);
    setBookTitle('');
    setBookAuthor('');

    setSavedMessage(t.bookSaved);
    setTimeout(() => setSavedMessage(''), 2500);
  };

  const updateBookStatus = (bookId: string, status: BookStatus) => {
    setBooks((currentBooks) =>
      currentBooks.map((book) =>
        book.id === bookId
          ? {
              ...book,
              status,
            }
          : book
      )
    );
  };

  const deleteBook = (bookId: string) => {
    setBooks((currentBooks) => currentBooks.filter((book) => book.id !== bookId));
  };

  const getBookStatusLabel = (status: BookStatus) => {
    if (status === 'reading') {
      return t.readingNow;
    }

    if (status === 'done') {
      return t.finished;
    }

    return t.wantToRead;
  };

  const renderTimerOption = (label: string, seconds: number) => {
    const isActive = selectedTimerSeconds === seconds && !isCustomTimeVisible;

    return (
      <TouchableOpacity
        style={[styles.timerOption, isActive && styles.timerOptionActive]}
        activeOpacity={0.85}
        onPress={() => selectTimerDuration(seconds)}
      >
        <Text
          style={[
            styles.timerOptionText,
            isActive && styles.timerOptionTextActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderBookStatusButton = (
    book: BookItem,
    status: BookStatus,
    label: string
  ) => {
    const isActive = book.status === status;

    return (
      <TouchableOpacity
        style={[styles.bookStatusButton, isActive && styles.bookStatusButtonActive]}
        activeOpacity={0.85}
        onPress={() => updateBookStatus(book.id, status)}
      >
        <Text
          style={[
            styles.bookStatusButtonText,
            isActive && styles.bookStatusButtonTextActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
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

          <View style={styles.timerOptionsRow}>
            {renderTimerOption(t.fiveMinutes, 5 * 60)}
            {renderTimerOption(t.tenMinutes, 10 * 60)}
            {renderTimerOption(t.fifteenMinutes, 15 * 60)}

            <TouchableOpacity
              style={[
                styles.timerOption,
                isCustomTimeVisible && styles.timerOptionActive,
              ]}
              activeOpacity={0.85}
              onPress={() => {
                setIsTimerRunning(false);
                setIsTimerFinished(false);
                setIsCustomTimeVisible(!isCustomTimeVisible);
              }}
            >
              <Text
                style={[
                  styles.timerOptionText,
                  isCustomTimeVisible && styles.timerOptionTextActive,
                ]}
              >
                {t.customTime}
              </Text>
            </TouchableOpacity>
          </View>

          {isCustomTimeVisible ? (
            <View style={styles.customTimerBox}>
              <Text style={styles.customTimerTitle}>{t.customTimeTitle}</Text>

              <TextInput
                style={styles.customTimerInput}
                placeholder={t.customTimePlaceholder}
                placeholderTextColor={colors.mutedText}
                keyboardType="number-pad"
                value={customMinutes}
                onChangeText={setCustomMinutes}
              />

              <TouchableOpacity
                style={styles.customTimerButton}
                activeOpacity={0.85}
                onPress={applyCustomTimer}
              >
                <Text style={styles.customTimerButtonText}>{t.applyCustomTime}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

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

                setIsTimerFinished(false);
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

        {isTimerFinished ? (
          <View style={styles.finishCard}>
            <Text style={styles.finishTitle}>{t.timerFinishedTitle}</Text>
            <Text style={styles.finishText}>{t.timerFinishedText}</Text>

            <TouchableOpacity
              style={styles.finishPrimaryButton}
              activeOpacity={0.85}
              onPress={confirmReadingDone}
            >
              <Text style={styles.finishPrimaryButtonText}>
                {t.confirmReading}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.finishSecondaryButton}
              activeOpacity={0.85}
              onPress={dismissTimerFinished}
            >
              <Text style={styles.finishSecondaryButtonText}>{t.notNow}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>{t.todayStatusTitle}</Text>

          <Text
            style={[
              styles.statusText,
              readingDone && styles.statusTextDone,
            ]}
          >
            {readingDone ? t.todayStatusDone : t.todayStatusEmpty}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.booksTitle}</Text>
          <Text style={styles.cardText}>{t.booksText}</Text>

          <View style={styles.addBookBox}>
            <Text style={styles.addBookTitle}>{t.addBookTitle}</Text>

            <TextInput
              style={styles.input}
              placeholder={t.bookTitlePlaceholder}
              placeholderTextColor={colors.mutedText}
              value={bookTitle}
              onChangeText={setBookTitle}
            />

            <TextInput
              style={styles.input}
              placeholder={t.bookAuthorPlaceholder}
              placeholderTextColor={colors.mutedText}
              value={bookAuthor}
              onChangeText={setBookAuthor}
            />

            <TouchableOpacity
              style={styles.addBookButton}
              activeOpacity={0.85}
              onPress={addBook}
            >
              <Text style={styles.addBookButtonText}>{t.addBook}</Text>
            </TouchableOpacity>
          </View>

          {books.length === 0 ? (
            <View style={styles.emptyBooksBox}>
              <Text style={styles.emptyBooksTitle}>{t.emptyBooksTitle}</Text>
              <Text style={styles.emptyBooksText}>{t.emptyBooksText}</Text>
            </View>
          ) : (
            books.map((book) => (
              <View key={book.id} style={styles.bookCard}>
                <View style={styles.bookHeader}>
                  <View style={styles.bookTextBlock}>
                    <Text style={styles.bookTitle}>{book.title}</Text>

                    {book.author ? (
                      <Text style={styles.bookAuthor}>{book.author}</Text>
                    ) : null}
                  </View>

                  <Text style={styles.bookStatus}>
                    {getBookStatusLabel(book.status)}
                  </Text>
                </View>

                <View style={styles.bookStatusesRow}>
                  {renderBookStatusButton(book, 'want', t.wantToRead)}
                  {renderBookStatusButton(book, 'reading', t.readingNow)}
                  {renderBookStatusButton(book, 'done', t.finished)}
                </View>

                <TouchableOpacity
                  style={styles.deleteBookButton}
                  activeOpacity={0.85}
                  onPress={() => deleteBook(book.id)}
                >
                  <Text style={styles.deleteBookButtonText}>{t.deleteBook}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {savedMessage ? (
          <Text style={styles.savedMessage}>{savedMessage}</Text>
        ) : null}
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
  timerOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  timerOption: {
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timerOptionActive: {
    backgroundColor: colors.hunterGreen,
    borderColor: colors.hunterGreen,
  },
  timerOptionText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.deepBrown,
  },
  timerOptionTextActive: {
    color: colors.surface,
  },
  customTimerBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  customTimerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 8,
  },
  customTimerInput: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.deepBrown,
    marginBottom: 10,
  },
  customTimerButton: {
    backgroundColor: colors.sand,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  customTimerButtonText: {
    color: colors.deepBrown,
    fontSize: 15,
    fontWeight: '900',
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
  finishCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.sageGreen,
  },
  finishTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: colors.hunterGreen,
    marginBottom: 8,
  },
  finishText: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 22,
    marginBottom: 14,
  },
  finishPrimaryButton: {
    backgroundColor: colors.hunterGreen,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  finishPrimaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '900',
  },
  finishSecondaryButton: {
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  finishSecondaryButtonText: {
    color: colors.deepBrown,
    fontSize: 16,
    fontWeight: '900',
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 22,
  },
  statusTextDone: {
    color: colors.oliveGreen,
    fontWeight: '800',
  },
  addBookBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  addBookTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.deepBrown,
    marginBottom: 10,
  },
  addBookButton: {
    backgroundColor: colors.sand,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addBookButtonText: {
    color: colors.deepBrown,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyBooksBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyBooksTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 5,
  },
  emptyBooksText: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
  },
  bookCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookTextBlock: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.deepBrown,
    lineHeight: 22,
  },
  bookAuthor: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
    marginTop: 3,
  },
  bookStatus: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.hunterGreen,
    textAlign: 'right',
  },
  bookStatusesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  bookStatusButton: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookStatusButtonActive: {
    backgroundColor: colors.hunterGreen,
    borderColor: colors.hunterGreen,
  },
  bookStatusButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.deepBrown,
  },
  bookStatusButtonTextActive: {
    color: colors.surface,
  },
  deleteBookButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.softRed,
  },
  deleteBookButtonText: {
    fontSize: 13,
    fontWeight: '900',
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