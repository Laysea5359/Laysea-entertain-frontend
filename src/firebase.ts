import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

// นำค่า Config จาก Firebase Console (Project Settings) มาแทนที่ตรงนี้
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSy...",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "laysea-entertain.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "laysea-entertain",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "laysea-entertain.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "...",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "..."
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export default app;
export { app };