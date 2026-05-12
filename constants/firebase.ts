import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBWYnrTcpf70pK0Sm2RrWpNN2_02nz1NNU',
  authDomain: 'soft-day-49dda.firebaseapp.com',
  projectId: 'soft-day-49dda',
  storageBucket: 'soft-day-49dda.firebasestorage.app',
  messagingSenderId: '216289271322',
  appId: '1:216289271322:web:bf747018aa761618b03ba3',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export default app;