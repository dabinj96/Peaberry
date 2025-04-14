import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  UserCredential,
  signOut as firebaseSignOut
} from "firebase/auth";

// Firebase configuration
// These values must be set in environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase only if we have the necessary environment variables
let app: any;
let auth: any;
let googleProvider: any;

const isFirebaseConfigured = () => {
  return import.meta.env.VITE_FIREBASE_API_KEY && 
         import.meta.env.VITE_FIREBASE_PROJECT_ID && 
         import.meta.env.VITE_FIREBASE_APP_ID;
};

if (isFirebaseConfigured()) {
  try {
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    
    // Always request email scope for user identification
    googleProvider.addScope('email');
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
}

// Sign in with Google using popup
export const signInWithGoogle = async (): Promise<UserCredential | null> => {
  if (!isFirebaseConfigured()) {
    console.error("Firebase is not configured. Set environment variables first.");
    return null;
  }
  
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error("Error signing in with Google:", error);
    return null;
  }
};

// Sign in with Google using redirect (better for mobile)
export const signInWithGoogleRedirect = async () => {
  if (!isFirebaseConfigured()) {
    console.error("Firebase is not configured. Set environment variables first.");
    return;
  }
  
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error("Error redirecting to Google sign-in:", error);
  }
};

// Handle redirect result
export const handleGoogleRedirectResult = async (): Promise<UserCredential | null> => {
  if (!isFirebaseConfigured()) {
    console.error("Firebase is not configured. Set environment variables first.");
    return null;
  }
  
  try {
    return await getRedirectResult(auth);
  } catch (error) {
    console.error("Error handling Google redirect result:", error);
    return null;
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  if (!isFirebaseConfigured()) {
    return;
  }
  
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

export { auth, googleProvider };