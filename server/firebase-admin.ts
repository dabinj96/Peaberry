import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | undefined;
let firebaseInitialized = false;

try {
  // Use the VITE env variable which we know is set
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  
  // Check if Firebase project ID is available
  if (firebaseProjectId) {
    // Initialize the app
    firebaseApp = admin.initializeApp({
      projectId: firebaseProjectId
    });
    console.log(`Firebase Admin initialized with project ID: ${firebaseProjectId}`);
    firebaseInitialized = true;
  } else {
    console.warn('FIREBASE_PROJECT_ID environment variable not set. OAuth verification will not work.');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  // Don't throw, allow graceful degradation
  console.warn('Firebase Admin initialization failed, OAuth verification will not work');
}

/**
 * Verify an ID token from Firebase Authentication
 * @param idToken The ID token to verify
 * @returns The decoded token if valid
 */
export async function verifyFirebaseToken(idToken: string) {
  if (!firebaseInitialized) {
    throw new Error('Firebase Admin is not initialized. Cannot verify token.');
  }
  
  try {
    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw error;
  }
}