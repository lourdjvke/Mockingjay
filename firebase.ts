import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDl1X4gsun7z0FG0I3Bb--UJjuTNaeuu18",
  authDomain: "mockingjaycob.firebaseapp.com",
  projectId: "mockingjaycob",
  storageBucket: "mockingjaycob.firebasestorage.app",
  messagingSenderId: "303543417290",
  appId: "1:303543417290:web:aa795e40d95f6006d07733",
  measurementId: "G-2VFF8TKCPT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getDatabase(app);
