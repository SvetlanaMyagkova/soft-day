import * as Localization from 'expo-localization';

export type AppLanguage = 'ru' | 'en';

export const LANGUAGE_STORAGE_KEY = 'soft-day-language';

const russianFriendlyLanguageCodes = ['ru', 'uk', 'be', 'kk'];

const russianFriendlyRegionCodes = [
  'RU',
  'BY',
  'KZ',
  'KG',
  'AM',
  'AZ',
  'MD',
  'TJ',
  'TM',
  'UZ',
  'UA',
];

export const getAutomaticLanguage = (): AppLanguage => {
  const locale = Localization.getLocales()[0];

  const languageCode = locale?.languageCode?.toLowerCase();
  const regionCode = locale?.regionCode?.toUpperCase();

  if (languageCode && russianFriendlyLanguageCodes.includes(languageCode)) {
    return 'ru';
  }

  if (regionCode && russianFriendlyRegionCodes.includes(regionCode)) {
    return 'ru';
  }

  return 'en';
};

export const translations = {
  ru: {
    // Common
    russian: 'Русский',
    english: 'English',
    cancel: 'Отмена',
    save: 'Сохранить',
    reset: 'Сбросить',
    done: 'Готово',
    error: 'Ошибка',

    // Tabs / screens
    today: 'Сегодня',
    history: 'История',
    charts: 'Графики',
    settings: 'Настройки',

    // Settings
    settingsSubtitle: 'Всё, что настраивается редко: цели, напоминания и расчёты.',

    appLanguage: 'Язык приложения',
    appLanguageDescription:
      'По умолчанию язык выбирается автоматически по языку телефона. Здесь можно поменять вручную.',
    languageSaved: 'Язык сохранён',
    nextLocalizationNote:
      'Если выбрать язык вручную, приложение запомнит выбор и больше не будет менять его автоматически.',

    // Settings full
    nutritionGoal: 'Цель КБЖУ',
    nutritionNow: 'Сейчас',
    nutritionDescription:
      'Укажи калории и белок, а жиры и углеводы рассчитаются автоматически.',
    caloriesPerDayPlaceholder: 'Калории в день, например 1500',
    proteinGramsPlaceholder: 'Белок в граммах, например 90',
    saveNutrition: 'Сохранить КБЖУ',
    nutritionSaved: 'Цели КБЖУ сохранены',

    weightGoal: 'Цель веса',
    weightLoss: 'Похудение',
    weightMaintenance: 'Поддержание',
    weightGain: 'Набор',
    minDeficitPlaceholder: 'Минимальный дефицит, например 300',
    maxDeficitPlaceholder: 'Максимальный дефицит, например 500',
    maintenanceCorridorPlaceholder: 'Коридор поддержания, например 100',
    minSurplusPlaceholder: 'Минимальный профицит, например 150',
    maxSurplusPlaceholder: 'Максимальный профицит, например 300',
    saveGoal: 'Сохранить цель',
    goalSaved: 'Цель сохранена',

    calorieBurnCalculation: 'Расчёт расхода',
    calorieBurnDescription:
      'Базовый расход — это примерное количество калорий, которое организм тратит за день в покое. Шаги и тренировки добавляются сверху автоматически.',
    baseBurnPlaceholder: 'Базовый расход, например 1400',
    baseBurnNowPrefix: 'Сейчас',
    baseBurnNowSuffix: 'ккал базово + шаги и тренировки сверху.',
    saveCalculation: 'Сохранить расчёт',
    calculationSaved: 'Расчёт расхода сохранён',
    checkValue: 'Проверь значение',
    baseBurnMustBePositive: 'Базовый расход должен быть больше 0.',

    softReminders: 'Мягкие напоминания',
    softRemindersDescription:
      'Небольшие касания в течение дня, чтобы не держать всё в голове.',

    data: 'Данные',
    dataDescription: 'Управление резервными копиями, таблицами и очисткой данных.',
    backups: 'Резервные копии',
    backupsDescription:
      'JSON нужен для восстановления приложения со всей историей и настройками.',
    exportJson: 'Экспортировать JSON',
    importJson: 'Импортировать JSON',
    table: 'Таблица',
    tableDescription: 'CSV можно открыть в Excel, Numbers или Google Sheets.',
    exportCsv: 'Экспортировать CSV',

    dangerZone: 'Опасная зона',
    dangerZoneDescription:
      'Эти действия удаляют данные. Перед очисткой лучше сделать JSON-экспорт.',
    clearHistory: 'Очистить историю',
    clearToday: 'Сбросить сегодняшний день',

    noExportDataTitle: 'Пока нечего экспортировать',
    noExportDataMessage: 'Сохрани хотя бы один день.',
    jsonExportReady: 'Экспорт JSON готов',
    csvExportReady: 'CSV экспорт готов',
    fileSaved: 'Файл сохранён',
    csvSaved: 'CSV сохранён',

    resetTodayTitle: 'Сбросить сегодняшний день?',
    resetTodayMessage:
      'Очистится только текущий день. История прошлых дней, цели, напоминания и настройки останутся.',
    todayReset: 'Сегодняшний день сброшен',
    todayResetDone:
      'Сегодняшний день очищен. Прошлые дни и настройки сохранены.',

    clearHistoryTitle: 'Очистить историю?',
    clearHistoryMessage:
      'Будут удалены сохранённые дни из истории. Текущий экран “Сегодня”, цели, напоминания и настройки останутся.',
    historyCleared: 'История очищена. Текущий день не изменён.',
    historyClearedDone:
      'История дней очищена. Текущий день, цели, напоминания и настройки сохранены.',

    importDataTitle: 'Импортировать данные?',
    importDataMessage:
      'Текущая история и настройки будут заменены данными из файла. Включённые напоминания будут пересозданы заново.',
    importDataButton: 'Импортировать',
    wrongFileTitle: 'Не тот файл',
    wrongFileMessage:
      'Выбери JSON-файл, который был экспортирован из Soft Day.',
    fileSelectError: 'Не получилось выбрать файл',
    dataImported: 'Данные импортированы.',
    dataImportedWithReminders: 'Данные импортированы. Напоминаний восстановлено',
    importedUpdateTabs:
      'История и графики обновятся при переходе между вкладками.',

    remindersNotEnabled: 'Напоминания не включены',
    remindersPermissionNeeded:
      'Данные импортированы, но для восстановления напоминаний нужно разрешить уведомления.',
    noPermission: 'Нет разрешения',
    allowNotifications:
      'Разреши уведомления для Soft Day в настройках телефона.',

    exportDataError: 'Не получилось экспортировать данные',
    exportCsvError: 'Не получилось экспортировать CSV',
    importDataError: 'Не получилось импортировать данные',
    applyImportError: 'Не получилось применить данные из файла',
    clearTodayError: 'Не получилось сбросить сегодняшний день',
    clearHistoryError: 'Не получилось очистить историю',
    saveNutritionError: 'Не получилось сохранить цели КБЖУ',
    saveGoalError: 'Не получилось сохранить цель',
    saveCalculationError: 'Не получилось сохранить расчёт расхода',
    loadRemindersError: 'Не получилось загрузить напоминания',
    updateReminderError: 'Не получилось обновить напоминание',

    // Today header
    appName: 'Soft Day',
    todayDatePrefix: 'Сегодня',
    todaySubtitle: 'Мягкий трекер дня без давления',

    // Progress
    dayProgress: 'Прогресс дня',
    softStart: 'Мягкий старт — просто начни с одного пункта',
    dayClosedFully: 'Красота, день закрыт полностью',
    completedToday: 'Сегодня выполнено',

    // Calories summary
    todayCalories: 'Сегодня по калориям',
    todayCaloriesHint: 'Введи факт за день — приложение покажет примерный баланс.',
    caloriesForDay: 'Калории за день',
    eaten: 'Съела',
    burned: 'Потратила',
    kcal: 'ккал',
    dayBalanceCalories: 'Баланс дня',
    noDataYet: 'Пока нет данных',
    noCaloriesHint: 'После ввода калорий появится дефицит, поддержание или профицит.',
    caloriesFormulaEmpty: 'Расчёт примерный: базовый расход + шаги + тренировка.',
    caloriesFormulaFilled: 'ккал базово + шаги и тренировка сверху',

    // Goal evaluation
    deficit: 'Дефицит',
    surplus: 'Профицит',
    maintenance: 'Поддержание',
    excellentInGoal: 'отлично, в цели 🌿',
    softDeficitGood: 'мягкий дефицит, уже хорошо',
    strongDeficitCareful: 'дефицит сильный, береги себя',
    outsideGoalNoDrama: 'сегодня вне цели, ничего страшного',
    evenDayNoDeficit: 'ровный день, но не дефицит',
    perfectForMaintenance: 'идеально для поддержания 🌿',
    wentIntoDeficitOk: 'ушла в дефицит, но это окей',
    wentIntoSurplusNoted: 'ушла в профицит, просто отметили',
    softSurplus: 'мягкий профицит',
    surplusAboveGoal: 'профицит выше цели',
    notInGoalTodayOk: 'сегодня не в цели, окей',
    evenDayNoSurplus: 'ровный день, но не профицит',

    // Orientir
    orientation: 'Ориентир',
    nutritionCanBeSetInSettings: 'КБЖУ можно настроить во вкладке “Настройки”.',
    protein: 'белок',
    fats: 'жиры',
    carbs: 'углеводы',
    gramsShort: 'г',

    weightGoalLoss: 'Похудение',
    weightGoalMaintenance: 'Поддержание',
    weightGoalGain: 'Набор',
    deficitGoal: 'дефицит',
    maintenanceCorridor: 'коридор',
    surplusGoal: 'профицит',

    // Weight
    weight: 'Вес',
    weightPlaceholder: 'Например, 68.9',

    // Food
    food: 'Еда',
    foodTracked: 'Я сегодня записывала еду',
    caloriesTracked: 'Я считала калории',
    foodNotePlaceholder: 'Что ела сегодня?',

    // Finance
    finance: 'Финансы',
    categories: 'Категории',
    hide: 'Скрыть',
    income: 'Доходы',
    expenses: 'Расходы',
    dayMoneyBalance: 'Баланс дня',

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

    // Movement
    movement: 'Движение',
    stepsTodayPlaceholder: 'Шаги сегодня',
    workoutCaloriesPlaceholder: 'Калории тренировки, например 250',
    stepsDone: '10 000 шагов выполнено',
    workoutDone: 'Тренировка выполнена',

    // Gratitude
    gratitude: 'Благодарность',
    gratitudePlaceholder: 'Сегодня я благодарна за...',

    // Reading
    reading: 'Чтение',
    start15Minutes: 'Старт 15 минут',
    pause: 'Пауза',
    restart: 'Заново',
    readingDone: 'Прочитала 15 минут',
    readingCounted: 'Чтение засчитано',

    // Save
    saveDay: 'Сохранить день',
    daySaved: 'День сохранён',

    // Alerts
    loadDayError: 'Не получилось загрузить сохранённый день',
    loadNutritionError: 'Не получилось загрузить цели КБЖУ',
    loadWeightGoalError: 'Не получилось загрузить цель',
    loadCalculationError: 'Не получилось загрузить расчёт расхода',
    saveDayError: 'Не получилось сохранить день',
  },

  en: {
    // Common
    russian: 'Русский',
    english: 'English',
    cancel: 'Cancel',
    save: 'Save',
    reset: 'Reset',
    done: 'Done',
    error: 'Error',

    // Tabs / screens
    today: 'Today',
    history: 'History',
    charts: 'Charts',
    settings: 'Settings',

    // Settings
    settingsSubtitle: 'Everything you rarely change: goals, reminders, and calculations.',

    appLanguage: 'App language',
    appLanguageDescription:
      'By default, the app uses your phone language. You can override it here.',
    languageSaved: 'Language saved',
    nextLocalizationNote:
      'If you choose a language manually, the app will remember it and stop changing it automatically.',

    // Settings full
    nutritionGoal: 'Nutrition goal',
    nutritionNow: 'Now',
    nutritionDescription:
      'Set calories and protein. Fats and carbs will be calculated automatically.',
    caloriesPerDayPlaceholder: 'Calories per day, e.g. 1500',
    proteinGramsPlaceholder: 'Protein in grams, e.g. 90',
    saveNutrition: 'Save nutrition',
    nutritionSaved: 'Nutrition goals saved',

    weightGoal: 'Weight goal',
    weightLoss: 'Weight loss',
    weightMaintenance: 'Maintenance',
    weightGain: 'Weight gain',
    minDeficitPlaceholder: 'Minimum deficit, e.g. 300',
    maxDeficitPlaceholder: 'Maximum deficit, e.g. 500',
    maintenanceCorridorPlaceholder: 'Maintenance corridor, e.g. 100',
    minSurplusPlaceholder: 'Minimum surplus, e.g. 150',
    maxSurplusPlaceholder: 'Maximum surplus, e.g. 300',
    saveGoal: 'Save goal',
    goalSaved: 'Goal saved',

    calorieBurnCalculation: 'Calorie burn calculation',
    calorieBurnDescription:
      'Base burn is an estimated number of calories your body uses at rest. Steps and workouts are added on top automatically.',
    baseBurnPlaceholder: 'Base burn, e.g. 1400',
    baseBurnNowPrefix: 'Now',
    baseBurnNowSuffix: 'kcal base burn + steps and workouts on top.',
    saveCalculation: 'Save calculation',
    calculationSaved: 'Calorie calculation saved',
    checkValue: 'Check the value',
    baseBurnMustBePositive: 'Base burn must be greater than 0.',

    softReminders: 'Soft reminders',
    softRemindersDescription:
      'Small touches during the day so you do not have to keep everything in your head.',

    data: 'Data',
    dataDescription: 'Manage backups, tables, and data cleanup.',
    backups: 'Backups',
    backupsDescription:
      'JSON is used to restore the app with all history and settings.',
    exportJson: 'Export JSON',
    importJson: 'Import JSON',
    table: 'Table',
    tableDescription: 'CSV can be opened in Excel, Numbers, or Google Sheets.',
    exportCsv: 'Export CSV',

    dangerZone: 'Danger zone',
    dangerZoneDescription:
      'These actions delete data. It is better to make a JSON export first.',
    clearHistory: 'Clear history',
    clearToday: 'Reset today',

    noExportDataTitle: 'Nothing to export yet',
    noExportDataMessage: 'Save at least one day first.',
    jsonExportReady: 'JSON export ready',
    csvExportReady: 'CSV export ready',
    fileSaved: 'File saved',
    csvSaved: 'CSV saved',

    resetTodayTitle: 'Reset today?',
    resetTodayMessage:
      'Only the current day will be cleared. Past history, goals, reminders, and settings will stay.',
    todayReset: 'Today has been reset',
    todayResetDone:
      'Today has been cleared. Past days and settings are saved.',

    clearHistoryTitle: 'Clear history?',
    clearHistoryMessage:
      'Saved days will be deleted from history. Today, goals, reminders, and settings will stay.',
    historyCleared: 'History cleared. Today has not been changed.',
    historyClearedDone:
      'History has been cleared. Today, goals, reminders, and settings are saved.',

    importDataTitle: 'Import data?',
    importDataMessage:
      'Current history and settings will be replaced with data from the file. Enabled reminders will be recreated.',
    importDataButton: 'Import',
    wrongFileTitle: 'Wrong file',
    wrongFileMessage:
      'Choose a JSON file exported from Soft Day.',
    fileSelectError: 'Could not select the file',
    dataImported: 'Data imported.',
    dataImportedWithReminders: 'Data imported. Reminders restored',
    importedUpdateTabs:
      'History and charts will update when you switch tabs.',

    remindersNotEnabled: 'Reminders not enabled',
    remindersPermissionNeeded:
      'Data was imported, but notification permission is required to restore reminders.',
    noPermission: 'No permission',
    allowNotifications:
      'Allow notifications for Soft Day in your phone settings.',

    exportDataError: 'Could not export data',
    exportCsvError: 'Could not export CSV',
    importDataError: 'Could not import data',
    applyImportError: 'Could not apply data from the file',
    clearTodayError: 'Could not reset today',
    clearHistoryError: 'Could not clear history',
    saveNutritionError: 'Could not save nutrition goals',
    saveGoalError: 'Could not save the goal',
    saveCalculationError: 'Could not save calorie calculation',
    loadRemindersError: 'Could not load reminders',
    updateReminderError: 'Could not update reminder',

    // Today header
    appName: 'Soft Day',
    todayDatePrefix: 'Today',
    todaySubtitle: 'A gentle daily tracker without pressure',

    // Progress
    dayProgress: 'Day progress',
    softStart: 'A gentle start — begin with just one thing',
    dayClosedFully: 'Beautiful, the day is fully closed',
    completedToday: 'Completed today',

    // Calories summary
    todayCalories: 'Today’s calories',
    todayCaloriesHint: 'Enter your daily total — the app will show an estimated balance.',
    caloriesForDay: 'Calories for the day',
    eaten: 'Eaten',
    burned: 'Burned',
    kcal: 'kcal',
    dayBalanceCalories: 'Daily balance',
    noDataYet: 'No data yet',
    noCaloriesHint: 'Enter calories to see deficit, maintenance, or surplus.',
    caloriesFormulaEmpty: 'Estimate: base burn + steps + workout.',
    caloriesFormulaFilled: 'kcal base burn + steps and workout on top',

    // Goal evaluation
    deficit: 'Deficit',
    surplus: 'Surplus',
    maintenance: 'Maintenance',
    excellentInGoal: 'great, within your goal 🌿',
    softDeficitGood: 'a soft deficit, already good',
    strongDeficitCareful: 'the deficit is strong, take care of yourself',
    outsideGoalNoDrama: 'outside today’s goal, no drama',
    evenDayNoDeficit: 'an even day, but not a deficit',
    perfectForMaintenance: 'perfect for maintenance 🌿',
    wentIntoDeficitOk: 'you went into deficit, and that is okay',
    wentIntoSurplusNoted: 'you went into surplus, just noted',
    softSurplus: 'a soft surplus',
    surplusAboveGoal: 'surplus is above the goal',
    notInGoalTodayOk: 'not in goal today, that is okay',
    evenDayNoSurplus: 'an even day, but not a surplus',

    // Orientir
    orientation: 'Guide',
    nutritionCanBeSetInSettings: 'Nutrition targets can be set in Settings.',
    protein: 'protein',
    fats: 'fats',
    carbs: 'carbs',
    gramsShort: 'g',

    weightGoalLoss: 'Weight loss',
    weightGoalMaintenance: 'Maintenance',
    weightGoalGain: 'Weight gain',
    deficitGoal: 'deficit',
    maintenanceCorridor: 'corridor',
    surplusGoal: 'surplus',

    // Weight
    weight: 'Weight',
    weightPlaceholder: 'For example, 68.9',

    // Food
    food: 'Food',
    foodTracked: 'I logged my food today',
    caloriesTracked: 'I counted calories',
    foodNotePlaceholder: 'What did you eat today?',

    // Finance
    finance: 'Finance',
    categories: 'Categories',
    hide: 'Hide',
    income: 'Income',
    expenses: 'Expenses',
    dayMoneyBalance: 'Daily balance',

    salary: 'Salary',
    studio: 'Studio',
    extraIncome: 'Extra income',
    cashback: 'Refunds / cashback',

    groceries: 'Groceries',
    cafeDelivery: 'Café / delivery',
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

    // Movement
    movement: 'Movement',
    stepsTodayPlaceholder: 'Steps today',
    workoutCaloriesPlaceholder: 'Workout calories, e.g. 250',
    stepsDone: '10,000 steps completed',
    workoutDone: 'Workout completed',

    // Gratitude
    gratitude: 'Gratitude',
    gratitudePlaceholder: 'Today I am grateful for...',

    // Reading
    reading: 'Reading',
    start15Minutes: 'Start 15 minutes',
    pause: 'Pause',
    restart: 'Restart',
    readingDone: 'Read for 15 minutes',
    readingCounted: 'Reading counted',

    // Save
    saveDay: 'Save day',
    daySaved: 'Day saved',

    // Alerts
    loadDayError: 'Could not load the saved day',
    loadNutritionError: 'Could not load nutrition goals',
    loadWeightGoalError: 'Could not load the goal',
    loadCalculationError: 'Could not load calorie calculation settings',
    saveDayError: 'Could not save the day',
  },
} as const;

export const getTranslation = (language: AppLanguage) => {
  return translations[language];
};