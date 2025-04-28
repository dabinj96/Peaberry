import axios from 'axios';
import crypto from 'crypto';

// Configuration
const config = {
  webhookEndpoint: 'http://localhost:5000/api/webhooks/firebase-auth',
  webhookSecret: process.env.FIREBASE_WEBHOOK_SECRET || 'peaberry-webhook-secret'
};

/**
 * Generates a signature for the webhook payload
 * @param payload The JSON payload to sign
 * @returns The signature as a hex string
 */
function generateSignature(payload) {
  const hmac = crypto.createHmac('sha256', config.webhookSecret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Send a test webhook to simulate a password change
 */
async function testPasswordChangeWebhook() {
  try {
    // Prepare webhook payload
    const payload = {
      event: 'password.update',
      data: {
        uid: 'test-firebase-uid-123',
        email: 'dabin12jang@gmail.com', // Use an email that exists in the database
        timestamp: new Date().toISOString()
      }
    };
    
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString);
    
    console.log('Sending test password change webhook...');
    
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
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Error sending test webhook:', error.response?.data || error.message);
  }
}

/**
 * Send a test webhook to simulate a user creation
 */
async function testUserCreateWebhook() {
  try {
    // Prepare webhook payload
    const payload = {
      event: 'user.create',
      data: {
        uid: 'test-firebase-uid-456',
        email: 'newuser@example.com',
        displayName: 'New Test User',
        photoURL: 'https://example.com/photo.jpg',
        timestamp: new Date().toISOString()
      }
    };
    
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString);
    
    console.log('Sending test user creation webhook...');
    
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
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Error sending test webhook:', error.response?.data || error.message);
  }
}

/**
 * Send a test webhook to simulate a user deletion
 */
async function testUserDeleteWebhook() {
  try {
    // Prepare webhook payload
    const payload = {
      event: 'user.delete',
      data: {
        uid: 'test-firebase-uid-123',  // Use the same UID as the test user
        email: 'test@example.com',
        timestamp: new Date().toISOString()
      }
    };
    
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString);
    
    console.log('Sending test user deletion webhook...');
    
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
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Error sending test webhook:', error.response?.data || error.message);
  }
}

// Execute the test
async function runTests() {
  const testType = process.argv[2];
  
  if (!testType || testType === 'password') {
    await testPasswordChangeWebhook();
  } else if (testType === 'create') {
    await testUserCreateWebhook();
  } else if (testType === 'delete') {
    await testUserDeleteWebhook();
  } else if (testType === 'all') {
    await testUserCreateWebhook();
    await testPasswordChangeWebhook();
    await testUserDeleteWebhook();
  } else {
    console.error('Unknown test type. Use: password, create, delete, or all');
  }
}

runTests();