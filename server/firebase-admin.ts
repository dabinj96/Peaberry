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

/**
 * Check if a user exists in Firebase Auth by provider ID and UID
 * @param providerId The provider ID (e.g., 'google.com')
 * @param providerUid The provider UID
 * @returns True if the user exists, false otherwise
 */
export async function checkUserExistsInFirebase(providerId: string, providerUid: string): Promise<boolean> {
  if (!firebaseInitialized) {
    console.warn('Firebase Admin is not initialized. Cannot check if user exists.');
    return false;
  }
  
  try {
    // For google.com provider, the UID is the user's Google ID
    if (providerId === 'google.com') {
      try {
        // Try to get user by email or UID
        // This is approximate - Firebase Admin SDK doesn't directly support looking up by provider UID
        const users = await admin.auth().listUsers();
        return users.users.some(user => 
          user.providerData.some(provider => 
            provider.providerId === providerId && provider.uid === providerUid
          )
        );
      } catch (e) {
        console.error('Error finding Firebase user by provider:', e);
        return false;
      }
    } 
    return false;
  } catch (error) {
    console.error('Error checking if user exists in Firebase:', error);
    return false;
  }
}

/**
 * Get all Firebase users and their provider information
 * @returns Array of Firebase user records
 */
export async function listFirebaseUsers(): Promise<admin.auth.UserRecord[]> {
  if (!firebaseInitialized) {
    console.warn('Firebase Admin is not initialized. Cannot list users.');
    return [];
  }
  
  try {
    const listUsersResult = await admin.auth().listUsers();
    return listUsersResult.users;
  } catch (error) {
    console.error('Error listing Firebase users:', error);
    return [];
  }
}

/**
 * Get a Firebase user by email
 * @param email The user's email address
 * @returns The Firebase user record or null if not found
 */
export async function getFirebaseUserByEmail(email: string): Promise<admin.auth.UserRecord | null> {
  if (!firebaseInitialized) {
    console.warn('Firebase Admin is not initialized. Cannot get user by email.');
    return null;
  }
  
  try {
    const user = await admin.auth().getUserByEmail(email);
    return user;
  } catch (error: any) {
    // Not found is expected in some cases, so we don't log as error
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    console.error(`Error getting Firebase user by email ${email}:`, error);
    return null;
  }
}

/**
 * Get a Firebase user by UID
 * @param uid The Firebase UID
 * @returns The Firebase user record or null if not found
 */
export async function getFirebaseUserByUid(uid: string): Promise<admin.auth.UserRecord | null> {
  if (!firebaseInitialized) {
    console.warn('Firebase Admin is not initialized. Cannot get user by UID.');
    return null;
  }
  
  try {
    const user = await admin.auth().getUser(uid);
    return user;
  } catch (error: any) {
    // Not found is expected in some cases, so we don't log as error
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    console.error(`Error getting Firebase user by UID ${uid}:`, error);
    return null;
  }
}

/**
 * Fetch provider details for a Firebase user
 * @param user Firebase user record
 * @param providerId The provider ID (e.g., 'google.com')
 * @returns Provider data or null if not found
 */
export function getProviderData(user: admin.auth.UserRecord, providerId: string = 'google.com') {
  if (!user || !user.providerData) return null;
  
  return user.providerData.find(provider => provider.providerId === providerId) || null;
}