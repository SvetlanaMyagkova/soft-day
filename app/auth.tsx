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
  Linking,
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
import {
  DEFAULT_USER_PROFILE,
  USER_PROFILE_STORAGE_KEY,
  UserProfileGender,
  UserProfileSettings,
} from '../constants/userProfile';

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

const REMINDER_TIMES_STORAGE_KEY = 'soft-day-reminder-times';

const LOCAL_DATA_KEYS = [
  'soft-day-history',
  'soft-day-nutrition-goals',
  'soft-day-weight-goal-settings',
  'soft-day-calorie-calculation-settings',
  'soft-day-reminders',
  REMINDER_TIMES_STORAGE_KEY,
  USER_PROFILE_STORAGE_KEY,
];

const PRIVACY_POLICY_URL = 'https://svetlanamyagkova.github.io/soft-day/privacy.html';

const texts = {
  ru: {
    back: '← Назад',
    title: 'Аккаунт',
    subtitle:
      'Вход нужен, чтобы позже можно было восстановить доступ к аккаунту. Данные дневника сейчас хранятся только на этом устройстве.',

    profileTitle: 'Профиль',
    displayNameLabel: 'Как к тебе обращаться?',
    displayNamePlaceholder: 'Например, Света',
    displayNameDescription:
      'Soft Day будет использовать это имя в мягких подсказках и напоминаниях 🌿',
    genderTitle: 'Пол',
    female: 'Женский',
    male: 'Мужской',
    genderDescription:
      'Это нужно для грамматически правильных фраз в уведомлениях и подсказках.',
    saveProfile: 'Сохранить профиль',
    profileSaved: 'Профиль сохранён.',
    profileSaveErrorTitle: 'Не получилось сохранить профиль',
    profileSaveErrorText: 'Попробуй ещё раз.',

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
    openPrivacyPolicy: 'Открыть политику конфиденциальности',
    openWebPrivacyPolicy: 'Открыть веб-версию политики',

    deviceDataTitle: 'Данные на этом устройстве',
    deviceDataText:
      'Можно удалить дневник, настройки, профиль и напоминания только с этого телефона. Аккаунт при этом останется.',
    deleteDeviceData: 'Удалить данные на этом устройстве',
    deleteDeviceDataTitle: 'Удалить данные на этом устройстве?',
    deleteDeviceDataMessage:
      'Будут удалены история дней, сегодняшний день, цели, профиль, время напоминаний и настройки. Аккаунт останется.',
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
    webPrivacyErrorTitle: 'Не получилось открыть ссылку',
    webPrivacyErrorText: 'Попробуй открыть политику конфиденциальности позже.',

    cancel: 'Отмена',
    loading: 'Загрузка...',
  },

  en: {
    back: '← Back',
    title: 'Account',
    subtitle:
      'Sign-in is used to keep access to your account. Diary data is currently stored only on this device.',

    profileTitle: 'Profile',
    displayNameLabel: 'What should Soft Day call you?',
    displayNamePlaceholder: 'For example, Sveta',
    displayNameDescription:
      'Soft Day will use this name in gentle check-ins and reminders 🌿',
    genderTitle: '',
    female: '',
    male: '',
    genderDescription: '',
    saveProfile: 'Save profile',
    profileSaved: 'Profile saved.',
    profileSaveErrorTitle: 'Could not save profile',
    profileSaveErrorText: 'Please try again.',

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
    openPrivacyPolicy: 'Open Privacy Policy',
    openWebPrivacyPolicy: 'Open web Privacy Policy',

    deviceDataTitle: 'Data on this device',
    deviceDataText:
      'You can delete diary data, settings, profile, and reminders from this phone only. Your account will stay active.',
    deleteDeviceData: 'Delete data on this device',
    deleteDeviceDataTitle: 'Delete data on this device?',
    deleteDeviceDataMessage:
      'Daily history, today’s entry, goals, profile, reminder times, and settings will be deleted. Your account will stay.',
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
    webPrivacyErrorTitle: 'Could not open link',
    webPrivacyErrorText: 'Please try opening the Privacy Policy later.',

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

  const [userProfile, setUserProfile] =
    useState<UserProfileSettings>(DEFAULT_USER_PROFILE);
  const [profileMessage, setProfileMessage] = useState('');

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  useEffect(() => {
    loadLanguage();
    loadUserProfile();
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

  const saveUserProfile = async () => {
    try {
      const nextProfile: UserProfileSettings = {
        displayName: userProfile.displayName.trim(),
        gender: userProfile.gender,
      };

      await AsyncStorage.setItem(
        USER_PROFILE_STORAGE_KEY,
        JSON.stringify(nextProfile)
      );

      setUserProfile(nextProfile);
      setProfileMessage(t.profileSaved);

      setTimeout(() => setProfileMessage(''), 2500);
    } catch (error) {
      Alert.alert(
        t.profileSaveErrorTitle,
        error instanceof Error ? error.message : t.profileSaveErrorText
      );
    }
  };

  const updateProfileName = (displayName: string) => {
    setUserProfile((currentProfile) => ({
      ...currentProfile,
      displayName,
    }));
  };

  const updateProfileGender = (gender: UserProfileGender) => {
    setUserProfile((currentProfile) => ({
      ...currentProfile,
      gender,
    }));
  };

  const checkAppleAvailability = async () => {
    if (Platform.OS !== 'ios') {
      setIsAppleAvailable(false);
      return;
    }

    const available = await AppleAuthentication.isAvailableAsync();
    setIsAppleAvailable(available);
  };

  const openWebPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch (error) {
      Alert.alert(
        t.webPrivacyErrorTitle,
        error instanceof Error ? error.message : t.webPrivacyErrorText
      );
    }
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

      setUserProfile(DEFAULT_USER_PROFILE);

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
        <Text style={styles.cardTitle}>{t.profileTitle}</Text>

        <Text style={styles.fieldLabel}>{t.displayNameLabel}</Text>
        <TextInput
          style={styles.input}
          placeholder={t.displayNamePlaceholder}
          placeholderTextColor={colors.mutedText}
          value={userProfile.displayName}
          onChangeText={updateProfileName}
        />

        <Text style={styles.smallHint}>{t.displayNameDescription}</Text>

        {language === 'ru' ? (
          <>
            <Text style={styles.fieldLabel}>{t.genderTitle}</Text>

            <View style={styles.genderButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  userProfile.gender === 'female' && styles.genderButtonActive,
                ]}
                activeOpacity={0.85}
                onPress={() => updateProfileGender('female')}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    userProfile.gender === 'female' &&
                      styles.genderButtonTextActive,
                  ]}
                >
                  {t.female}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.genderButton,
                  userProfile.gender === 'male' && styles.genderButtonActive,
                ]}
                activeOpacity={0.85}
                onPress={() => updateProfileGender('male')}
              >
                <Text
                  style={[
                    styles.genderButtonText,
                    userProfile.gender === 'male' &&
                      styles.genderButtonTextActive,
                  ]}
                >
                  {t.male}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.smallHint}>{t.genderDescription}</Text>
          </>
        ) : null}

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.85}
          onPress={saveUserProfile}
        >
          <Text style={styles.secondaryButtonText}>{t.saveProfile}</Text>
        </TouchableOpacity>

        {profileMessage ? (
          <Text style={styles.savedMessage}>{profileMessage}</Text>
        ) : null}
      </View>

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

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.85}
          onPress={() => router.push('/privacy')}
        >
          <Text style={styles.secondaryButtonText}>{t.openPrivacyPolicy}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryOutlineButton}
          activeOpacity={0.85}
          onPress={openWebPrivacyPolicy}
        >
          <Text style={styles.secondaryOutlineButtonText}>
            {t.openWebPrivacyPolicy}
          </Text>
        </TouchableOpacity>
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
    marginBottom: 12,
  },
  genderButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  genderButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  genderButtonActive: {
    backgroundColor: colors.hunterGreen,
    borderColor: colors.hunterGreen,
  },
  genderButtonText: {
    color: colors.deepBrown,
    fontSize: 15,
    fontWeight: '800',
  },
  genderButtonTextActive: {
    color: colors.surface,
  },
  appleButton: {
    width: '100%',
    height: 52,
  },
  smallHint: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 12,
  },
  savedMessage: {
    color: colors.hunterGreen,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
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
  secondaryOutlineButton: {
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryOutlineButtonText: {
    color: colors.hunterGreen,
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