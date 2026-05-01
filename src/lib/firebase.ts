import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDWPE-REmqvDRu_VOaxw2UdG_mcTcY1wGg",
  authDomain: "general-database-c346f.firebaseapp.com",
  projectId: "general-database-c346f",
  storageBucket: "general-database-c346f.firebasestorage.app",
  messagingSenderId: "1056081761687",
  appId: "1:1056081761687:web:b6d4d622aa4d8eac7360d2",
  measurementId: "G-2N981993KM"
};

const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const db = getFirestore(app);
export const auth = getAuth(app);

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error: any) {
    console.error("Login failed", error);
    throw error;
  }
}

export const logout = async () => {
  await signOut(auth);
}
