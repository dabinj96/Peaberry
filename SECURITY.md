# Security Guidelines for Peaberry

## Firebase Service Account

The application uses a Firebase service account for administrative operations such as user synchronization and deletion. This is a sensitive credential that grants administrative access to your Firebase project.

### Important Security Notes:

1. The service account key file (`firebase-service-account.json`) is added to `.gitignore` to prevent accidental commits to version control
2. The file should have restricted permissions (set with `chmod 600 firebase-service-account.json`)
3. **NEVER** share the contents of this file or commit it to a public repository
4. This file contains a private key that grants administrative access to your Firebase project

### Deployment Considerations:

- For production deployments, consider using environment-based credentials or a secret management service
- Many hosting providers offer secure ways to manage service account credentials:
  - Vercel Secrets
  - Netlify Environment Variables
  - Google Cloud Secret Manager
  - AWS Parameter Store

### Obtaining a New Service Account Key:

If you need to generate a new service account key:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Navigate to Project Settings > Service Accounts
3. Click "Generate New Private Key"
4. Save the downloaded file as `firebase-service-account.json` in the project root

### Revoking a Compromised Key:

If you believe your service account key has been compromised:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to IAM & Admin > Service Accounts
3. Find the service account associated with your project
4. Use the options to delete or disable the key
5. Generate a new key and update your application

## Other Security Considerations

- Keep all environment variables secure
- Regularly review and update dependencies
- Follow security best practices for Node.js applications