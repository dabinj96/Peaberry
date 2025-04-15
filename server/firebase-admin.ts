import admin from 'firebase-admin';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | undefined;
let firebaseInitialized = false;

try {
  // Use the VITE env variable which we know is set
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const firebaseApiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  
  // Check for service account file (preferred method)
  
  const serviceAccountPaths = [
    './firebase-service-account.json',
    './service-account.json',
    './.firebase-service-account.json'
  ];
  
  let serviceAccountPath = null;
  
  // Check if any of the potential service account files exist
  for (const potentialPath of serviceAccountPaths) {
    if (fs.existsSync(potentialPath)) {
      serviceAccountPath = potentialPath;
      break;
    }
  }

  // Check if Firebase project ID is available
  if (firebaseProjectId) {
    // First try to initialize with service account file if available
    if (serviceAccountPath) {
      try {
        console.log(`Attempting to initialize Firebase Admin with service account file: ${serviceAccountPath}`);
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: firebaseProjectId
        });
        console.log("Successfully initialized Firebase Admin with service account");
        firebaseInitialized = true;
      } catch (serviceAccountError) {
        console.error("Error initializing with service account:", serviceAccountError);
        // Continue to fallback methods
      }
    } else {
      console.log("No service account file found. Checking for alternative initialization methods.");
    }
    
    // If service account initialization failed, try application default credentials
    if (!firebaseInitialized) {
      try {
        console.log("Attempting to initialize Firebase Admin with application default credentials...");
        firebaseApp = admin.initializeApp({
          projectId: firebaseProjectId,
          credential: admin.credential.applicationDefault()
        });
        console.log("Successfully initialized Firebase Admin with application default credentials");
        firebaseInitialized = true;
      } catch (credentialError) {
        console.log("Application default credentials failed, trying alternative initialization...");
        
        // Last resort: initialize with minimal credentials
        try {
          // Initialize with just project ID as a fallback
          firebaseApp = admin.initializeApp({
            projectId: firebaseProjectId,
            // For local development without service account, use cert-free auth
            credential: admin.credential.cert({
              projectId: firebaseProjectId,
              clientEmail: `firebase-adminsdk-${firebaseProjectId.slice(0, 6)}@${firebaseProjectId}.iam.gserviceaccount.com`,
              // This is a fake private key that will cause actual auth operations to fail
              // but allows the app to initialize
              privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu\nNMoSfm76oqFvAp8Gy0iz5sxjZmSnXyCdPEovGhLa0VzMaQ8s+CLOyS56YyCFGeJZ\n-----END PRIVATE KEY-----\n',
            }),
          });
          
          console.log("Initialized Firebase Admin with limited functionality (operations requiring auth will fail)");
          // We're initialized but with limited functionality
          firebaseInitialized = true;
        } catch (fallbackError) {
          console.error("Failed to initialize Firebase Admin even with fallback:", fallbackError);
          firebaseInitialized = false;
        }
      }
    }
    
    if (firebaseInitialized) {
      console.log(`Firebase Admin initialized with project ID: ${firebaseProjectId}`);
    }
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

/**
 * Delete a Firebase user by UID
 * @param uid The Firebase user UID to delete
 * @returns True if the user was deleted, false if user wasn't found or Firebase isn't initialized
 */
export async function deleteFirebaseUser(uid: string): Promise<boolean> {
  if (!firebaseInitialized) {
    console.warn('Firebase Admin is not initialized. Cannot delete Firebase user.');
    return false;
  }
  
  try {
    console.log(`Attempting to delete Firebase user with UID: ${uid}`);
    await admin.auth().deleteUser(uid);
    console.log(`Successfully deleted Firebase user with UID: ${uid}`);
    return true;
  } catch (error: any) {
    // Check if error is because user doesn't exist (already deleted)
    if (error.code === 'auth/user-not-found') {
      console.log(`Firebase user with UID ${uid} not found (may already be deleted)`);
      return true; // Consider this a success since the end state is what we want
    }
    
    console.error(`Error deleting Firebase user with UID ${uid}:`, error);
    return false;
  }
}

/**
 * Generate a password reset link for a user
 * @param email The user's email address
 * @param actionCodeSettings Settings for the action code
 * @returns The password reset link
 */
export async function generatePasswordResetLink(
  email: string, 
  actionCodeSettings?: admin.auth.ActionCodeSettings
): Promise<string> {
  if (!firebaseInitialized) {
    throw new Error('Firebase Admin is not initialized. Cannot generate password reset link.');
  }
  
  try {
    const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
    return resetLink;
  } catch (error) {
    console.error('Error generating password reset link:', error);
    throw error;
  }
}

/**
 * Verify a password reset code
 * @param code The password reset code
 * @returns The email associated with the code if valid
 */
export async function verifyPasswordResetCode(code: string): Promise<string> {
  if (!firebaseInitialized) {
    throw new Error('Firebase Admin is not initialized. Cannot verify password reset code.');
  }
  
  try {
    const email = await admin.auth().verifyPasswordResetCode(code);
    return email;
  } catch (error) {
    console.error('Error verifying password reset code:', error);
    throw error;
  }
}

/**
 * Confirm a password reset
 * @param code The password reset code
 * @param newPassword The new password
 */
export async function confirmPasswordReset(code: string, newPassword: string): Promise<void> {
  if (!firebaseInitialized) {
    throw new Error('Firebase Admin is not initialized. Cannot confirm password reset.');
  }
  
  try {
    await admin.auth().confirmPasswordReset(code, newPassword);
  } catch (error) {
    console.error('Error confirming password reset:', error);
    throw error;
  }
}

/**
 * Create a new Firebase user with email and password
 * @param email User's email address
 * @param password User's password (cleartext)
 * @param displayName Optional display name for the user
 * @returns The Firebase Auth user record with UID
 */
export async function createFirebaseUser(email: string, password: string, displayName?: string): Promise<admin.auth.UserRecord | null> {
  if (!firebaseInitialized) {
    console.warn('Firebase Admin is not initialized. Cannot create Firebase user.');
    return null;
  }
  
  try {
    // Check if a user with this email already exists
    try {
      const existingUser = await admin.auth().getUserByEmail(email);
      if (existingUser) {
        console.log(`User with email ${email} already exists in Firebase`);
        return existingUser;
      }
    } catch (error: any) {
      // If error code is auth/user-not-found, that's fine - we'll create the user
      if (error.code !== 'auth/user-not-found') {
        throw error; // For any other error, rethrow it
      }
    }
    
    // Create the user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0], // Use part before @ as default display name
      emailVerified: false // Require email verification
    });
    
    console.log(`Successfully created Firebase user: ${userRecord.uid}`);
    return userRecord;
  } catch (error: any) {
    console.error("Error creating Firebase user:", error);
    throw new Error(`Failed to create Firebase user: ${error.message}`);
  }
}