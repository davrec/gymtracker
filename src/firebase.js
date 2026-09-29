import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";


// Incolla qui l'oggetto della tua console Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDIj-DayjyVM4roYjp4GxLU-S6zj8ElF4Q",
  authDomain: "gym-tracker-128ac.firebaseapp.com",
  projectId: "gym-tracker-128ac",
  storageBucket: "gym-tracker-128ac.firebasestorage.app",
  messagingSenderId: "678404761427",
  appId: "1:678404761427:web:db49c9d85866041923a3a6",
  measurementId: "G-ELM3FYHZRF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
const analytics = getAnalytics(app);

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);







