# Firebase Auth Synchronization System

This document explains how Peaberry handles synchronization between Firebase Authentication and our PostgreSQL database. This ensures that when a user changes their password in Firebase Auth, the change is reflected in our database.

## Problem Statement

When a user changes their password in Firebase Auth, Firebase only updates its internal authentication store. Our PostgreSQL database doesn't automatically receive this update, causing inconsistency between the two systems.

## Solution: Firebase Auth Webhooks

We've implemented a webhook-based synchronization system that works as follows:

1. Firebase Auth events (password changes, user creation, user deletion) trigger Cloud Functions
2. These functions send webhook notifications to our server
3. Our server verifies the webhook signature and updates the database accordingly

## Components

### 1. Webhook Endpoint

Located in `server/routes.ts`, this API endpoint receives and processes Firebase Auth events:

```javascript
app.post("/api/webhooks/firebase-auth", async (req, res) => {
  // Verify webhook signature
  // Process event based on type (password.update, user.create, user.delete)
  // Update database as needed
});
```

### 2. Firebase Cloud Functions

Located in `firebase-functions/` directory, these functions listen for Firebase Auth events and forward them to our webhook endpoint:

- `onPasswordChange`: Triggered when a user changes their password
- `onUserCreate`: Triggered when a new user is created
- `onUserDelete`: Triggered when a user is deleted

### 3. Webhook Signature Verification

For security, all webhooks include a signature created using a shared secret:

```javascript
verifyFirebaseAuthWebhookSignature(signature, body)
```

## Deployment Instructions

### Firebase Cloud Functions

1. Update the webhook endpoint in `firebase-functions/src/index.ts`
2. Deploy the functions using Firebase CLI:

```bash
cd firebase-functions
npm install
firebase login
firebase use --add
npm run deploy
```

### Server-Side Configuration

1. Set the webhook secret environment variable:

```
FIREBASE_WEBHOOK_SECRET=your-strong-secret-here
```

2. Make sure this matches the secret in your Firebase Functions config:

```bash
firebase functions:config:set webhook.secret="your-strong-secret-here"
```

## Testing

You can test the webhook functionality using the `test-webhook.js` script:

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
2. Use a strong, unique webhook secret
3. Never expose the webhook secret in client-side code
4. Validate all incoming webhook data before processing

## Troubleshooting

- Check Firebase Functions logs for webhook delivery issues
- Verify FIREBASE_WEBHOOK_SECRET is correctly set in both systems
- Ensure the webhook endpoint is accessible from Firebase's Cloud Functions