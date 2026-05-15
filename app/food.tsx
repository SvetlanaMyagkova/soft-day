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
  FOOD_DICTIONARY,
  FoodDictionaryItem,
  QUICK_PRODUCTS_EN,
  QUICK_PRODUCTS_RU,
} from '../constants/foodDictionary';

const colors = {
  background: '#F5F0E6',
  surface: '#FFF9EF',
  hunterGreen: '#123524',
  sageGreen: '#87906A',
  oliveGreen: '#556B2F',
  deepBrown: '#4A2E1F',
  mutedText: '#7A6A58',
  border: '#E3D6C3',
  softRed: '#B85C4B',
};

type MealId = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type FoodItem = {
  id: string;
  name: string;
  amount: string;
};

type MealsState = Record<MealId, FoodItem[]>;

type NutritionSummary = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

type DayEntry = {
  date: string;

  weight: string;

  foodTracked: boolean;
  caloriesTracked: boolean;
  calories: string;
  foodNote: string;
  foodMeals?: MealsState;

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

const getEmptyFoodItem = (): FoodItem => {
  return {
    id: `${Date.now()}-${Math.random()}`,
    name: '',
    amount: '',
  };
};

const getEmptyMeals = (): MealsState => {
  return {
    breakfast: [getEmptyFoodItem()],
    lunch: [getEmptyFoodItem()],
    dinner: [getEmptyFoodItem()],
    snack: [getEmptyFoodItem()],
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
    foodMeals: getEmptyMeals(),

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

const normalizeMeals = (meals?: MealsState): MealsState => {
  return {
    breakfast:
      meals?.breakfast && meals.breakfast.length > 0
        ? meals.breakfast
        : [getEmptyFoodItem()],
    lunch:
      meals?.lunch && meals.lunch.length > 0
        ? meals.lunch
        : [getEmptyFoodItem()],
    dinner:
      meals?.dinner && meals.dinner.length > 0
        ? meals.dinner
        : [getEmptyFoodItem()],
    snack:
      meals?.snack && meals.snack.length > 0
        ? meals.snack
        : [getEmptyFoodItem()],
  };
};

const normalizeNumber = (value: string | undefined) => {
  if (!value) {
    return 0;
  }

  const number = Number(value.replace(',', '.').replace(/\s/g, ''));

  return Number.isFinite(number) ? number : 0;
};

const normalizeFoodText = (value: string) => {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
};

const roundMacro = (value: number) => {
  return Math.round(value * 10) / 10;
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

const getEmptyNutritionSummary = (): NutritionSummary => {
  return {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
  };
};

const isExactFoodMatch = (foodName: string, keyword: string) => {
  return normalizeFoodText(foodName) === normalizeFoodText(keyword);
};

const isFoodPhraseMatch = (foodName: string, keyword: string) => {
  const normalizedFoodName = normalizeFoodText(foodName);
  const normalizedKeyword = normalizeFoodText(keyword);

  return (
    normalizedFoodName === normalizedKeyword ||
    normalizedFoodName.startsWith(`${normalizedKeyword} `) ||
    normalizedFoodName.endsWith(` ${normalizedKeyword}`) ||
    normalizedFoodName.includes(` ${normalizedKeyword} `)
  );
};

const getLongestKeywordLength = (dictionaryItem: FoodDictionaryItem) => {
  return Math.max(
    ...dictionaryItem.keywords.map((keyword) => normalizeFoodText(keyword).length)
  );
};

const getFoodDictionaryItem = (name: string) => {
  const normalizedName = normalizeFoodText(name);

  if (!normalizedName) {
    return null;
  }

  const exactMatch = FOOD_DICTIONARY.find((dictionaryItem) =>
    dictionaryItem.keywords.some((keyword) =>
      isExactFoodMatch(normalizedName, keyword)
    )
  );

  if (exactMatch) {
    return exactMatch;
  }

  const phraseMatches = FOOD_DICTIONARY.filter((dictionaryItem) =>
    dictionaryItem.keywords.some((keyword) =>
      isFoodPhraseMatch(normalizedName, keyword)
    )
  );

  if (phraseMatches.length > 0) {
    return phraseMatches.sort((first, second) => {
      return getLongestKeywordLength(second) - getLongestKeywordLength(first);
    })[0];
  }

  return null;
};

const getFoodSuggestionItems = (name: string) => {
  const normalizedName = normalizeFoodText(name);

  if (!normalizedName || normalizedName.length < 2) {
    return [];
  }

  return FOOD_DICTIONARY.filter((dictionaryItem) =>
    dictionaryItem.keywords.some((keyword) => {
      const normalizedKeyword = normalizeFoodText(keyword);

      return (
        normalizedKeyword.startsWith(normalizedName) ||
        normalizedKeyword.includes(` ${normalizedName}`)
      );
    })
  ).slice(0, 4);
};

const getDictionaryDisplayName = (
  dictionaryItem: FoodDictionaryItem,
  language: AppLanguage
) => {
  const ruKeyword =
    dictionaryItem.keywords.find((keyword) => /[а-яё]/i.test(keyword)) ||
    dictionaryItem.keywords[0];

  const enKeyword =
    dictionaryItem.keywords.find((keyword) => /^[a-z\s-]+$/i.test(keyword)) ||
    dictionaryItem.keywords[0];

  return language === 'ru' ? ruKeyword : enKeyword;
};

const getFoodItemAmount = (item: FoodItem, dictionaryItem: FoodDictionaryItem) => {
  const enteredAmount = normalizeNumber(item.amount);

  if (enteredAmount > 0) {
    return enteredAmount;
  }

  return normalizeNumber(dictionaryItem.defaultAmount);
};

const getFoodItemNutrition = (item: FoodItem): NutritionSummary => {
  const dictionaryItem = getFoodDictionaryItem(item.name);

  if (!dictionaryItem) {
    return getEmptyNutritionSummary();
  }

  const amount = getFoodItemAmount(item, dictionaryItem);

  if (dictionaryItem.caloriesPerPiece) {
    return {
      calories: Math.round(amount * dictionaryItem.caloriesPerPiece),
      protein: roundMacro(amount * (dictionaryItem.proteinPerPiece || 0)),
      fat: roundMacro(amount * (dictionaryItem.fatPerPiece || 0)),
      carbs: roundMacro(amount * (dictionaryItem.carbsPerPiece || 0)),
    };
  }

  if (dictionaryItem.caloriesPer100g) {
    const multiplier = amount / 100;

    return {
      calories: Math.round(multiplier * dictionaryItem.caloriesPer100g),
      protein: roundMacro(multiplier * (dictionaryItem.proteinPer100g || 0)),
      fat: roundMacro(multiplier * (dictionaryItem.fatPer100g || 0)),
      carbs: roundMacro(multiplier * (dictionaryItem.carbsPer100g || 0)),
    };
  }

  return getEmptyNutritionSummary();
};

const addNutrition = (
  first: NutritionSummary,
  second: NutritionSummary
): NutritionSummary => {
  return {
    calories: first.calories + second.calories,
    protein: roundMacro(first.protein + second.protein),
    fat: roundMacro(first.fat + second.fat),
    carbs: roundMacro(first.carbs + second.carbs),
  };
};

const getMealNutrition = (items: FoodItem[]) => {
  return items.reduce((sum, item) => {
    return addNutrition(sum, getFoodItemNutrition(item));
  }, getEmptyNutritionSummary());
};

const getEstimatedFoodNutrition = (meals: MealsState) => {
  return Object.values(meals).reduce((mealSum, mealItems) => {
    return addNutrition(mealSum, getMealNutrition(mealItems));
  }, getEmptyNutritionSummary());
};

const getGoalLeftText = (
  current: number,
  goal: number,
  language: AppLanguage
) => {
  const difference = roundMacro(goal - current);

  if (difference > 0) {
    return language === 'ru'
      ? `осталось ${difference} г`
      : `${difference} g left`;
  }

  if (difference < 0) {
    return language === 'ru'
      ? `превышение ${Math.abs(difference)} г`
      : `${Math.abs(difference)} g over`;
  }

  return language === 'ru' ? 'ровно в цель' : 'right on target';
};

const getMealTitle = (mealId: MealId, language: AppLanguage) => {
  const titles = {
    ru: {
      breakfast: 'Завтрак',
      lunch: 'Обед',
      dinner: 'Ужин',
      snack: 'Перекус',
    },
    en: {
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
      snack: 'Snack',
    },
  };

  return titles[language][mealId];
};

const getFoodUnit = (item: FoodItem, language: AppLanguage) => {
  const dictionaryItem = getFoodDictionaryItem(item.name);

  if (!dictionaryItem) {
    return language === 'ru' ? 'г' : 'g';
  }

  return language === 'ru' ? dictionaryItem.unitRu : dictionaryItem.unitEn;
};

const getTexts = (language: AppLanguage) => {
  if (language === 'en') {
    return {
      back: '← Back',
      title: 'Food',
      subtitle: 'A calm place for meals, calories, and approximate tracking.',
      goalTitle: 'Daily guide',
      settingsHint: 'The guide is set in Settings',
      macrosToday: 'Macros today',
      target: 'Target',
      fact: 'Fact',
      protein: 'Protein',
      fats: 'Fats',
      carbs: 'Carbs',
      calories: 'Calories',
      addProduct: '+ Add product',
      productPlaceholder: 'Chicken, coffee with milk, rice…',
      amountPlaceholder: 'Amount',
      averageShort: 'avg.',
      kcal: 'kcal',
      gramsShort: 'g',
      todayCalories: 'Calories today',
      caloriesHint:
        'This field can be changed manually. If you know the exact value, just replace the estimate.',
      softHint: 'We are moving toward the ideal — you’ve got this 🌿',
      quickProducts: 'Quick products',
      suggestions: 'Suggestions',
      error: 'Error',
      loadError: 'Could not load food',
      noGoal: 'You can set calories and protein goals in Settings.',
    };
  }

  return {
    back: '← Назад',
    title: 'Еда',
    subtitle: 'Спокойное место для приёмов пищи, калорий и примерного учёта.',
    goalTitle: 'Ориентир на день',
    settingsHint: 'Ориентир задаётся в настройках',
    macrosToday: 'БЖУ сегодня',
    target: 'Цель',
    fact: 'Факт',
    protein: 'Белки',
    fats: 'Жиры',
    carbs: 'Углеводы',
    calories: 'Калории',
    addProduct: '+ Добавить продукт',
    productPlaceholder: 'Курица, кофе с молоком, рис…',
    amountPlaceholder: 'Кол-во',
    averageShort: 'ср.',
    kcal: 'ккал',
    gramsShort: 'г',
    todayCalories: 'Калории сегодня',
    caloriesHint:
      'Это поле можно менять вручную. Если знаешь точное значение — просто замени подсказку.',
    softHint: 'Стремимся к идеалу — всё получится 🌿',
    quickProducts: 'Быстрые продукты',
    suggestions: 'Подсказки',
    error: 'Ошибка',
    loadError: 'Не получилось загрузить еду',
    noGoal: 'Цель калорий и белка можно задать в настройках.',
  };
};

export default function FoodScreen() {
  const router = useRouter();

  const [language, setLanguage] = useState<AppLanguage>(getAutomaticLanguage());
  const t = getTexts(language);

  const isFoodLoadedRef = useRef(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualCaloriesEditedRef = useRef(false);

  const [calories, setCalories] = useState('');
  const [foodNote, setFoodNote] = useState('');
  const [meals, setMeals] = useState<MealsState>(getEmptyMeals());

  const [caloriesGoal, setCaloriesGoal] = useState('1500');
  const [proteinGoal, setProteinGoal] = useState('90');

  const nutrition = calculateNutrition(caloriesGoal, proteinGoal);
  const foodNutrition = getEstimatedFoodNutrition(meals);
  const estimatedCalories = foodNutrition.calories;

  const consumedCalories = normalizeNumber(calories);
  const quickProducts = language === 'ru' ? QUICK_PRODUCTS_RU : QUICK_PRODUCTS_EN;

  const hasFoodLogged = Object.values(meals).some((items) =>
    items.some((item) => item.name.trim().length > 0)
  );
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

    if (!manualCaloriesEditedRef.current) {
      setCalories(estimatedCalories > 0 ? String(estimatedCalories) : '');
    }
  }, [estimatedCalories]);

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
  }, [calories, foodNote, meals]);

  const loadScreenData = async () => {
    try {
      isFoodLoadedRef.current = false;
      manualCaloriesEditedRef.current = false;

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
      setMeals(getEmptyMeals());
      setCalories('');
      setFoodNote('');
      return;
    }

    const parsedEntry: DayEntry = JSON.parse(savedEntry);

    setCalories(parsedEntry.calories || '');
    setFoodNote(parsedEntry.foodNote || '');
    setMeals(normalizeMeals(parsedEntry.foodMeals));
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
        foodMeals: meals,
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

      await AsyncStorage.setItem(
        'soft-day-history',
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      return;
    }
  };

  const goBack = async () => {
    await persistFood();
    router.back();
  };

  const updateFoodItem = (
    mealId: MealId,
    itemId: string,
    field: keyof FoodItem,
    value: string
  ) => {
    setMeals((currentMeals) => {
      return {
        ...currentMeals,
        [mealId]: currentMeals[mealId].map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          return {
            ...item,
            [field]: value,
          };
        }),
      };
    });
  };

  const setFoodItemFromDictionary = (
    mealId: MealId,
    itemId: string,
    dictionaryItem: FoodDictionaryItem
  ) => {
    const displayName = getDictionaryDisplayName(dictionaryItem, language);

    setMeals((currentMeals) => {
      return {
        ...currentMeals,
        [mealId]: currentMeals[mealId].map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          return {
            ...item,
            name: displayName,
            amount: item.amount || dictionaryItem.defaultAmount,
          };
        }),
      };
    });
  };

  const setFoodItemFromQuickProduct = (
    mealId: MealId,
    itemId: string,
    productName: string
  ) => {
    const dictionaryItem = getFoodDictionaryItem(productName);

    setMeals((currentMeals) => {
      return {
        ...currentMeals,
        [mealId]: currentMeals[mealId].map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          return {
            ...item,
            name: productName,
            amount: item.amount || dictionaryItem?.defaultAmount || '',
          };
        }),
      };
    });
  };

  const addFoodItem = (mealId: MealId) => {
    setMeals((currentMeals) => {
      return {
        ...currentMeals,
        [mealId]: [...currentMeals[mealId], getEmptyFoodItem()],
      };
    });
  };

  const removeFoodItem = (mealId: MealId, itemId: string) => {
    setMeals((currentMeals) => {
      const filteredItems = currentMeals[mealId].filter(
        (item) => item.id !== itemId
      );

      return {
        ...currentMeals,
        [mealId]: filteredItems.length > 0 ? filteredItems : [getEmptyFoodItem()],
      };
    });
  };

  const onCaloriesChange = (value: string) => {
    manualCaloriesEditedRef.current = true;
    setCalories(value);
  };

  const renderMacroProgressRow = (
    title: string,
    current: number,
    goal: number
  ) => {
    return (
      <View style={styles.macroProgressRow}>
        <View style={styles.macroProgressLeft}>
          <Text style={styles.macroProgressTitle}>{title}</Text>
          <Text style={styles.macroProgressValue}>
            {roundMacro(current)} / {goal} {t.gramsShort}
          </Text>
        </View>

        <Text style={styles.macroProgressLeftText}>
          {getGoalLeftText(current, goal, language)}
        </Text>
      </View>
    );
  };

  const renderFoodItem = (mealId: MealId, item: FoodItem) => {
    const itemNutrition = getFoodItemNutrition(item);
    const dictionaryItem = getFoodDictionaryItem(item.name);
    const suggestionItems = getFoodSuggestionItems(item.name);
    const amount = dictionaryItem ? getFoodItemAmount(item, dictionaryItem) : 0;
    const unit = getFoodUnit(item, language);

    return (
      <View key={item.id} style={styles.foodItemCard}>
        <View style={styles.foodItemHeader}>
          <Text style={styles.foodItemTitle} numberOfLines={1}>
            {item.name.trim() || t.productPlaceholder}
          </Text>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFoodItem(mealId, item.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.removeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.productInput}
          placeholder={t.productPlaceholder}
          placeholderTextColor={colors.mutedText}
          value={item.name}
          onChangeText={(value) => updateFoodItem(mealId, item.id, 'name', value)}
        />

        {suggestionItems.length > 0 ? (
          <View style={styles.suggestionBlock}>
            <Text style={styles.suggestionTitle}>{t.suggestions}</Text>

            <View style={styles.suggestionList}>
              {suggestionItems.map((suggestionItem) => (
                <TouchableOpacity
                  key={suggestionItem.keywords.join('-')}
                  style={styles.suggestionPill}
                  onPress={() =>
                    setFoodItemFromDictionary(mealId, item.id, suggestionItem)
                  }
                  activeOpacity={0.85}
                >
                  <Text style={styles.suggestionPillText}>
                    {getDictionaryDisplayName(suggestionItem, language)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.quickBlock}>
          <Text style={styles.suggestionTitle}>{t.quickProducts}</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.quickList}>
              {quickProducts.map((productName) => (
                <TouchableOpacity
                  key={productName}
                  style={styles.quickPill}
                  onPress={() =>
                    setFoodItemFromQuickProduct(mealId, item.id, productName)
                  }
                  activeOpacity={0.85}
                >
                  <Text style={styles.quickPillText}>{productName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.foodItemBottomRow}>
          <TextInput
            style={styles.amountInput}
            placeholder={t.amountPlaceholder}
            placeholderTextColor={colors.mutedText}
            keyboardType="number-pad"
            value={item.amount}
            onChangeText={(value) =>
              updateFoodItem(mealId, item.id, 'amount', value)
            }
          />

          <View style={styles.estimateBox}>
            <Text style={styles.estimateLabel}>
              {dictionaryItem
                ? `${t.averageShort} · ${amount || dictionaryItem.defaultAmount} ${unit}`
                : `${t.averageShort} · 100 ${unit}`}
            </Text>

            <Text style={styles.estimateCalories}>
              +{itemNutrition.calories} {t.kcal}
            </Text>

            <Text style={styles.estimateMacros}>
              Б {itemNutrition.protein} г · Ж {itemNutrition.fat} г · У{' '}
              {itemNutrition.carbs} г
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMeal = (mealId: MealId) => {
    const mealNutrition = getMealNutrition(meals[mealId]);

    return (
      <View style={styles.mealCard} key={mealId}>
        <View style={styles.mealHeader}>
          <Text style={styles.mealTitle}>{getMealTitle(mealId, language)}</Text>

          <View style={styles.mealSummary}>
            <Text style={styles.mealCalories}>
              +{mealNutrition.calories} {t.kcal}
            </Text>

            <Text style={styles.mealMacros}>
              Б {mealNutrition.protein} г · Ж {mealNutrition.fat} г · У{' '}
              {mealNutrition.carbs} г
            </Text>
          </View>
        </View>

        {meals[mealId].map((item) => renderFoodItem(mealId, item))}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => addFoodItem(mealId)}
          activeOpacity={0.85}
        >
          <Text style={styles.addButtonText}>{t.addProduct}</Text>
        </TouchableOpacity>
      </View>
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
          onPress={goBack}
          activeOpacity={0.85}
        >
          <Text style={styles.backButtonText}>{t.back}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t.title} 🍽️</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.goalTitle}</Text>

          {nutrition ? (
            <>
              <Text style={styles.settingsHint}>{t.settingsHint}</Text>

              <Text style={styles.goalLine}>
                {nutrition.calories} {t.kcal} · Б {nutrition.protein}{' '}
                {t.gramsShort} · Ж {nutrition.fat} {t.gramsShort} · У{' '}
                {nutrition.carbs} {t.gramsShort}
              </Text>

              <View style={styles.macroProgressBox}>
                <Text style={styles.macroProgressBoxTitle}>
                  {t.macrosToday}
                </Text>

                {renderMacroProgressRow(
                  t.protein,
                  foodNutrition.protein,
                  nutrition.protein
                )}

                {renderMacroProgressRow(t.fats, foodNutrition.fat, nutrition.fat)}

                {renderMacroProgressRow(
                  t.carbs,
                  foodNutrition.carbs,
                  nutrition.carbs
                )}
              </View>
            </>
          ) : (
            <Text style={styles.cardText}>{t.noGoal}</Text>
          )}

          <Text style={styles.softHint}>{t.softHint}</Text>
        </View>

        {renderMeal('breakfast')}
        {renderMeal('lunch')}
        {renderMeal('dinner')}
        {renderMeal('snack')}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.todayCalories}</Text>

          <View style={styles.calorieBox}>
            <Text style={styles.calorieLabel}>
              {language === 'ru' ? 'Средняя оценка по еде' : 'Food estimate'}
            </Text>

            <Text style={styles.calorieValue}>
              +{estimatedCalories} {t.kcal}
            </Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.mutedText}
            keyboardType="number-pad"
            value={calories}
            onChangeText={onCaloriesChange}
          />

          <Text style={styles.cardText}>{t.caloriesHint}</Text>

          <View style={styles.calorieBox}>
            <Text style={styles.calorieLabel}>{t.todayCalories}</Text>
            <Text style={styles.calorieValue}>
              {consumedCalories > 0 ? Math.round(consumedCalories) : '—'}
            </Text>
            <Text style={styles.calorieUnit}>{t.kcal}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {language === 'ru' ? 'Заметка' : 'Note'}
          </Text>

          <TextInput
            style={[styles.input, styles.bigInput]}
            placeholder={
              language === 'ru'
                ? 'Любые детали по еде за день…'
                : 'Any food details for the day…'
            }
            placeholderTextColor={colors.mutedText}
            multiline
            value={foodNote}
            onChangeText={setFoodNote}
          />
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
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
    marginBottom: 14,
  },
  settingsHint: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.mutedText,
    marginBottom: 8,
  },
  goalLine: {
    fontSize: 16,
    color: colors.deepBrown,
    lineHeight: 23,
    marginBottom: 14,
  },
  macroProgressBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  macroProgressBoxTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 12,
  },
  macroProgressRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 10,
    gap: 6,
  },
  macroProgressLeft: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  macroProgressTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.deepBrown,
    flex: 1,
  },
  macroProgressValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.hunterGreen,
  },
  macroProgressLeftText: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
  },
  softHint: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 22,
    marginTop: 4,
  },
  mealCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  mealTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: colors.deepBrown,
    flex: 1,
  },
  mealSummary: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  mealCalories: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.hunterGreen,
    marginBottom: 2,
  },
  mealMacros: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.mutedText,
  },
  foodItemCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  foodItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  foodItemTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
    color: colors.deepBrown,
  },
  removeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 25,
    fontWeight: '900',
    color: colors.softRed,
    lineHeight: 28,
    marginTop: -2,
  },
  productInput: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.deepBrown,
    marginBottom: 12,
  },
  suggestionBlock: {
    marginBottom: 12,
  },
  quickBlock: {
    marginBottom: 12,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.mutedText,
    marginBottom: 8,
  },
  suggestionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionPill: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.sageGreen,
  },
  suggestionPillText: {
    color: colors.hunterGreen,
    fontSize: 13,
    fontWeight: '900',
  },
  quickList: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 6,
  },
  quickPill: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickPillText: {
    color: colors.deepBrown,
    fontSize: 13,
    fontWeight: '800',
  },
  foodItemBottomRow: {
    flexDirection: 'row',
    gap: 10,
  },
  amountInput: {
    width: 92,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.deepBrown,
  },
  estimateBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  estimateLabel: {
    fontSize: 13,
    color: colors.mutedText,
    marginBottom: 2,
  },
  estimateCalories: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.hunterGreen,
    marginBottom: 2,
  },
  estimateMacros: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.mutedText,
    lineHeight: 18,
  },
  addButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.sageGreen,
    paddingVertical: 15,
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.hunterGreen,
    fontSize: 17,
    fontWeight: '900',
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
    marginBottom: 14,
  },
  calorieLabel: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 6,
  },
  calorieValue: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.hunterGreen,
  },
  calorieUnit: {
    fontSize: 13,
    color: colors.mutedText,
    marginTop: 2,
  },
});