import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { getDatabase, ref, set, onValue, get, child } from 'firebase/database';

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
const auth = getAuth(app);
const database = getDatabase(app);
const provider = new GoogleAuthProvider();

export { auth, database, provider, signInWithPopup, onAuthStateChanged, ref, set, onValue, get, child, User };
