# Peaberry Authentication Architecture

## Overview

Peaberry uses a hybrid authentication system:

1. **Email/Password Authentication**: Fully managed by our Express backend with PostgreSQL storage
2. **Google OAuth Authentication**: Uses Firebase Authentication for Google sign-in only

This document explains the system architecture and how each authentication method works.

## Authentication Methods

### Email/Password Authentication

Email/password authentication is handled entirely by our own backend:

1. **Registration**: Users register with username, email, and password
   - Password is hashed using bcrypt before storing in PostgreSQL
   - No Firebase account is created for these users

2. **Login**: Users login with username and password
   - Passport.js with LocalStrategy handles the authentication
   - bcrypt compares the provided password with the stored hash

3. **Password Reset**: Users can request a password reset
   - A secure token is generated and stored in the database
   - A reset link with the token is sent to the user's email
   - User sets a new password using the token

### Google OAuth Authentication

Google OAuth is handled using Firebase Authentication:

1. **Sign-in Flow**:
   - User clicks "Sign in with Google" button on frontend
   - Firebase Authentication handles the Google OAuth process
   - Upon success, Firebase returns an ID token
   - Frontend sends the ID token to our backend for verification

2. **Backend Verification**:
   - Backend verifies the token with Firebase Admin SDK
   - If valid, retrieves or creates a user in our PostgreSQL database
   - User is authenticated in our session system

3. **Account Linking**:
   - If a user with the same email exists in our database (from email/password registration),
     their account is updated with the Google OAuth provider information
   - This allows users to use both authentication methods for the same account

## Authentication Endpoints

### Email/Password Authentication Endpoints:

- `POST /api/register`: Register a new user (email/password)
- `POST /api/login`: Login with username/password
- `POST /api/logout`: Log user out
- `POST /api/request-password-reset`: Request a password reset
- `POST /api/verify-reset-token`: Verify a password reset token
- `POST /api/reset-password`: Reset password with a valid token
- `POST /api/change-password`: Change password while logged in
- `POST /api/delete-account`: Delete user account

### Google OAuth Authentication Endpoints:

- `POST /api/oauth/login`: Authenticate with a Firebase ID token (after Google sign-in)

## Database Schema

The user table includes fields for both authentication methods:

- Standard user fields: `id`, `username`, `password`, `email`, `name`, etc.
- OAuth fields: `providerId`, `providerUid`, `photoUrl`
- Password reset fields: `passwordResetToken`, `passwordResetTokenExpiresAt`

## Security Considerations

1. **Password Storage**: Passwords are hashed using bcrypt
2. **Token Security**: Password reset tokens are cryptographically secure random strings with expiration times
3. **Firebase Security**: Firebase Admin SDK is used for secure token verification
4. **Session Security**: Express sessions are stored securely in PostgreSQL
5. **CSRF Protection**: Proper CSRF measures are implemented for form submissions