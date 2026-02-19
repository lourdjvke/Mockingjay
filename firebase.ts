import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { getDatabase, ref, set, get, onValue, push, remove, type DatabaseReference } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDl1X4gsun7z0FG0I3Bb--UJjuTNaeuu18",
  authDomain: "mockingjaycob.firebaseapp.com",
  databaseURL: "https://mockingjaycob-default-rtdb.firebaseio.com",
  projectId: "mockingjaycob",
  storageBucket: "mockingjaycob.firebasestorage.app",
  messagingSenderId: "303543417290",
  appId: "1:303543417290:web:aa795e40d95f6006d07733",
  measurementId: "G-2VFF8TKCPT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Auth functions
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);
export const onAuthChange = (cb: (user: User | null) => void) => onAuthStateChanged(auth, cb);

// RTDB helpers
export const userRef = (uid: string, path: string): DatabaseReference => ref(db, `users/${uid}/${path}`);

export const saveProject = async (uid: string, projectId: string, data: any) => {
  await set(ref(db, `users/${uid}/projects/${projectId}`), {
    ...data,
    updatedAt: Date.now()
  });
};

export const loadProject = async (uid: string, projectId: string) => {
  const snap = await get(ref(db, `users/${uid}/projects/${projectId}`));
  return snap.exists() ? snap.val() : null;
};

export const loadAllProjects = async (uid: string) => {
  const snap = await get(ref(db, `users/${uid}/projects`));
  return snap.exists() ? snap.val() : {};
};

export const deleteProject = async (uid: string, projectId: string) => {
  await remove(ref(db, `users/${uid}/projects/${projectId}`));
};

export const createNewProject = async (uid: string, name: string, brandContext?: any) => {
  const projectRef = push(ref(db, `users/${uid}/projects`));
  const projectId = projectRef.key!;
  const data = {
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    editorState: null,
    brandContext: brandContext || null
  };
  await set(projectRef, data);
  return projectId;
};

// Brand guidelines
export const saveBrandKit = async (uid: string, kitId: string, data: any) => {
  await set(ref(db, `users/${uid}/brandKits/${kitId}`), {
    ...data,
    updatedAt: Date.now()
  });
};

export const loadAllBrandKits = async (uid: string) => {
  const snap = await get(ref(db, `users/${uid}/brandKits`));
  return snap.exists() ? snap.val() : {};
};

export const deleteBrandKit = async (uid: string, kitId: string) => {
  await remove(ref(db, `users/${uid}/brandKits/${kitId}`));
};

export const onProjectChange = (uid: string, projectId: string, cb: (data: any) => void) => {
  return onValue(ref(db, `users/${uid}/projects/${projectId}`), (snap) => {
    cb(snap.exists() ? snap.val() : null);
  });
};

export type { User };
