import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// This will use the GOOGLE_APPLICATION_CREDENTIALS environment variable or
// implicit credentials if running on GCP
try {
  // Initialize the app if it hasn't been initialized already
  if (!admin.apps.length) {
    admin.initializeApp({
      // If you want to use a service account instead of project ID, you'd provide it here
      // We're using environment-based auth which is simpler for deployment
      projectId: process.env.FIREBASE_PROJECT_ID
    });
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
  try {
    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw error;
  }
}