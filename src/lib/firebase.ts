import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase config is read from environment variables.
// If you prefer, you can keep the hardcoded values from the original project here —
// Firebase client keys are safe to expose publicly (security is handled by Firestore rules).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyB4G5FOEuaEGN2XusdwOtQ86-dlAvro3Fo',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'energenius-bugvj.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'energenius-bugvj',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'energenius-bugvj.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '829251145344',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:829251145344:web:d715b9e90171b031c92065',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
