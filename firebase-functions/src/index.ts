import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import * as crypto from 'crypto';

// Initialize Firebase Admin
admin.initializeApp();

// Configuration (should be stored in environment variables in production)
const config = {
  webhookEndpoint: 'https://your-peaberry-domain.replit.app/api/webhooks/firebase-auth',
  webhookSecret: process.env.FIREBASE_WEBHOOK_SECRET || 'peaberry-webhook-secret'
};

/**
 * Generates a signature for the webhook payload
 * @param payload The JSON payload to sign
 * @returns The signature as a hex string
 */
function generateSignature(payload: string): string {
  const hmac = crypto.createHmac('sha256', config.webhookSecret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Auth trigger that fires when a user's password is changed
 */
export const onPasswordChange = functions.auth.user().onPasswordUpdate(async (event) => {
  try {
    const { uid, email } = event.data;
    
    if (!email) {
      console.error('Password changed for user without email');
      return null;
    }
    
    console.log(`Password changed for user: ${email} (${uid})`);
    
    // Prepare webhook payload
    const payload = {
      event: 'password.update',
      data: {
        uid,
        email,
        timestamp: new Date().toISOString()
      }
    };
    
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString);
    
    // Send webhook to our API
    const response = await axios.post(
      config.webhookEndpoint,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-Auth-Signature': signature
        }
      }
    );
    
    console.log(`Webhook sent successfully: ${response.status}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending password change webhook:', error);
    return { error: error.message };
  }
});

/**
 * Auth trigger that fires when a user is created
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    const { uid, email } = user;
    
    if (!email) {
      console.error('User created without email');
      return null;
    }
    
    console.log(`New user created: ${email} (${uid})`);
    
    // Prepare webhook payload
    const payload = {
      event: 'user.create',
      data: {
        uid,
        email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        timestamp: new Date().toISOString()
      }
    };
    
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString);
    
    // Send webhook to our API
    const response = await axios.post(
      config.webhookEndpoint,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-Auth-Signature': signature
        }
      }
    );
    
    console.log(`User creation webhook sent successfully: ${response.status}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending user creation webhook:', error);
    return { error: error.message };
  }
});

/**
 * Auth trigger that fires when a user is deleted
 */
export const onUserDelete = functions.auth.user().onDelete(async (user) => {
  try {
    const { uid, email } = user;
    
    console.log(`User deleted: ${email} (${uid})`);
    
    // Prepare webhook payload
    const payload = {
      event: 'user.delete',
      data: {
        uid,
        email,
        timestamp: new Date().toISOString()
      }
    };
    
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString);
    
    // Send webhook to our API
    const response = await axios.post(
      config.webhookEndpoint,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Firebase-Auth-Signature': signature
        }
      }
    );
    
    console.log(`User deletion webhook sent successfully: ${response.status}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending user deletion webhook:', error);
    return { error: error.message };
  }
});