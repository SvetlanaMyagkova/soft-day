import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
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
  deepBrown: '#4A2E1F',
  mutedText: '#7A6A58',
  border: '#E3D6C3',
};

const texts = {
  ru: {
    back: '← Назад',
    title: 'Политика конфиденциальности',
    effectiveDate: 'Дата вступления в силу: 12 мая 2026',
    intro:
      'Soft Day — это персональный дневник-трекер, который помогает отмечать привычки, питание, движение, финансы, благодарность, чтение и другие данные дня. Мы стараемся хранить данные максимально просто и прозрачно.',

    sections: [
      {
        title: '1. Какие данные мы обрабатываем',
        body:
          'Soft Day может обрабатывать данные аккаунта и данные дневника. Данные аккаунта включают email, ID аккаунта, способ входа и технические данные авторизации. Данные дневника могут включать вес, калории, заметки о еде, шаги, тренировки, финансовые записи, благодарность, чтение и другую информацию о дне.',
      },
      {
        title: '2. Данные аккаунта',
        body:
          'Soft Day использует Firebase Authentication для входа в аккаунт. Firebase Authentication может обрабатывать email, идентификатор аккаунта, способ входа и технические данные, необходимые для авторизации. Эти данные используются только для входа в аккаунт и поддержания авторизации.',
      },
      {
        title: '3. Данные дневника на устройстве',
        body:
          'Данные дневника сейчас хранятся локально на вашем устройстве. Они не загружаются автоматически в облачную базу данных и не синхронизируются между устройствами.',
      },
      {
        title: '4. Экспорт и импорт',
        body:
          'Soft Day может позволять экспортировать данные в формате JSON или CSV. Файлы экспорта создаются только по вашему запросу. Вы сами выбираете, куда сохранить или отправить эти файлы.',
      },
      {
        title: '5. Уведомления',
        body:
          'Soft Day может запросить разрешение на отправку уведомлений. Уведомления используются только для напоминаний приложения: благодарность, чтение, проверка дня или итог дня. Вы можете отключить уведомления в настройках устройства.',
      },
      {
        title: '6. Вход через Apple и email',
        body:
          'Soft Day может поддерживать вход по email/паролю и вход через Apple. При входе через Apple Apple может передать приложению идентификатор Apple-аккаунта и, в зависимости от ваших настроек Apple, email или private relay email.',
      },
      {
        title: '7. Передача данных',
        body:
          'Мы не продаём персональные данные. Мы не используем данные дневника для рекламы. Мы не передаём данные дневника третьим лицам, потому что сейчас они хранятся только на вашем устройстве. Данные авторизации могут обрабатываться Firebase как поставщиком авторизации.',
      },
      {
        title: '8. Удаление данных',
        body:
          'Вы можете удалить данные на этом устройстве — это удалит локальные данные дневника и настройки приложения. Также вы можете удалить аккаунт — это удалит доступ к аккаунту в системе авторизации. Данные дневника на устройстве могут остаться, если не удалить их отдельно.',
      },
      {
        title: '9. Облачная синхронизация',
        body:
          'Облачная синхронизация данных дневника сейчас не подключена. Если мы добавим синхронизацию в будущем, мы обновим эту Политику конфиденциальности и отдельно объясним, какие данные будут храниться в облаке и как они защищаются.',
      },
      {
        title: '10. Дети',
        body:
          'Soft Day не предназначен для детей младше 13 лет. Мы сознательно не собираем персональные данные детей.',
      },
      {
        title: '11. Изменения политики',
        body:
          'Мы можем время от времени обновлять эту Политику конфиденциальности. При существенных изменениях мы обновим дату вступления в силу и, при необходимости, уведомим пользователей в приложении.',
      },
      {
        title: '12. Контакты',
        body:
          'По вопросам этой Политики конфиденциальности или данных можно связаться с нами: s.myagkova@gmail.com',
      },
    ],
  },

  en: {
    back: '← Back',
    title: 'Privacy Policy',
    effectiveDate: 'Effective date: May 12, 2026',
    intro:
      'Soft Day is a personal daily tracker designed to help users record habits, nutrition, movement, finances, gratitude, reading, and other daily notes. We aim to keep data storage simple and transparent.',

    sections: [
      {
        title: '1. Data we process',
        body:
          'Soft Day may process account data and diary data. Account data includes email, account ID, sign-in method, and authentication-related technical data. Diary data may include weight, calories, food notes, steps, workout information, financial entries, gratitude notes, reading status, and other daily tracking data.',
      },
      {
        title: '2. Account data',
        body:
          'Soft Day uses Firebase Authentication to provide account sign-in. Firebase Authentication may process your email address, account identifier, sign-in method, and technical authentication data needed to keep you signed in. We use this data only to provide account access and authentication.',
      },
      {
        title: '3. Diary data stored on your device',
        body:
          'Your diary data is currently stored locally on your device. It is not automatically uploaded to a cloud database and is not automatically synced between devices.',
      },
      {
        title: '4. Export and import',
        body:
          'Soft Day may allow you to export your data as JSON or CSV. Exported files are created only when you request them. You are responsible for where you save or share these files.',
      },
      {
        title: '5. Notifications',
        body:
          'Soft Day may ask permission to send reminders. Notifications are used only for app reminders, such as gratitude, reading, daily check-ins, or daily summaries. You can disable notifications in your device settings.',
      },
      {
        title: '6. Apple Sign-In and email sign-in',
        body:
          'Soft Day may support email/password sign-in and Sign in with Apple. When using Sign in with Apple, Apple may provide Soft Day with an Apple account identifier and, depending on your Apple settings, your email address or private relay email.',
      },
      {
        title: '7. Data sharing',
        body:
          'We do not sell your personal data. We do not use your diary data for advertising. We do not share your diary data with third parties because it is currently stored only on your device. Authentication data may be processed by Firebase as our authentication provider.',
      },
      {
        title: '8. Data deletion',
        body:
          'You can delete data on this device, which removes locally stored diary data and app settings. You can also delete your account, which removes account access from the authentication system. Diary data stored on your device may remain unless you delete it separately.',
      },
      {
        title: '9. Cloud sync',
        body:
          'Cloud sync for diary data is not currently enabled. If we add cloud sync in the future, we will update this Privacy Policy and clearly explain what data is stored in the cloud and how it is protected.',
      },
      {
        title: '10. Children’s privacy',
        body:
          'Soft Day is not intended for children under 13. We do not knowingly collect personal data from children.',
      },
      {
        title: '11. Changes to this policy',
        body:
          'We may update this Privacy Policy from time to time. If we make significant changes, we will update the effective date and, where appropriate, notify users in the app.',
      },
      {
        title: '12. Contact',
        body:
          'If you have questions about this Privacy Policy or your data, contact us at: s.myagkova@gmail.com',
      },
    ],
  },
};

export default function PrivacyScreen() {
  const router = useRouter();

  const [language, setLanguage] = useState<AppLanguage>(getAutomaticLanguage());
  const t = texts[language];

  useEffect(() => {
    loadLanguage();
  }, []);

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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={styles.backButton}
        activeOpacity={0.85}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>{t.back}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.effectiveDate}>{t.effectiveDate}</Text>
      <Text style={styles.intro}>{t.intro}</Text>

      <View style={styles.card}>
        {t.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
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
    paddingTop: 90,
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
    fontSize: 36,
    fontWeight: '800',
    color: colors.hunterGreen,
    marginBottom: 8,
  },
  effectiveDate: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.deepBrown,
    marginBottom: 14,
  },
  intro: {
    fontSize: 16,
    color: colors.mutedText,
    lineHeight: 23,
    marginBottom: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 7,
  },
  sectionBody: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 22,
  },
});