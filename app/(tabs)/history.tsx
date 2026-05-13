import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
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
  sand: '#C9A978',
  caramel: '#B9783F',
  softRed: '#B85C4B',
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

  readingDone: boolean;
};

const texts = {
  ru: {
    title: 'История',
    subtitle: 'Здесь сохраняются твои дни Soft Day.',
    emptyTitle: 'Пока история пустая',
    emptyText: 'Заполни экран “Сегодня” и нажми “Сохранить день”.',

    error: 'Ошибка',
    done: 'Готово',
    loadError: 'Не получилось загрузить историю',
    dayUpdated: 'День обновлён',
    saveChangesError: 'Не получилось сохранить изменения',
    dayDeleted: 'День удалён',
    deleteDayError: 'Не получилось удалить день',
    deleteTitle: 'Удалить этот день?',
    deleteMessage: 'Данные за этот день пропадут из истории и графиков.',
    cancel: 'Отмена',
    delete: 'Удалить',

    edit: 'Изменить',
    save: 'Сохранить',
    deleteDay: 'Удалить день',

    weight: 'Вес',
    weightPlaceholder: 'Например, 68.6',
    kg: 'кг',

    calories: 'Калории',
    caloriesPlaceholder: 'Сколько ккал съела',
    kcal: 'ккал',

    steps: 'Шаги',
    stepsPlaceholder: 'Сколько шагов прошла',

    workoutName: 'Тренировка',
    workoutNamePlaceholder: 'Например, пилатес 50 минут',

    workoutCalories: 'Активные ккал тренировки',
    workoutCaloriesPlaceholder: 'Например, 250',

    foodNote: 'Что ела',
    foodNotePlaceholder: 'Например: завтрак, кофе, ужин',

    gratitude: 'Благодарность',
    gratitudePlaceholder: 'За что сегодня благодарна?',

    income: 'Доходы',
    expenses: 'Расходы',
    dayBalance: 'Баланс дня',

    hideFinance: 'Скрыть финансы',
    editFinance: 'Редактировать финансы',

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
    usa: 'США 🇺🇸',
    studioExpenses: 'Студия',
    other: 'Другое',

    foodTracked: 'Еду записывала',
    caloriesTracked: 'Калории считала',
    stepsDone: 'Шаги внесены',
    workoutDone: 'Тренировка была',
    readingDone: 'Чтение выполнено',

    food: 'Еда',
    nutritionShort: 'КБЖУ',
    tenKSteps: 'Шаги',
    workout: 'Тренировка',
    reading: 'Чтение',
  },

  en: {
    title: 'History',
    subtitle: 'Your saved Soft Day entries live here.',
    emptyTitle: 'History is empty',
    emptyText: 'Fill in Today and tap “Save day”.',

    error: 'Error',
    done: 'Done',
    loadError: 'Could not load history',
    dayUpdated: 'Day updated',
    saveChangesError: 'Could not save changes',
    dayDeleted: 'Day deleted',
    deleteDayError: 'Could not delete the day',
    deleteTitle: 'Delete this day?',
    deleteMessage: 'This day will disappear from history and charts.',
    cancel: 'Cancel',
    delete: 'Delete',

    edit: 'Edit',
    save: 'Save',
    deleteDay: 'Delete day',

    weight: 'Weight',
    weightPlaceholder: 'For example, 68.6',
    kg: 'kg',

    calories: 'Calories',
    caloriesPlaceholder: 'How many kcal you ate',
    kcal: 'kcal',

    steps: 'Steps',
    stepsPlaceholder: 'How many steps you walked',

    workoutName: 'Workout',
    workoutNamePlaceholder: 'For example, Pilates 50 min',

    workoutCalories: 'Active workout calories',
    workoutCaloriesPlaceholder: 'For example, 250',

    foodNote: 'Food note',
    foodNotePlaceholder: 'For example: breakfast, coffee, dinner',

    gratitude: 'Gratitude',
    gratitudePlaceholder: 'What are you grateful for today?',

    income: 'Income',
    expenses: 'Expenses',
    dayBalance: 'Daily balance',

    hideFinance: 'Hide finance',
    editFinance: 'Edit finance',

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
    usa: 'USA 🇺🇸',
    studioExpenses: 'Studio',
    other: 'Other',

    foodTracked: 'Food logged',
    caloriesTracked: 'Calories counted',
    stepsDone: 'Steps logged',
    workoutDone: 'Workout completed',
    readingDone: 'Reading completed',

    food: 'Food',
    nutritionShort: 'Nutrition',
    tenKSteps: 'Steps',
    workout: 'Workout',
    reading: 'Reading',
  },
};

const getDayKey = (date: string) => {
  return `soft-day-${date}`;
};

const normalizeNumber = (value: string | undefined) => {
  if (!value) {
    return 0;
  }

  const number = Number(value.replace(',', '.'));

  return Number.isFinite(number) ? number : 0;
};

const sumMoneyValues = (values: Array<string | undefined>) => {
  return values.reduce((sum, value) => sum + normalizeNumber(value), 0);
};

const renderStatus = (value: boolean) => {
  return value ? '✅' : '—';
};

const formatDate = (date: string, language: AppLanguage) => {
  return new Date(date).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  });
};

const formatMoney = (value: number, language: AppLanguage) => {
  return `${Math.round(value).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')} ₽`;
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

export default function HistoryScreen() {
  const [language, setLanguage] = useState<AppLanguage>(getAutomaticLanguage());
  const t = texts[language];

  const [history, setHistory] = useState<DayEntry[]>([]);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [draft, setDraft] = useState<DayEntry | null>(null);
  const [isFinanceEditing, setIsFinanceEditing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadLanguage();
      loadHistory();
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
    try {
      const historyRaw = await AsyncStorage.getItem('soft-day-history');
      const parsedHistory: DayEntry[] = historyRaw ? JSON.parse(historyRaw) : [];

      setHistory(parsedHistory);
    } catch (error) {
      Alert.alert(t.error, t.loadError);
    }
  };

  const startEditing = (day: DayEntry) => {
    setEditingDate(day.date);
    setDraft({
      ...day,
      workoutName: day.workoutName || '',
      workoutCalories: day.workoutCalories || '',
    });
    setIsFinanceEditing(false);
  };

  const cancelEditing = () => {
    setEditingDate(null);
    setDraft(null);
    setIsFinanceEditing(false);
  };

  const updateDraftField = <K extends keyof DayEntry>(
    field: K,
    value: DayEntry[K]
  ) => {
    if (!draft) {
      return;
    }

    setDraft({
      ...draft,
      [field]: value,
    });
  };

  const saveEditedDay = async () => {
    if (!draft) {
      return;
    }

    try {
      const totalIncome = getTotalIncome(draft);
      const totalExpenses = getTotalExpenses(draft);

      const updatedDraft: DayEntry = {
        ...draft,
        income: String(totalIncome || ''),
        expenses: String(totalExpenses || ''),
      };

      const updatedHistory = history.map((day) =>
        day.date === updatedDraft.date ? updatedDraft : day
      );

      await AsyncStorage.setItem('soft-day-history', JSON.stringify(updatedHistory));
      await AsyncStorage.setItem(getDayKey(updatedDraft.date), JSON.stringify(updatedDraft));

      setHistory(updatedHistory);
      setEditingDate(null);
      setDraft(null);
      setIsFinanceEditing(false);

      Alert.alert(t.done, t.dayUpdated);
    } catch (error) {
      Alert.alert(t.error, t.saveChangesError);
    }
  };

  const deleteDay = async (date: string) => {
    try {
      const updatedHistory = history.filter((day) => day.date !== date);

      await AsyncStorage.setItem('soft-day-history', JSON.stringify(updatedHistory));
      await AsyncStorage.removeItem(getDayKey(date));

      setHistory(updatedHistory);
      setEditingDate(null);
      setDraft(null);
      setIsFinanceEditing(false);

      Alert.alert(t.done, t.dayDeleted);
    } catch (error) {
      Alert.alert(t.error, t.deleteDayError);
    }
  };

  const confirmDeleteDay = (date: string) => {
    Alert.alert(t.deleteTitle, t.deleteMessage, [
      {
        text: t.cancel,
        style: 'cancel',
      },
      {
        text: t.delete,
        style: 'destructive',
        onPress: () => deleteDay(date),
      },
    ]);
  };

  const toggleDraftBoolean = (field: keyof DayEntry) => {
    if (!draft) {
      return;
    }

    const currentValue = draft[field];

    if (typeof currentValue !== 'boolean') {
      return;
    }

    setDraft({
      ...draft,
      [field]: !currentValue,
    });
  };

  const renderCheckbox = (label: string, field: keyof DayEntry) => {
    if (!draft) {
      return null;
    }

    const value = draft[field];

    if (typeof value !== 'boolean') {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.checkRow}
        onPress={() => toggleDraftBoolean(field)}
        activeOpacity={0.8}
      >
        <View style={[styles.checkbox, value && styles.checkboxChecked]}>
          {value && <Text style={styles.checkMark}>✓</Text>}
        </View>
        <Text style={styles.checkText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderLabeledInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    multiline = false,
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
    multiline?: boolean;
  }) => {
    return (
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          style={[styles.input, multiline && styles.bigInput]}
          placeholder={placeholder || label}
          placeholderTextColor={colors.mutedText}
          keyboardType={keyboardType}
          multiline={multiline}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    );
  };

  const incomeFields = draft
    ? [
        { label: t.salary, field: 'incomeSalary' as keyof DayEntry },
        { label: t.studio, field: 'incomeStudio' as keyof DayEntry },
        { label: t.extraIncome, field: 'incomeExtra' as keyof DayEntry },
        { label: t.cashback, field: 'incomeCashback' as keyof DayEntry },
      ]
    : [];

  const expenseFields = draft
    ? [
        { label: t.groceries, field: 'expenseGroceries' as keyof DayEntry },
        { label: t.cafeDelivery, field: 'expenseCafe' as keyof DayEntry },
        { label: t.home, field: 'expenseHome' as keyof DayEntry },
        { label: t.beauty, field: 'expenseBeauty' as keyof DayEntry },
        { label: t.clothes, field: 'expenseClothes' as keyof DayEntry },
        { label: t.health, field: 'expenseHealth' as keyof DayEntry },
        { label: t.transport, field: 'expenseTransport' as keyof DayEntry },
        { label: t.entertainment, field: 'expenseEntertainment' as keyof DayEntry },
        { label: t.pet, field: 'expensePet' as keyof DayEntry },
        { label: t.gifts, field: 'expenseGifts' as keyof DayEntry },
        { label: t.education, field: 'expenseEducation' as keyof DayEntry },
        { label: t.subscriptions, field: 'expenseSubscriptions' as keyof DayEntry },
        { label: t.usa, field: 'expenseUsa' as keyof DayEntry },
        { label: t.studioExpenses, field: 'expenseStudio' as keyof DayEntry },
        { label: t.other, field: 'expenseOther' as keyof DayEntry },
      ]
    : [];

  const renderMoneyInput = (label: string, field: keyof DayEntry) => {
    if (!draft) {
      return null;
    }

    const value = draft[field];

    return (
      <View key={String(field)} style={styles.moneyRow}>
        <Text style={styles.moneyLabel}>{label}</Text>
        <TextInput
          style={styles.moneyInput}
          placeholder="0"
          placeholderTextColor={colors.mutedText}
          keyboardType="number-pad"
          value={typeof value === 'string' ? value : ''}
          onChangeText={(newValue) => updateDraftField(field, newValue as never)}
        />
      </View>
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      {history.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.emptyTitle}</Text>
          <Text style={styles.cardText}>{t.emptyText}</Text>
        </View>
      ) : (
        history.map((day) => {
          const isEditing = editingDate === day.date && draft;
          const activeDay = isEditing ? draft : day;
          const totalIncome = getTotalIncome(activeDay);
          const totalExpenses = getTotalExpenses(activeDay);
          const dayBalance = totalIncome - totalExpenses;

          return (
            <View key={day.date} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.date}>{formatDate(day.date, language)}</Text>

                {!isEditing ? (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => startEditing(day)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.editButtonText}>{t.edit}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {isEditing ? (
                <>
                  {renderLabeledInput({
                    label: t.weight,
                    value: draft.weight,
                    placeholder: t.weightPlaceholder,
                    keyboardType: 'decimal-pad',
                    onChangeText: (value) => updateDraftField('weight', value),
                  })}

                  {renderLabeledInput({
                    label: t.calories,
                    value: draft.calories,
                    placeholder: t.caloriesPlaceholder,
                    keyboardType: 'number-pad',
                    onChangeText: (value) => updateDraftField('calories', value),
                  })}

                  {renderLabeledInput({
                    label: t.steps,
                    value: draft.steps,
                    placeholder: t.stepsPlaceholder,
                    keyboardType: 'number-pad',
                    onChangeText: (value) => updateDraftField('steps', value),
                  })}

                  {renderLabeledInput({
                    label: t.workoutName,
                    value: draft.workoutName || '',
                    placeholder: t.workoutNamePlaceholder,
                    onChangeText: (value) => updateDraftField('workoutName', value),
                  })}

                  {renderLabeledInput({
                    label: t.workoutCalories,
                    value: draft.workoutCalories || '',
                    placeholder: t.workoutCaloriesPlaceholder,
                    keyboardType: 'number-pad',
                    onChangeText: (value) => updateDraftField('workoutCalories', value),
                  })}

                  {renderLabeledInput({
                    label: t.foodNote,
                    value: draft.foodNote,
                    placeholder: t.foodNotePlaceholder,
                    multiline: true,
                    onChangeText: (value) => updateDraftField('foodNote', value),
                  })}

                  {renderLabeledInput({
                    label: t.gratitude,
                    value: draft.gratitude,
                    placeholder: t.gratitudePlaceholder,
                    multiline: true,
                    onChangeText: (value) => updateDraftField('gratitude', value),
                  })}

                  <View style={styles.financeSummary}>
                    <View style={styles.financeSummaryRow}>
                      <Text style={styles.financeLabel}>{t.income}</Text>
                      <Text style={styles.financeIncome}>
                        {formatMoney(totalIncome, language)}
                      </Text>
                    </View>

                    <View style={styles.financeSummaryRow}>
                      <Text style={styles.financeLabel}>{t.expenses}</Text>
                      <Text style={styles.financeExpense}>
                        {formatMoney(totalExpenses, language)}
                      </Text>
                    </View>

                    <View style={styles.financeDivider} />

                    <View style={styles.financeSummaryRow}>
                      <Text style={styles.financeBalanceLabel}>{t.dayBalance}</Text>
                      <Text
                        style={[
                          styles.financeBalance,
                          dayBalance < 0 && styles.financeBalanceNegative,
                        ]}
                      >
                        {dayBalance >= 0 ? '+' : ''}
                        {formatMoney(dayBalance, language)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.financeToggleButton}
                    onPress={() => setIsFinanceEditing(!isFinanceEditing)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.financeToggleButtonText}>
                      {isFinanceEditing ? t.hideFinance : t.editFinance}
                    </Text>
                  </TouchableOpacity>

                  {isFinanceEditing ? (
                    <View style={styles.financeEditBlock}>
                      <Text style={styles.financeSectionTitle}>{t.income}</Text>
                      {incomeFields.map((item) => renderMoneyInput(item.label, item.field))}

                      <Text style={styles.financeSectionTitle}>{t.expenses}</Text>
                      {expenseFields.map((item) => renderMoneyInput(item.label, item.field))}
                    </View>
                  ) : null}

                  {renderCheckbox(t.foodTracked, 'foodTracked')}
                  {renderCheckbox(t.caloriesTracked, 'caloriesTracked')}
                  {renderCheckbox(t.stepsDone, 'stepsDone')}
                  {renderCheckbox(t.workoutDone, 'workoutDone')}
                  {renderCheckbox(t.readingDone, 'readingDone')}

                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={saveEditedDay}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.saveButtonText}>{t.save}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={cancelEditing}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => confirmDeleteDay(day.date)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.deleteButtonText}>{t.deleteDay}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.row}>
                    <Text style={styles.label}>{t.weight}</Text>
                    <Text style={styles.value}>
                      {day.weight ? `${day.weight} ${t.kg}` : '—'}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>{t.calories}</Text>
                    <Text style={styles.value}>
                      {day.calories ? `${day.calories} ${t.kcal}` : '—'}
                    </Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>{t.steps}</Text>
                    <Text style={styles.value}>{day.steps || '—'}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>{t.workoutName}</Text>
                    <Text style={styles.value}>{day.workoutName || '—'}</Text>
                  </View>

                  <View style={styles.row}>
                    <Text style={styles.label}>{t.workoutCalories}</Text>
                    <Text style={styles.value}>
                      {day.workoutCalories ? `${day.workoutCalories} ${t.kcal}` : '—'}
                    </Text>
                  </View>

                  <View style={styles.financeSummary}>
                    <View style={styles.financeSummaryRow}>
                      <Text style={styles.financeLabel}>{t.income}</Text>
                      <Text style={styles.financeIncome}>
                        {formatMoney(totalIncome, language)}
                      </Text>
                    </View>

                    <View style={styles.financeSummaryRow}>
                      <Text style={styles.financeLabel}>{t.expenses}</Text>
                      <Text style={styles.financeExpense}>
                        {formatMoney(totalExpenses, language)}
                      </Text>
                    </View>

                    <View style={styles.financeDivider} />

                    <View style={styles.financeSummaryRow}>
                      <Text style={styles.financeBalanceLabel}>{t.dayBalance}</Text>
                      <Text
                        style={[
                          styles.financeBalance,
                          dayBalance < 0 && styles.financeBalanceNegative,
                        ]}
                      >
                        {dayBalance >= 0 ? '+' : ''}
                        {formatMoney(dayBalance, language)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.habitsRow}>
                    <Text style={styles.habit}>{t.food} {renderStatus(day.foodTracked)}</Text>
                    <Text style={styles.habit}>{t.nutritionShort} {renderStatus(day.caloriesTracked)}</Text>
                  </View>

                  <View style={styles.habitsRow}>
                    <Text style={styles.habit}>{t.tenKSteps} {renderStatus(day.stepsDone)}</Text>
                    <Text style={styles.habit}>{t.workout} {renderStatus(day.workoutDone)}</Text>
                  </View>

                  <View style={styles.habitsRow}>
                    <Text style={styles.habit}>{t.reading} {renderStatus(day.readingDone)}</Text>
                  </View>

                  {day.foodNote ? (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteTitle}>{t.food}</Text>
                      <Text style={styles.noteText}>{day.foodNote}</Text>
                    </View>
                  ) : null}

                  {day.gratitude ? (
                    <View style={styles.gratitudeBox}>
                      <Text style={styles.gratitudeTitle}>{t.gratitude}</Text>
                      <Text style={styles.gratitudeText}>{day.gratitude}</Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          );
        })
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.deepBrown,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    color: colors.mutedText,
    lineHeight: 22,
  },
  date: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.deepBrown,
    flex: 1,
    textTransform: 'capitalize',
  },
  editButton: {
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editButtonText: {
    color: colors.hunterGreen,
    fontSize: 14,
    fontWeight: '800',
  },
  fieldBlock: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.deepBrown,
    marginBottom: 6,
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
  },
  bigInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  label: {
    fontSize: 16,
    color: colors.mutedText,
    flex: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.deepBrown,
    textAlign: 'right',
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  financeSummary: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
    marginBottom: 12,
  },
  financeSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
    gap: 12,
  },
  financeLabel: {
    fontSize: 16,
    color: colors.mutedText,
  },
  financeIncome: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.oliveGreen,
  },
  financeExpense: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.deepBrown,
  },
  financeDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  financeBalanceLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.deepBrown,
  },
  financeBalance: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.hunterGreen,
  },
  financeBalanceNegative: {
    color: colors.caramel,
  },
  financeToggleButton: {
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  financeToggleButtonText: {
    color: colors.hunterGreen,
    fontSize: 15,
    fontWeight: '800',
  },
  financeEditBlock: {
    marginBottom: 12,
  },
  financeSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.deepBrown,
    marginTop: 8,
    marginBottom: 10,
  },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  moneyLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.deepBrown,
  },
  moneyInput: {
    width: 120,
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
  habitsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  habit: {
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.deepBrown,
    overflow: 'hidden',
  },
  noteBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.oliveGreen,
    marginBottom: 6,
  },
  noteText: {
    fontSize: 15,
    color: colors.deepBrown,
    lineHeight: 21,
  },
  gratitudeBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
  },
  gratitudeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.oliveGreen,
    marginBottom: 6,
  },
  gratitudeText: {
    fontSize: 15,
    color: colors.deepBrown,
    lineHeight: 21,
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
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.hunterGreen,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.deepBrown,
    fontSize: 16,
    fontWeight: '800',
  },
  deleteButton: {
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.softRed,
    marginTop: 12,
  },
  deleteButtonText: {
    color: colors.softRed,
    fontSize: 16,
    fontWeight: '900',
  },
});