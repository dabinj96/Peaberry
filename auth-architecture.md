# Peaberry Authentication Architecture

## Overview

Peaberry uses a hybrid authentication system that combines:

1. **Traditional Email/Password Authentication**: Managed entirely by our Express server with PostgreSQL database storage
2. **Google OAuth Authentication**: Facilitated through Firebase Authentication

This document explains the architecture, data flow, and security considerations for each authentication method.

## Authentication Methods

### Email/Password Authentication

Email/password authentication is handled completely within our application without Firebase dependency:

1. **Registration Flow**:
   - User submits email, password, and profile information
   - Password is validated for strength and security (min length, complexity)
   - Password is securely hashed using scrypt with salt
   - User record is stored in PostgreSQL database
   - Session is established using Passport.js and Express session

2. **Login Flow**:
   - User submits email/username and password
   - Credentials are verified against the PostgreSQL database
   - Password comparison is done using scrypt's timing-safe comparison
   - Session is established and session data stored in PostgreSQL

3. **Password Reset Flow**:
   - User requests password reset via email
   - Application generates secure reset token with expiration
   - Token is stored in user record in PostgreSQL
   - Reset link is sent to user's email
   - User submits new password with valid token
   - Password is updated in PostgreSQL directly

### Google OAuth Authentication

Google OAuth is facilitated through Firebase Authentication:

1. **Sign-in Flow**:
   - User clicks "Sign in with Google" button
   - Firebase Authentication handles the OAuth process
   - Firebase returns user information and credentials
   - Application verifies the credentials with Firebase Admin SDK
   - User is either created or updated in our PostgreSQL database
   - Session is established using Passport.js

2. **Data Synchronization**:
   - Firebase webhook endpoint processes Google OAuth user events
   - Application maintains Firebase user data in sync with our database
   - Periodic job runs to detect and resolve data inconsistencies

## Security Considerations

1. **Password Security**:
   - Passwords are never stored in plain text
   - Strong hashing algorithm (scrypt) with unique salt for each user
   - Password strength requirements enforced during registration and password change
   - Password reset tokens are cryptographically secure and time-limited

2. **OAuth Security**:
   - Firebase handles secure OAuth flow and token verification
   - Application verifies webhook signatures from Firebase
   - Provider data verification before user creation/update

3. **Session Security**:
   - Sessions stored in PostgreSQL for persistence
   - CSRF protection implemented
   - Secure cookies with HttpOnly flag
   - Session expiration and automatic cleanup

## API Endpoints

### Traditional Authentication

- `/api/register`: Create a new user account with email/password
- `/api/login`: Authenticate with email/password
- `/api/logout`: End the user session
- `/api/user`: Get the current authenticated user's profile
- `/api/change-password`: Update user's password (requires current password)
- `/api/request-password-reset`: Request a password reset token
- `/api/verify-reset-token`: Verify a password reset token's validity
- `/api/reset-password`: Reset password with a valid token
- `/api/delete-account`: Delete user account (requires password for non-OAuth users)

### OAuth-related

- `/api/webhooks/firebase-auth`: Webhook endpoint for Firebase Auth events (user creation, deletion)
- `/api/admin/sync-firebase-users`: Manual endpoint to synchronize Google OAuth users

## Database Schema

The user table stores both traditional and OAuth users:

```sql
users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,  // Hashed password (random for OAuth users)
  name TEXT NOT NULL,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  providerId TEXT,  // 'google' for Google OAuth users, NULL for traditional users
  providerUid TEXT,  // Google's unique ID, NULL for traditional users
  photoUrl TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  passwordResetToken TEXT,
  passwordResetTokenExpiresAt TIMESTAMP
)
```

## Authentication Flow Diagrams

### Email/Password Registration
```
User → Registration Form → Validate Inputs → Hash Password → Create User in PostgreSQL → Establish Session → Redirect to Home
```

### Email/Password Login
```
User → Login Form → Query User by Email → Verify Password Hash → Establish Session → Redirect to Home
```

### Google OAuth
```
User → "Sign in with Google" → Firebase Auth Flow → Fetch User Profile → Check Database for Existing User → Create/Update User → Establish Session → Redirect to Home
```

### Password Reset
```
User → Request Reset → Generate Token → Store Token in DB → Send Email →
User → Reset Form → Verify Token → Update Password → Redirect to Login
```