# Peaberry Firebase Functions

This project contains Firebase Cloud Functions that handle authentication events and send them to your Peaberry application via webhooks.

## Setup Instructions

1. Install dependencies
```bash
cd firebase-functions
npm install
```

2. Configure your webhook endpoint
Edit the `config.webhookEndpoint` in `src/index.ts` to point to your deployed Peaberry application.

3. Set up Firebase CLI
```bash
firebase login
```

4. Select your Firebase project
```bash
firebase use --add
# Select your peaberry-ddb2f project when prompted
```

5. Deploy the functions
```bash
npm run deploy
```

## Webhook Secret

For security, set a strong secret and make sure it matches the one in your server's environment:

```bash
firebase functions:config:set webhook.secret="your-strong-secret-here"
```

Then update your Peaberry server environment:
```
FIREBASE_WEBHOOK_SECRET=your-strong-secret-here
```

## Testing

You can test the webhook locally by:

1. Start the Firebase emulator
```bash
npm run serve
```

2. Trigger functions in the Firebase console or using the Firebase CLI