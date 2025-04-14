import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  UserCredential,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode
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

// Send the Firebase token to our server for authentication
export const authenticateWithServer = async (userCredential: UserCredential) => {
  try {
    // Get ID token
    const idToken = await userCredential.user.getIdToken();
    
    // Send to our server
    const response = await fetch('/api/oauth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
      credentials: 'include' // Important: Ensures cookies are sent/received for session
    });

    if (!response.ok) {
      throw new Error(`Server authentication failed: ${response.statusText}`);
    }

    const userData = await response.json();
    
    // Import here to avoid circular dependency
    const { queryClient } = await import('./queryClient');
    
    // Update the query client with the user data
    queryClient.setQueryData(['/api/user'], userData);
    
    return userData;
  } catch (error) {
    console.error('Error authenticating with server:', error);
    throw error;
  }
};

// Password reset functions
export const resetPassword = async (email: string): Promise<void> => {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Set environment variables first.");
  }
  
  try {
    // Get the current URL to set as continue URL (without query parameters)
    const actionCodeSettings = {
      url: window.location.origin + '/auth?mode=resetPassword',
      handleCodeInApp: true
    };
    
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
    console.log(`Password reset email sent to ${email}`);
  } catch (error: any) {
    console.error("Error sending password reset email:", error);
    throw new Error(error.message || "Failed to send password reset email");
  }
};

export const verifyPasswordResetCode = async (code: string): Promise<string> => {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Set environment variables first.");
  }
  
  try {
    return await firebaseVerifyPasswordResetCode(auth, code);
  } catch (error: any) {
    console.error("Error verifying password reset code:", error);
    throw new Error(error.message || "Invalid or expired password reset code");
  }
};

export const confirmPasswordReset = async (code: string, newPassword: string): Promise<void> => {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Set environment variables first.");
  }
  
  try {
    await firebaseConfirmPasswordReset(auth, code, newPassword);
    console.log("Password reset successful");
  } catch (error: any) {
    console.error("Error confirming password reset:", error);
    throw new Error(error.message || "Failed to reset password");
  }
};

export { auth, googleProvider };