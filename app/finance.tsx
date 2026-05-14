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
  sand: '#C9A978',
  caramel: '#B9783F',
  deepBrown: '#4A2E1F',
  mutedText: '#7A6A58',
  border: '#E3D6C3',
  softRed: '#B85C4B',
};

const FINANCE_SETTINGS_STORAGE_KEY = 'soft-day-finance-settings';

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

type FinanceSettings = {
  accountBalance: string;
  dailyLimit: string;
  monthlyIncome: string;
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

const sumMoneyValues = (values: Array<string | undefined>) => {
  return values.reduce((sum, value) => sum + normalizeNumber(value), 0);
};

const formatMoney = (value: number, language: AppLanguage) => {
  return `${Math.round(value).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')} ₽`;
};

const getTexts = (language: AppLanguage) => {
  if (language === 'en') {
    return {
      back: '← Back',
      title: 'Finance',
      subtitle: 'A calm place for money, limits, and daily spending.',
      settingsTitle: 'Money guide',
      accountBalance: 'On account',
      accountBalancePlaceholder: 'For example, 245000',
      dailyLimit: 'Daily spending limit',
      dailyLimitPlaceholder: 'For example, 2300',
      monthlyIncome: 'Monthly income',
      monthlyIncomePlaceholder: 'For example, 510000',

      todayTitle: 'Today',
      income: 'Income',
      expenses: 'Expenses',
      dayBalance: 'Daily balance',
      spentToday: 'Spent today',
      leftToday: 'Left for today',
      overLimit: 'Above today’s limit',
      inLimit: 'The day is within a comfortable limit 🌿',
      noLimit: 'You can set a daily limit above.',
      overLimitText: 'Above the limit, just noted. No drama.',

      salary: 'Salary',
      studio: 'Studio',
      extraIncome: 'Extra income',
      cashback: 'Refunds / cashback',

      groceries: 'Groceries',
      cafeDelivery: 'Cafe / delivery',
      home: 'Home / household',
      beauty: 'Beauty',
      clothes: 'Clothes',
      health: 'Health',
      transport: 'Transport',
      entertainment: 'Entertainment',
      pet: 'Pet',
      gifts: 'Gifts',
      education: 'Education',
      subscriptions: 'Subscriptions',
      travel: 'Travel',
      studioExpenses: 'Studio',
      other: 'Other',

      customCategory: 'Custom category',
      customCategoryName: 'Category name',
      customCategoryNamePlaceholder: 'For example, Utilities',
      customCategoryAmount: 'Amount',
      customCategoryAmountPlaceholder: 'For example, 8000',
      customCategoryHint:
        'For anything personal: mortgage, credit card, utilities, obligations, or any one-off spending.',

      error: 'Error',
      loadError: 'Could not load finance',
      softHint:
        'This is not about judging spending. It is just a gentle way to see the day clearly.',
    };
  }

  return {
    back: '← Назад',
    title: 'Финансы',
    subtitle: 'Спокойное место для денег, лимитов и расходов за день.',
    settingsTitle: 'Денежный ориентир',
    accountBalance: 'На счету',
    accountBalancePlaceholder: 'Например, 245000',
    dailyLimit: 'Лимит на день',
    dailyLimitPlaceholder: 'Например, 2300',
    monthlyIncome: 'Доход в месяц',
    monthlyIncomePlaceholder: 'Например, 510000',

    todayTitle: 'Сегодня',
    income: 'Доходы',
    expenses: 'Расходы',
    dayBalance: 'Баланс дня',
    spentToday: 'Потрачено сегодня',
    leftToday: 'Осталось на сегодня',
    overLimit: 'Выше лимита на день',
    inLimit: 'День пока в комфортном лимите 🌿',
    noLimit: 'Можно задать дневной лимит выше.',
    overLimitText: 'Выше лимита, просто отметили. Без драмы.',

    salary: 'ЗП',
    studio: 'Студия',
    extraIncome: 'Доп. доход',
    cashback: 'Возвраты / кэшбек',

    groceries: 'Продукты',
    cafeDelivery: 'Кафе / доставка',
    home: 'Дом / быт',
    beauty: 'Красота',
    clothes: 'Одежда',
    health: 'Здоровье',
    transport: 'Транспорт',
    entertainment: 'Развлечения',
    pet: 'Питомец',
    gifts: 'Подарки',
    education: 'Обучение',
    subscriptions: 'Подписки',
    travel: 'Путешествия',
    studioExpenses: 'Студия',
    other: 'Другое',

    customCategory: 'Своя категория',
    customCategoryName: 'Название категории',
    customCategoryNamePlaceholder: 'Например, коммуналка',
    customCategoryAmount: 'Сумма',
    customCategoryAmountPlaceholder: 'Например, 8000',
    customCategoryHint:
      'Для всего личного: ипотека, кредитка, коммуналка, обязательства или разовая трата.',

    error: 'Ошибка',
    loadError: 'Не получилось загрузить финансы',
    softHint:
      'Это не контроль и не оценка трат. Просто мягкий способ видеть день яснее.',
  };
};

export default function FinanceScreen() {
  const router = useRouter();

  const [language, setLanguage] = useState<AppLanguage>(getAutomaticLanguage());
  const t = getTexts(language);

  const isFinanceLoadedRef = useRef(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [accountBalance, setAccountBalance] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');

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
  const [expenseTravel, setExpenseTravel] = useState('');
  const [expenseStudio, setExpenseStudio] = useState('');
  const [expenseOther, setExpenseOther] = useState('');

  const [customExpenseName, setCustomExpenseName] = useState('');
  const [customExpenseAmount, setCustomExpenseAmount] = useState('');

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
    expenseTravel,
    expenseStudio,
    expenseOther,
    customExpenseAmount,
  ]);

  const dayBalance = totalIncome - totalExpenses;
  const dailyLimitNumber = normalizeNumber(dailyLimit);
  const leftToday = dailyLimitNumber - totalExpenses;
  const hasDailyLimit = dailyLimitNumber > 0;
  const isOverLimit = hasDailyLimit && totalExpenses > dailyLimitNumber;

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
    if (!isFinanceLoadedRef.current) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      persistFinance();
    }, 700);
  }, [
    accountBalance,
    dailyLimit,
    monthlyIncome,
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
    expenseTravel,
    expenseStudio,
    expenseOther,
    customExpenseName,
    customExpenseAmount,
  ]);

  const loadScreenData = async () => {
    try {
      isFinanceLoadedRef.current = false;

      await loadLanguage();
      await loadFinanceSettings();
      await loadTodayEntry();

      setTimeout(() => {
        isFinanceLoadedRef.current = true;
      }, 0);
    } catch (error) {
      isFinanceLoadedRef.current = true;
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

  const loadFinanceSettings = async () => {
    const settingsRaw = await AsyncStorage.getItem(FINANCE_SETTINGS_STORAGE_KEY);

    if (!settingsRaw) {
      return;
    }

    const settings: FinanceSettings = JSON.parse(settingsRaw);

    setAccountBalance(settings.accountBalance || '');
    setDailyLimit(settings.dailyLimit || '');
    setMonthlyIncome(settings.monthlyIncome || '');
  };

  const loadTodayEntry = async () => {
    const savedEntry = await AsyncStorage.getItem(getTodayKey());

    if (!savedEntry) {
      return;
    }

    const parsedEntry: DayEntry = JSON.parse(savedEntry);

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
    setExpenseTravel(parsedEntry.expenseTravel || parsedEntry.expenseUsa || '');
    setExpenseStudio(parsedEntry.expenseStudio || '');
    setExpenseOther(parsedEntry.expenseOther || parsedEntry.expenses || '');

    setCustomExpenseName(parsedEntry.customExpenseName || '');
    setCustomExpenseAmount(parsedEntry.customExpenseAmount || '');
  };

  const persistFinance = async () => {
    try {
      const financeSettings: FinanceSettings = {
        accountBalance,
        dailyLimit,
        monthlyIncome,
      };

      await AsyncStorage.setItem(
        FINANCE_SETTINGS_STORAGE_KEY,
        JSON.stringify(financeSettings)
      );

      const savedEntry = await AsyncStorage.getItem(getTodayKey());
      const currentEntry: DayEntry = savedEntry
        ? JSON.parse(savedEntry)
        : getEmptyDayEntry();

      const updatedEntry: DayEntry = {
        ...currentEntry,
        date: getTodayDate(),

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
        expenseTravel,
        expenseUsa: '',
        expenseStudio,
        expenseOther,

        customExpenseName,
        customExpenseAmount,
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

  const renderMoneyInput = (
    label: string,
    value: string,
    setValue: (value: string) => void,
    placeholder = '0'
  ) => {
    return (
      <View style={styles.moneyRow}>
        <Text style={styles.moneyLabel}>{label}</Text>
        <TextInput
          style={styles.moneyInput}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedText}
          keyboardType="number-pad"
          value={value}
          onChangeText={setValue}
        />
      </View>
    );
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

      <Text style={styles.title}>{t.title} 💳</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.hintCard}>
        <Text style={styles.hintText}>{t.softHint}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.settingsTitle}</Text>

        {renderMoneyInput(
          t.accountBalance,
          accountBalance,
          setAccountBalance,
          t.accountBalancePlaceholder
        )}

        {renderMoneyInput(
          t.dailyLimit,
          dailyLimit,
          setDailyLimit,
          t.dailyLimitPlaceholder
        )}

        {renderMoneyInput(
          t.monthlyIncome,
          monthlyIncome,
          setMonthlyIncome,
          t.monthlyIncomePlaceholder
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.todayTitle}</Text>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.spentToday}</Text>
            <Text style={styles.expenseValue}>
              {formatMoney(totalExpenses, language)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.income}</Text>
            <Text style={styles.incomeValue}>
              {formatMoney(totalIncome, language)}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryStrongLabel}>{t.dayBalance}</Text>
            <Text
              style={[
                styles.balanceValue,
                dayBalance < 0 && styles.warningValue,
              ]}
            >
              {dayBalance >= 0 ? '+' : ''}
              {formatMoney(dayBalance, language)}
            </Text>
          </View>

          {hasDailyLimit ? (
            <View style={styles.limitBox}>
              <Text style={styles.limitLabel}>
                {isOverLimit ? t.overLimit : t.leftToday}
              </Text>

              <Text
                style={[
                  styles.limitValue,
                  isOverLimit && styles.limitValueWarning,
                ]}
              >
                {formatMoney(Math.abs(leftToday), language)}
              </Text>

              <Text style={styles.limitText}>
                {isOverLimit ? t.overLimitText : t.inLimit}
              </Text>
            </View>
          ) : (
            <View style={styles.limitBox}>
              <Text style={styles.limitText}>{t.noLimit}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.income}</Text>

        {renderMoneyInput(t.salary, incomeSalary, setIncomeSalary)}
        {renderMoneyInput(t.studio, incomeStudio, setIncomeStudio)}
        {renderMoneyInput(t.extraIncome, incomeExtra, setIncomeExtra)}
        {renderMoneyInput(t.cashback, incomeCashback, setIncomeCashback)}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.expenses}</Text>

        {renderMoneyInput(t.groceries, expenseGroceries, setExpenseGroceries)}
        {renderMoneyInput(t.cafeDelivery, expenseCafe, setExpenseCafe)}
        {renderMoneyInput(t.home, expenseHome, setExpenseHome)}
        {renderMoneyInput(t.beauty, expenseBeauty, setExpenseBeauty)}
        {renderMoneyInput(t.health, expenseHealth, setExpenseHealth)}
        {renderMoneyInput(t.transport, expenseTransport, setExpenseTransport)}
        {renderMoneyInput(t.travel, expenseTravel, setExpenseTravel)}
        {renderMoneyInput(t.subscriptions, expenseSubscriptions, setExpenseSubscriptions)}
        {renderMoneyInput(t.entertainment, expenseEntertainment, setExpenseEntertainment)}
        {renderMoneyInput(t.pet, expensePet, setExpensePet)}
        {renderMoneyInput(t.gifts, expenseGifts, setExpenseGifts)}
        {renderMoneyInput(t.education, expenseEducation, setExpenseEducation)}
        {renderMoneyInput(t.clothes, expenseClothes, setExpenseClothes)}
        {renderMoneyInput(t.studioExpenses, expenseStudio, setExpenseStudio)}
        {renderMoneyInput(t.other, expenseOther, setExpenseOther)}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.customCategory}</Text>

        <Text style={styles.cardText}>{t.customCategoryHint}</Text>

        <View style={styles.customCategoryBlock}>
          <Text style={styles.fieldLabel}>{t.customCategoryName}</Text>

          <TextInput
            style={styles.fullInput}
            placeholder={t.customCategoryNamePlaceholder}
            placeholderTextColor={colors.mutedText}
            value={customExpenseName}
            onChangeText={setCustomExpenseName}
          />

          <Text style={styles.fieldLabel}>{t.customCategoryAmount}</Text>

          <TextInput
            style={styles.fullInput}
            placeholder={t.customCategoryAmountPlaceholder}
            placeholderTextColor={colors.mutedText}
            keyboardType="number-pad"
            value={customExpenseAmount}
            onChangeText={setCustomExpenseAmount}
          />
        </View>
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
    marginBottom: 14,
  },
  cardText: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
    marginBottom: 14,
  },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  moneyLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.deepBrown,
    lineHeight: 20,
  },
  moneyInput: {
    width: 132,
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
  fullInput: {
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
  fieldLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 8,
    marginLeft: 4,
  },
  customCategoryBlock: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 15,
    color: colors.mutedText,
    flex: 1,
  },
  summaryStrongLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.deepBrown,
    flex: 1,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  incomeValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.oliveGreen,
  },
  expenseValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.deepBrown,
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.hunterGreen,
  },
  warningValue: {
    color: colors.caramel,
  },
  limitBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  limitLabel: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 4,
  },
  limitValue: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.hunterGreen,
    marginBottom: 4,
  },
  limitValueWarning: {
    color: colors.softRed,
  },
  limitText: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
  },
});