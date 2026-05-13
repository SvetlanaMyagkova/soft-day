export const USER_PROFILE_STORAGE_KEY = 'soft-day-user-profile';

export type UserProfileGender = 'female' | 'male';

export type UserProfileSettings = {
  displayName: string;
  gender: UserProfileGender;
};

export type SoftReminderText = {
  title: string;
  body: string;
};

export type SoftReminderTextMap = {
  gratitude: SoftReminderText;
  reading: SoftReminderText;
  update: SoftReminderText;
  summary: SoftReminderText;
};

export const DEFAULT_USER_PROFILE: UserProfileSettings = {
  displayName: '',
  gender: 'female',
};

const getCleanName = (displayName: string) => {
  return displayName.trim();
};

const withName = (
  displayName: string,
  withDisplayNameText: (name: string) => string,
  withoutDisplayNameText: string
) => {
  const name = getCleanName(displayName);

  if (!name) {
    return withoutDisplayNameText;
  }

  return withDisplayNameText(name);
};

export const getSoftReminderTexts = (
  language: 'ru' | 'en',
  profile: UserProfileSettings
): SoftReminderTextMap => {
  const isMale = profile.gender === 'male';

  if (language === 'en') {
    return {
      gratitude: {
        title: 'Gratitude 🌿',
        body: withName(
          profile.displayName,
          (name) => `${name}, good morning. What are you grateful for today?`,
          'Good morning. What are you grateful for today?'
        ),
      },

      reading: {
        title: 'Reading 📖',
        body: withName(
          profile.displayName,
          (name) =>
            `${name}, a few pages still count. A small calm step for yourself.`,
          'A few pages still count. A small calm step for yourself.'
        ),
      },

      update: {
        title: 'Soft Day 🌿',
        body: withName(
          profile.displayName,
          (name) =>
            `${name}, gentle check-in: food, steps, or finances — whatever is possible today.`,
          'Gentle check-in: food, steps, or finances — whatever is possible today.'
        ),
      },

      summary: {
        title: 'Daily summary 🌙',
        body: withName(
          profile.displayName,
          (name) =>
            `${name}, what went well today? Time to softly close the day.`,
          'What went well today? Time to softly close the day.'
        ),
      },
    };
  }

  return {
    gratitude: {
      title: 'Благодарность 🌿',
      body: withName(
        profile.displayName,
        (name) =>
          `${name}, доброе утро. За что ты сегодня ${
            isMale ? 'благодарен' : 'благодарна'
          }?`,
        `Доброе утро. За что ты сегодня ${
          isMale ? 'благодарен' : 'благодарна'
        }?`
      ),
    },

    reading: {
      title: 'Чтение 📖',
      body: withName(
        profile.displayName,
        (name) =>
          `${name}, ${isMale ? 'ты молодец' : 'ты умница'}. Пара страниц — уже хороший шаг.`,
        `${isMale ? 'Ты молодец' : 'Ты умница'}. Пара страниц — уже хороший шаг.`
      ),
    },

    update: {
      title: 'Soft Day 🌿',
      body: withName(
        profile.displayName,
        (name) =>
          `${name}, мягкая проверка: еда, шаги или финансы — что получится.`,
        'Мягкая проверка: еда, шаги или финансы — что получится.'
      ),
    },

    summary: {
      title: 'Итоги дня 🌙',
      body: withName(
        profile.displayName,
        (name) =>
          `${name}, что хорошего получилось сегодня? Время мягко закрыть день.`,
        'Что хорошего получилось сегодня? Время мягко закрыть день.'
      ),
    },
  };
};