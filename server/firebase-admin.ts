import admin from 'firebase-admin';
import crypto from 'crypto';

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

/**
 * Verify Firebase Auth webhook signature
 * @param signature The signature from the 'X-Firebase-Auth-Signature' header
 * @param body The raw request body
 * @returns Whether the signature is valid
 */
export function verifyFirebaseAuthWebhookSignature(signature: string, body: string): boolean {
  if (!firebaseInitialized) {
    console.warn('Firebase Admin is not initialized. Cannot verify webhook signature.');
    return false;
  }
  
  try {
    // In a production environment, you would get this from a secure configuration
    // For the test environment, a shared secret can be used
    const webhookSecret = process.env.FIREBASE_WEBHOOK_SECRET || 'peaberry-webhook-secret';
    
    // Compute HMAC using SHA-256
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(body);
    const computedSignature = hmac.digest('hex');
    
    // Use a constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    console.error('Error verifying Firebase webhook signature:', error);
    return false;
  }
}