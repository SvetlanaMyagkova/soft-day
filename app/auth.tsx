import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import {
    createUserWithEmailAndPassword,
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

const texts = {
  ru: {
    back: '← Назад',
    title: 'Аккаунт',
    subtitle:
      'Вход нужен, чтобы позже безопасно подключить синхронизацию и восстановление данных. Сейчас данные дневника всё ещё хранятся локально на телефоне.',

    statusTitle: 'Текущий статус',
    signedIn: 'Пользователь авторизован',
    signedOut: 'Пользователь не авторизован',
    uid: 'UID',

    logout: 'Выйти',

    appleTitle: 'Apple ID',
    appleUnavailable:
      'Вход через Apple доступен только на поддерживаемых iOS-устройствах.',
    appleTokenMissing: 'Apple не вернул identity token.',
    appleSignInErrorTitle: 'Ошибка Apple Sign-In',
    appleSignInErrorText: 'Не получилось войти через Apple.',

    emailPasswordTitle: 'Email / Password',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Пароль, минимум 6 символов',
    signIn: 'Войти',
    createAccount: 'Создать аккаунт',

    privacyTitle: 'Приватность',
    privacyText:
      'Сейчас в Firebase хранится только аккаунт: email и технический UID. Вес, калории, финансы, заметки и история дня пока остаются локально на устройстве.',

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

    loading: 'Загрузка...',
  },

  en: {
    back: '← Back',
    title: 'Account',
    subtitle:
      'Sign-in will later allow secure sync and data recovery. For now, diary data is still stored locally on this phone.',

    statusTitle: 'Current status',
    signedIn: 'User is signed in',
    signedOut: 'User is not signed in',
    uid: 'UID',

    logout: 'Sign out',

    appleTitle: 'Apple ID',
    appleUnavailable:
      'Sign in with Apple is available only on supported iOS devices.',
    appleTokenMissing: 'Apple did not return an identity token.',
    appleSignInErrorTitle: 'Apple Sign-In error',
    appleSignInErrorText: 'Could not sign in with Apple.',

    emailPasswordTitle: 'Email / Password',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password, minimum 6 characters',
    signIn: 'Sign in',
    createAccount: 'Create account',

    privacyTitle: 'Privacy',
    privacyText:
      'Right now Firebase stores only the account: email and technical UID. Weight, calories, finances, notes, and daily history still stay locally on the device.',

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
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={18}
            style={styles.appleButton}
            onPress={signInWithApple}
          />
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
        <Text style={styles.privacyText}>{t.privacyText}</Text>
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
    paddingTop: 60,
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
});