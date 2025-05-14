# Firebase Auth Synchronization Implementation

## Overview

This document outlines the solution implemented for synchronizing user data between Firebase Authentication and our PostgreSQL database, focusing particularly on handling password updates.

## Problem Solved

When a user changes their password through Firebase Authentication (either directly or via a password reset flow), Firebase only updates its internal authentication store. Our PostgreSQL database doesn't automatically receive this update, which can lead to authentication inconsistencies.

## Solution Architecture

We've implemented a webhook-based synchronization system that works as follows:

1. Firebase Auth events (password changes, user creation, user deletion) trigger Cloud Functions
2. These functions send webhook notifications to our server with a security signature
3. Our server verifies the webhook signature and updates the database accordingly

## Components

### 1. Webhook Endpoint

Located in `server/routes.ts`, this API endpoint receives and processes Firebase Auth events:

```javascript
app.post('/api/webhooks/firebase-auth', async (req, res) => {
  // Verify webhook signature
  // Process different event types: password.update, user.create, user.delete
  // Update database as needed
});
```

### 2. Firebase Cloud Functions

Located in the `firebase-functions/` directory, these functions listen for Firebase Auth events and forward them to our webhook endpoint:

- `onPasswordChange`: Triggered when a user changes their password
- `onUserCreate`: Triggered when a new user is created
- `onUserDelete`: Triggered when a user is deleted

### 3. Webhook Security

For security, all webhooks include a signature created using a shared secret. The `verifyFirebaseAuthWebhookSignature` function checks this signature to verify that requests are legitimate.

## Workflow

1. **Password Change**: When a user changes their password through Firebase (either via reset or direct change):
   - Firebase triggers the `onPasswordChange` function
   - The function sends a webhook to our server with event='password.update'
   - Our server verifies the signature, looks up the user by email, and updates their password hash
   - We use a random secure password since we can't access the actual password (all authentication is handled by Firebase)

2. **User Creation**:
   - Firebase triggers the `onUserCreate` function
   - The function sends a webhook to our server with event='user.create'
   - Our server links the new Firebase user to an existing user account if it exists

3. **User Deletion**:
   - Firebase triggers the `onUserDelete` function
   - The function sends a webhook to our server with event='user.delete'
   - Our server deletes or disables the corresponding user account

## Testing

The webhook functionality can be tested using the `test-webhook.js` script:

```bash
# Test password change
node test-webhook.js password

# Test user creation
node test-webhook.js create

# Test user deletion
node test-webhook.js delete

# Run all tests
node test-webhook.js all
```

## Security Considerations

1. Always use HTTPS in production for webhook endpoints
2. Use a strong, unique webhook secret stored as an environment variable
3. Never expose the webhook secret in client-side code
4. Validate all incoming webhook data before processing

## Troubleshooting

- Check Firebase Functions logs for webhook delivery issues
- Verify FIREBASE_WEBHOOK_SECRET is correctly set in both systems
- Ensure the webhook endpoint is accessible from Firebase's Cloud Functions

## Maintenance

Keep Firebase Functions updated as Firebase Auth APIs evolve. The current implementation addresses the key synchronization needs but may need updates if Firebase changes its event structure or authentication methods.