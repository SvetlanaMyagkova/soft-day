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
import {
    DEFAULT_USER_PROFILE,
    USER_PROFILE_STORAGE_KEY,
    UserProfileSettings,
} from '../constants/userProfile';

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

const getTexts = (
  language: AppLanguage,
  profile: UserProfileSettings
) => {
  const isRu = language === 'ru';
  const isMale = profile.gender === 'male';

  if (!isRu) {
    return {
      back: '← Back',
      title: 'Gratitude',
      subtitle: 'A soft place to notice what is good, even if the day is small.',
      hint: 'One simple sentence is enough.',

      gratefulQuestion: 'What are you grateful for today?',
      gratefulPlaceholder: 'For a walk, coffee, support, a calm morning…',

      goodDeedQuestion: 'What good did you do for yourself or someone else?',
      goodDeedPlaceholder: 'Called someone, helped, rested, chose yourself…',

      supportQuestion: 'What helped you keep going today?',
      supportPlaceholder: 'A person, a thought, music, sunlight, a tiny plan…',

      save: 'Save gratitude',
      saved: 'Gratitude saved',
      error: 'Error',
      saveError: 'Could not save gratitude',
      loadError: 'Could not load gratitude',

      softNote:
        'No need to write beautifully. This is not a report — it is a small support for yourself.',
    };
  }

  return {
    back: '← Назад',
    title: 'Благодарность',
    subtitle: 'Мягкое место, чтобы заметить хорошее — даже если день совсем небольшой.',
    hint: 'Одна простая фраза уже считается.',

    gratefulQuestion: isMale
      ? 'За что ты сегодня благодарен?'
      : 'За что ты сегодня благодарна?',
    gratefulPlaceholder: 'За прогулку, кофе, поддержку, спокойное утро…',

    goodDeedQuestion: isMale
      ? 'Что хорошего ты сегодня сделал для себя или других?'
      : 'Что хорошего ты сегодня сделала для себя или других?',
    goodDeedPlaceholder: 'Позвонила, помогла, отдохнула, выбрала себя…',

    supportQuestion: 'Что сегодня помогло тебе держаться?',
    supportPlaceholder: 'Человек, мысль, музыка, солнце, маленький план…',

    save: 'Сохранить благодарность',
    saved: 'Благодарность сохранена',
    error: 'Ошибка',
    saveError: 'Не получилось сохранить благодарность',
    loadError: 'Не получилось загрузить благодарность',

    softNote:
      'Не нужно писать красиво. Это не отчёт — это маленькая опора для себя.',
  };
};

export default function GratitudeScreen() {
  const router = useRouter();

  const [language, setLanguage] = useState<AppLanguage>(getAutomaticLanguage());
  const [userProfile, setUserProfile] =
    useState<UserProfileSettings>(DEFAULT_USER_PROFILE);

  const [gratitude, setGratitude] = useState('');
  const [gratitudeGoodDeed, setGratitudeGoodDeed] = useState('');
  const [gratitudeSupport, setGratitudeSupport] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const t = getTexts(language, userProfile);

  useFocusEffect(
    useCallback(() => {
      loadLanguage();
      loadUserProfile();
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

  const loadTodayEntry = async () => {
    try {
      const savedEntry = await AsyncStorage.getItem(getTodayKey());

      if (!savedEntry) {
        return;
      }

      const parsedEntry: DayEntry = JSON.parse(savedEntry);

      setGratitude(parsedEntry.gratitude || '');
      setGratitudeGoodDeed(parsedEntry.gratitudeGoodDeed || '');
      setGratitudeSupport(parsedEntry.gratitudeSupport || '');
    } catch (error) {
      Alert.alert(t.error, t.loadError);
    }
  };

  const saveGratitude = async () => {
    try {
      const savedEntry = await AsyncStorage.getItem(getTodayKey());
      const currentEntry: DayEntry = savedEntry
        ? JSON.parse(savedEntry)
        : getEmptyDayEntry();

      const updatedEntry: DayEntry = {
        ...currentEntry,
        date: getTodayDate(),
        gratitude,
        gratitudeGoodDeed,
        gratitudeSupport,
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

      <Text style={styles.title}>{t.title} 🌿</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.hintCard}>
        <Text style={styles.hintText}>{t.hint}</Text>
        <Text style={styles.softNote}>{t.softNote}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.question}>{t.gratefulQuestion}</Text>

        <TextInput
          style={styles.bigInput}
          placeholder={t.gratefulPlaceholder}
          placeholderTextColor={colors.mutedText}
          multiline
          value={gratitude}
          onChangeText={setGratitude}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.question}>{t.goodDeedQuestion}</Text>

        <TextInput
          style={styles.bigInput}
          placeholder={t.goodDeedPlaceholder}
          placeholderTextColor={colors.mutedText}
          multiline
          value={gratitudeGoodDeed}
          onChangeText={setGratitudeGoodDeed}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.question}>{t.supportQuestion}</Text>

        <TextInput
          style={styles.bigInput}
          placeholder={t.supportPlaceholder}
          placeholderTextColor={colors.mutedText}
          multiline
          value={gratitudeSupport}
          onChangeText={setGratitudeSupport}
        />
      </View>

      {savedMessage ? (
        <Text style={styles.savedMessage}>{savedMessage}</Text>
      ) : null}

      <TouchableOpacity
        style={styles.saveButton}
        activeOpacity={0.85}
        onPress={saveGratitude}
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
    fontSize: 20,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 8,
  },
  softNote: {
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
  question: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.deepBrown,
    lineHeight: 26,
    marginBottom: 12,
  },
  bigInput: {
    backgroundColor: colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.deepBrown,
    minHeight: 104,
    textAlignVertical: 'top',
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