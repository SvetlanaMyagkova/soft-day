import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
    getAuth,
    initializeAuth,
} from 'firebase/auth';

const { getReactNativePersistence } = require('firebase/auth');

const firebaseConfig = {
  apiKey: 'AIzaSyBWYnrTcpf70pK0Sm2RrWpNN2_02nz1NNU',
  authDomain: 'soft-day-49dda.firebaseapp.com',
  projectId: 'soft-day-49dda',
  storageBucket: 'soft-day-49dda.firebasestorage.app',
  messagingSenderId: '216289271322',
  appId: '1:216289271322:web:bf747018aa761618b03ba3',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let authInstance;

try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  authInstance = getAuth(app);
}

export const auth = authInstance;

export default app;