import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
    createUserWithEmailAndPassword,
    deleteUser,
    OAuthProvider,
    onAuthStateChanged,
    signInWithCredential,
    signInWithEmailAndPassword,
    signOut,
    User,
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { auth } from '../constants/firebase';
import {
    AppLanguage,
    getAutomaticLanguage,
    LANGUAGE_STORAGE_KEY,
} from '../constants/i18n';

const colors = {
  background: '#F5F0E6',
  surface: '#FFF9EF',
  hunterGreen: '#123524',
  sand: '#C9A978',
  deepBrown: '#4A2E1F',
  mutedText: '#7A6A58',
  border: '#E3D6C3',
  softRed: '#B85C4B',
};

const LOCAL_DATA_KEYS = [
  'soft-day-history',
  'soft-day-nutrition-goals',
  'soft-day-weight-goal-settings',
  'soft-day-calorie-calculation-settings',
  'soft-day-reminders',
];

const texts = {
  ru: {
    back: '← Назад',
    title: 'Аккаунт',
    subtitle:
      'Вход нужен, чтобы позже можно было восстановить доступ к аккаунту. Данные дневника сейчас хранятся только на этом устройстве.',

    statusTitle: 'Статус',
    signedIn: 'Вы вошли в аккаунт',
    signedOut: 'Вы не вошли в аккаунт',
    uid: 'ID аккаунта',

    logout: 'Выйти',

    appleTitle: 'Вход через Apple',
    appleHint:
      'Кнопка Apple системная, поэтому её текст может отображаться на языке устройства или среды запуска.',
    appleUnavailable:
      'Вход через Apple подготовлен, но финальная проверка будет доступна после активации Apple Developer Program.',
    appleTokenMissing: 'Apple не вернул данные для входа.',
    appleSignInErrorTitle: 'Ошибка входа через Apple',
    appleSignInErrorText: 'Не получилось войти через Apple.',

    emailPasswordTitle: 'Вход по email',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Пароль, минимум 6 символов',
    signIn: 'Войти',
    createAccount: 'Создать аккаунт',

    privacyTitle: 'Приватность и данные',
    accountDataTitle: 'Данные аккаунта',
    accountDataText:
      'Для входа хранится только email, ID аккаунта, способ входа и служебные данные авторизации.',
    diaryDataTitle: 'Данные дневника',
    diaryDataText:
      'Вес, калории, финансы, заметки, привычки и история дня сейчас хранятся только на этом устройстве.',
    syncTitle: 'Синхронизация',
    syncText:
      'Облачная синхронизация дневника сейчас не подключена. Данные не переносятся автоматически на другие устройства.',

    deviceDataTitle: 'Данные на этом устройстве',
    deviceDataText:
      'Можно удалить дневник и настройки только с этого телефона. Аккаунт при этом останется.',
    deleteDeviceData: 'Удалить данные на этом устройстве',
    deleteDeviceDataTitle: 'Удалить данные на этом устройстве?',
    deleteDeviceDataMessage:
      'Будут удалены история дней, сегодняшний день, цели, расчёт расхода и напоминания. Аккаунт останется.',
    deleteDeviceDataSecondTitle: 'Точно удалить?',
    deleteDeviceDataSecondMessage:
      'Это действие нельзя отменить. Перед удалением лучше сделать экспорт данных в настройках.',
    deleteDeviceDataConfirm: 'Да, удалить данные',
    deleteDeviceDataDoneTitle: 'Готово',
    deleteDeviceDataDoneText: 'Данные на этом устройстве удалены.',

    accountDeletionTitle: 'Удаление аккаунта',
    accountDeletionText:
      'Удаление аккаунта удалит только доступ к аккаунту. Данные дневника на этом устройстве останутся, если не удалить их отдельно.',
    deleteAccount: 'Удалить аккаунт',

    deleteAccountTitle: 'Удалить аккаунт?',
    deleteAccountMessage:
      'Аккаунт будет удалён. Данные Soft Day на этом устройстве останутся.',
    deleteAccountConfirm: 'Удалить аккаунт',
    deleteAccountDoneTitle: 'Готово',
    deleteAccountDoneText: 'Аккаунт удалён.',
    deleteAccountErrorTitle: 'Не получилось удалить аккаунт',
    deleteAccountErrorText:
      'Возможно, требуется повторный вход перед удалением аккаунта. Выйди, войди снова и повтори удаление.',

    checkDataTitle: 'Проверь данные',
    checkSignUpData: 'Email должен быть заполнен, пароль — минимум 6 символов.',
    checkSignInData: 'Введи email и пароль.',

    accountCreatedTitle: 'Готово',
    accountCreatedText: 'Аккаунт создан.',
    signedInTitle: 'Готово',
    signedInText: 'Вход выполнен.',
    signedOutTitle: 'Готово',
    signedOutText: 'Ты вышла из аккаунта.',

    signUpErrorTitle: 'Ошибка регистрации',
    signUpErrorText: 'Не получилось создать аккаунт.',
    signInErrorTitle: 'Ошибка входа',
    signInErrorText: 'Не получилось войти.',
    logoutErrorTitle: 'Ошибка',
    logoutErrorText: 'Не получилось выйти.',
    deviceDataErrorTitle: 'Не получилось удалить данные',
    deviceDataErrorText: 'Попробуй ещё раз.',

    cancel: 'Отмена',
    loading: 'Загрузка...',
  },

  en: {
    back: '← Back',
    title: 'Account',
    subtitle:
      'Sign-in is used to keep access to your account. Diary data is currently stored only on this device.',

    statusTitle: 'Status',
    signedIn: 'You are signed in',
    signedOut: 'You are not signed in',
    uid: 'Account ID',

    logout: 'Sign out',

    appleTitle: 'Sign in with Apple',
    appleHint:
      'The Apple button is system-rendered, so its text may follow the device or runtime language.',
    appleUnavailable:
      'Sign in with Apple is prepared, but final testing will be available after Apple Developer Program activation.',
    appleTokenMissing: 'Apple did not return sign-in data.',
    appleSignInErrorTitle: 'Apple sign-in error',
    appleSignInErrorText: 'Could not sign in with Apple.',

    emailPasswordTitle: 'Email sign-in',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password, minimum 6 characters',
    signIn: 'Sign in',
    createAccount: 'Create account',

    privacyTitle: 'Privacy & Data',
    accountDataTitle: 'Account data',
    accountDataText:
      'Only your email, account ID, sign-in method, and authentication service data are stored for sign-in.',
    diaryDataTitle: 'Diary data',
    diaryDataText:
      'Weight, calories, finances, notes, habits, and daily history are currently stored only on this device.',
    syncTitle: 'Sync',
    syncText:
      'Cloud sync for diary data is not connected right now. Data is not transferred automatically to other devices.',

    deviceDataTitle: 'Data on this device',
    deviceDataText:
      'You can delete diary data and settings from this phone only. Your account will stay active.',
    deleteDeviceData: 'Delete data on this device',
    deleteDeviceDataTitle: 'Delete data on this device?',
    deleteDeviceDataMessage:
      'Daily history, today’s entry, goals, calorie calculation settings, and reminders will be deleted. Your account will stay.',
    deleteDeviceDataSecondTitle: 'Delete for sure?',
    deleteDeviceDataSecondMessage:
      'This action cannot be undone. It is better to export your data in Settings before deleting.',
    deleteDeviceDataConfirm: 'Yes, delete data',
    deleteDeviceDataDoneTitle: 'Done',
    deleteDeviceDataDoneText: 'Data on this device deleted.',

    accountDeletionTitle: 'Account deletion',
    accountDeletionText:
      'Deleting the account removes only account access. Diary data on this device will stay unless you delete it separately.',
    deleteAccount: 'Delete account',

    deleteAccountTitle: 'Delete account?',
    deleteAccountMessage:
      'The account will be deleted. Soft Day data on this device will stay.',
    deleteAccountConfirm: 'Delete account',
    deleteAccountDoneTitle: 'Done',
    deleteAccountDoneText: 'Account deleted.',
    deleteAccountErrorTitle: 'Could not delete account',
    deleteAccountErrorText:
      'Recent sign-in may be required before deleting the account. Sign out, sign in again, and try deleting again.',

    checkDataTitle: 'Check the data',
    checkSignUpData: 'Email is required. Password must be at least 6 characters.',
    checkSignInData: 'Enter email and password.',

    accountCreatedTitle: 'Done',
    accountCreatedText: 'Account created.',
    signedInTitle: 'Done',
    signedInText: 'Signed in.',
    signedOutTitle: 'Done',
    signedOutText: 'Signed out.',

    signUpErrorTitle: 'Registration error',
    signUpErrorText: 'Could not create an account.',
    signInErrorTitle: 'Sign-in error',
    signInErrorText: 'Could not sign in.',
    logoutErrorTitle: 'Error',
    logoutErrorText: 'Could not sign out.',
    deviceDataErrorTitle: 'Could not delete data',
    deviceDataErrorText: 'Please try again.',

    cancel: 'Cancel',
    loading: 'Loading...',
  },
};

const createRandomNonce = (length = 32) => {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
  let result = '';

  for (let index = 0; index < length; index += 1) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }

  return result;
};

const isDayEntryKey = (key: string) => {
  return /^soft-day-\d{4}-\d{2}-\d{2}$/.test(key);
};

export default function AuthScreen() {
  const router = useRouter();

  const [language, setLanguage] = useState<AppLanguage>(getAutomaticLanguage());
  const t = texts[language];

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  useEffect(() => {
    loadLanguage();
    checkAppleAvailability();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
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

  const checkAppleAvailability = async () => {
    if (Platform.OS !== 'ios') {
      setIsAppleAvailable(false);
      return;
    }

    const available = await AppleAuthentication.isAvailableAsync();
    setIsAppleAvailable(available);
  };

  const signInWithApple = async () => {
    try {
      setIsLoading(true);

      const rawNonce = createRandomNonce();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!appleCredential.identityToken) {
        Alert.alert(t.appleSignInErrorTitle, t.appleTokenMissing);
        return;
      }

      const provider = new OAuthProvider('apple.com');
      const firebaseCredential = provider.credential({
        idToken: appleCredential.identityToken,
        rawNonce,
      });

      await signInWithCredential(auth, firebaseCredential);

      Alert.alert(t.signedInTitle, t.signedInText);
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }

      Alert.alert(
        t.appleSignInErrorTitle,
        error instanceof Error ? error.message : t.appleSignInErrorText
      );
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async () => {
    try {
      setIsLoading(true);

      if (!email.trim() || password.length < 6) {
        Alert.alert(t.checkDataTitle, t.checkSignUpData);
        return;
      }

      await createUserWithEmailAndPassword(auth, email.trim(), password);

      Alert.alert(t.accountCreatedTitle, t.accountCreatedText);
    } catch (error) {
      Alert.alert(
        t.signUpErrorTitle,
        error instanceof Error ? error.message : t.signUpErrorText
      );
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async () => {
    try {
      setIsLoading(true);

      if (!email.trim() || !password) {
        Alert.alert(t.checkDataTitle, t.checkSignInData);
        return;
      }

      await signInWithEmailAndPassword(auth, email.trim(), password);

      Alert.alert(t.signedInTitle, t.signedInText);
    } catch (error) {
      Alert.alert(
        t.signInErrorTitle,
        error instanceof Error ? error.message : t.signInErrorText
      );
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      Alert.alert(t.signedOutTitle, t.signedOutText);
    } catch (error) {
      Alert.alert(
        t.logoutErrorTitle,
        error instanceof Error ? error.message : t.logoutErrorText
      );
    }
  };

  const confirmDeleteAccount = () => {
    if (!auth.currentUser) {
      return;
    }

    Alert.alert(t.deleteAccountTitle, t.deleteAccountMessage, [
      {
        text: t.cancel,
        style: 'cancel',
      },
      {
        text: t.deleteAccountConfirm,
        style: 'destructive',
        onPress: deleteAccount,
      },
    ]);
  };

  const deleteAccount = async () => {
    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        return;
      }

      await deleteUser(currentUser);

      Alert.alert(t.deleteAccountDoneTitle, t.deleteAccountDoneText);
    } catch (error) {
      Alert.alert(
        t.deleteAccountErrorTitle,
        error instanceof Error ? error.message : t.deleteAccountErrorText
      );
    }
  };

  const confirmDeleteDeviceData = () => {
    Alert.alert(t.deleteDeviceDataTitle, t.deleteDeviceDataMessage, [
      {
        text: t.cancel,
        style: 'cancel',
      },
      {
        text: t.deleteDeviceDataConfirm,
        style: 'destructive',
        onPress: confirmDeleteDeviceDataSecondStep,
      },
    ]);
  };

  const confirmDeleteDeviceDataSecondStep = () => {
    Alert.alert(t.deleteDeviceDataSecondTitle, t.deleteDeviceDataSecondMessage, [
      {
        text: t.cancel,
        style: 'cancel',
      },
      {
        text: t.deleteDeviceDataConfirm,
        style: 'destructive',
        onPress: deleteDeviceData,
      },
    ]);
  };

  const deleteDeviceData = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      const allKeys = await AsyncStorage.getAllKeys();

      const dayEntryKeys = allKeys.filter(isDayEntryKey);
      const keysToDelete = [...LOCAL_DATA_KEYS, ...dayEntryKeys];

      await AsyncStorage.multiRemove(keysToDelete);

      Alert.alert(t.deleteDeviceDataDoneTitle, t.deleteDeviceDataDoneText);
    } catch (error) {
      Alert.alert(
        t.deviceDataErrorTitle,
        error instanceof Error ? error.message : t.deviceDataErrorText
      );
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
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.statusTitle}</Text>

        {user ? (
          <>
            <Text style={styles.statusGood}>{t.signedIn}</Text>
            <Text style={styles.userText}>{user.email}</Text>
            <Text style={styles.userText}>
              {t.uid}: {user.uid}
            </Text>

            <TouchableOpacity
              style={styles.dangerButton}
              activeOpacity={0.85}
              onPress={logout}
            >
              <Text style={styles.dangerButtonText}>{t.logout}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.statusMuted}>{t.signedOut}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.appleTitle}</Text>

        {isAppleAvailable ? (
          <>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={18}
              style={styles.appleButton}
              onPress={signInWithApple}
            />

            <Text style={styles.smallHint}>{t.appleHint}</Text>
          </>
        ) : (
          <Text style={styles.statusMuted}>{t.appleUnavailable}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.emailPasswordTitle}</Text>

        <TextInput
          style={styles.input}
          placeholder={t.emailPlaceholder}
          placeholderTextColor={colors.mutedText}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder={t.passwordPlaceholder}
          placeholderTextColor={colors.mutedText}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          disabled={isLoading}
          onPress={signIn}
        >
          <Text style={styles.primaryButtonText}>
            {isLoading ? t.loading : t.signIn}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.85}
          disabled={isLoading}
          onPress={signUp}
        >
          <Text style={styles.secondaryButtonText}>{t.createAccount}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.privacyTitle}</Text>

        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>{t.accountDataTitle}</Text>
          <Text style={styles.infoText}>{t.accountDataText}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>{t.diaryDataTitle}</Text>
          <Text style={styles.infoText}>{t.diaryDataText}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>{t.syncTitle}</Text>
          <Text style={styles.infoText}>{t.syncText}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.deviceDataTitle}</Text>
        <Text style={styles.privacyText}>{t.deviceDataText}</Text>

        <TouchableOpacity
          style={styles.dangerButton}
          activeOpacity={0.85}
          onPress={confirmDeleteDeviceData}
        >
          <Text style={styles.dangerButtonText}>{t.deleteDeviceData}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.accountDeletionTitle}</Text>
        <Text style={styles.privacyText}>{t.accountDeletionText}</Text>

        <TouchableOpacity
          style={[styles.dangerButton, !user && styles.disabledButton]}
          activeOpacity={0.85}
          disabled={!user}
          onPress={confirmDeleteAccount}
        >
          <Text style={styles.dangerButtonText}>{t.deleteAccount}</Text>
        </TouchableOpacity>
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
    fontSize: 38,
    fontWeight: '800',
    color: colors.hunterGreen,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.mutedText,
    lineHeight: 22,
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
  cardTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.deepBrown,
    marginBottom: 12,
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
    marginBottom: 12,
  },
  appleButton: {
    width: '100%',
    height: 52,
  },
  smallHint: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: colors.hunterGreen,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: colors.sand,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: colors.deepBrown,
    fontSize: 16,
    fontWeight: '800',
  },
  dangerButton: {
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.softRed,
    marginTop: 16,
  },
  dangerButtonText: {
    color: colors.softRed,
    fontSize: 16,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.45,
  },
  statusGood: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.hunterGreen,
    marginBottom: 8,
  },
  statusMuted: {
    fontSize: 16,
    color: colors.mutedText,
    lineHeight: 22,
  },
  userText: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
  },
  privacyText: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 21,
  },
  infoBlock: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.deepBrown,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
  },
});