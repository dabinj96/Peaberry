import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, oauthUserSchema } from "@shared/schema";
import bcrypt from 'bcrypt';
import { verifyFirebaseToken, createFirebaseUser, updateFirebaseUserPassword, deleteFirebaseUser } from "./firebase-admin";
import crypto from 'crypto';
import { sendPasswordResetEmail, sendPasswordChangedEmail, isRateLimited, trackEmailAttempt } from './email-service';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function hashPassword(password: string) {
  // Use bcrypt for password hashing with 10 rounds
  return bcrypt.hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string) {
  // Use bcrypt for password comparison
  try {
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

// Middleware to require authentication
export const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Middleware to require admin role
export const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  
  next();
};

// Middleware to require cafe owner or admin role
export const requireCafeOwnerOrAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'cafe_owner') {
    return res.status(403).json({ error: "Cafe owner or admin access required" });
  }
  
  next();
};

/**
 * Generate a secure password reset token
 * @returns Object containing the token and its expiration date
 */
export function generatePasswordResetToken(): { token: string, expiresAt: Date } {
  // Generate a secure random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set token expiration to 1 hour from now
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);
  
  return { token, expiresAt };
}

/**
 * Validate a password reset token
 * @param token The token to validate
 * @param storedExpiresAt The token's expiration date from the database
 * @returns Boolean indicating if the token is valid
 */
export function isPasswordResetTokenValid(token: string, storedExpiresAt: Date | null): boolean {
  if (!token || !storedExpiresAt) {
    return false;
  }
  
  // Check if token has expired
  const now = new Date();
  if (now > new Date(storedExpiresAt)) {
    return false;
  }
  
  return true;
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || "peaberry-coffee-secret-key";
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        // User doesn't exist - return generic error (don't reveal user existence)
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // Check password
        const passwordMatches = await comparePasswords(password, user.password);
        
        if (!passwordMatches) {
          // Simply return invalid credentials message with no lockout functionality
          return done(null, false, {
            message: "Invalid username or password"
          });
        }
        
        // Successful login
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // Check if email is already in use
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).send("Email is already registered");
      }

      // Hash the password for our database
      const hashedPassword = await hashPassword(req.body.password);
      
      // Create the user in our database only
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        // Don't set Firebase fields for regular email/password users
        providerId: null,
        providerUid: null
      });

      // Log in the user
      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send password back to client
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        return next(err);
      }
      
      // Handle authentication failure cases
      if (!user) {
        // Regular authentication failure with simple error message
        return res.status(401).json({
          success: false,
          message: info && info.message ? info.message : "Invalid username or password"
        });
      }
      
      // Success - log in the user
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        // Don't send password back to client
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json({
          success: true,
          ...userWithoutPassword
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Don't send password back to client
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
  
  // Account deletion endpoint
  app.post("/api/delete-account", async (req, res, next) => {
    try {
      console.log("Processing account deletion request", { 
        body: req.body,
        isAuthenticated: req.isAuthenticated(),
        user: req.user ? { id: req.user.id, name: req.user.name } : null 
      });
      
      if (!req.isAuthenticated()) {
        console.log("Account deletion failed: User not authenticated");
        return res.status(401).json({ 
          success: false,
          message: "You must be logged in to delete your account" 
        });
      }
      
      console.log(`Attempting to delete account for user ID: ${req.user.id}`);
      const { password } = req.body;
      console.log(`Password provided: ${password ? "Yes" : "No"}`);
      console.log(`User data:`, { 
        id: req.user.id, 
        providerId: req.user.providerId,
        providerUid: req.user.providerUid
      });
      
      // Check if this is an OAuth user (has providerId or providerUid)
      const isOAuthUser = !!(req.user.providerId || req.user.providerUid);
      console.log(`User is OAuth: ${isOAuthUser}`);
      
      // For non-OAuth users, verify password
      if (!isOAuthUser && password) {
        console.log("Verifying password for non-OAuth user");
        const user = await storage.getUser(req.user.id);
        if (!user) {
          console.log("User not found for password verification");
          return res.status(404).json({ success: false, message: "User not found" });
        }
        
        const isCorrectPassword = await comparePasswords(password, user.password);
        if (!isCorrectPassword) {
          console.log("Incorrect password provided");
          return res.status(400).json({ success: false, message: "Incorrect password" });
        }
        console.log("Password verified successfully");
      } else if (!isOAuthUser && !password) {
        // Non-OAuth users must provide password
        console.log("Password required for non-OAuth user but not provided");
        return res.status(400).json({ success: false, message: "Password is required to delete your account" });
      } else {
        // OAuth user - no password needed
        console.log("No password verification needed for OAuth user");
      }
      
      // For Google OAuth users, attempt to delete it from Firebase
      let firebaseDeleteResult = false;
      if (req.user.providerUid && req.user.providerId === 'google') {
        try {
          // Use the imported function directly
          console.log(`Attempting to delete Firebase user with UID: ${req.user.providerUid}`);
          firebaseDeleteResult = await deleteFirebaseUser(req.user.providerUid);
          console.log(`Firebase user deletion result: ${firebaseDeleteResult}`);
        } catch (firebaseError) {
          console.error("Error during Firebase user deletion:", firebaseError);
          // Continue with local account deletion even if Firebase deletion fails
        }
      } else {
        console.log("Not a Google OAuth user, skipping Firebase deletion");
      }
      
      // Delete user data from database
      const userId = req.user.id;
      
      try {
        console.log(`Deleting user ${userId} from database...`);
        const success = await storage.deleteUser(userId);
        console.log(`Database delete result: ${success}`);
        
        if (!success) {
          console.error(`Database reported failure to delete user with ID: ${userId}`);
          return res.status(500).json({ success: false, message: "Database could not delete user account" });
        }
        
        console.log(`Successfully deleted user with ID: ${userId} from database`);
        
        // Handle session cleanup
        try {
          console.log("Logging out user...");
          // Option 1: Use req.logout with a promise
          await new Promise<void>((resolve) => {
            req.logout(() => {
              console.log("Logout callback executed");
              resolve();
            });
          });
          
          console.log("Destroying session...");
          // Option 2: Destroy the session if it exists
          if (req.session) {
            await new Promise<void>((resolve) => {
              req.session.destroy((err) => {
                if (err) console.error("Session destruction error:", err);
                else console.log("Session destroyed successfully");
                resolve();
              });
            });
          }
        } catch (sessionError) {
          console.error("Session cleanup error:", sessionError);
          // Continue anyway since the database delete was successful
        }
        
        // Even with session errors, return success since the account was deleted
        console.log("Sending successful account deletion response");
        return res.status(200).json({ 
          success: true,
          firebaseDeleted: firebaseDeleteResult,
          message: "Account deleted successfully" 
        });
        
      } catch (err: any) {
        console.error("Database error during account deletion:", err);
        const errorMessage = err.message || "An unknown database error occurred";
        return res.status(500).json({ 
          success: false, 
          message: "Error deleting user: " + errorMessage
        });
      }
    } catch (error) {
      console.error("Account deletion error:", error);
      next(error);
    }
  });
  
  app.post("/api/change-password", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).send("You must be logged in to change your password");
      }
      
      const { currentPassword, newPassword } = req.body;
      
      // Validate inputs
      if (!currentPassword || !newPassword) {
        return res.status(400).send("Current password and new password are required");
      }
      
      // Apply same password validation as during registration
      if (newPassword.length < 8) {
        return res.status(400).send("New password must be at least 8 characters long");
      }
      
      // Validate password complexity
      const hasUppercase = /[A-Z]/.test(newPassword);
      const hasLowercase = /[a-z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
      
      // Check if password meets minimum complexity requirements
      const varietyScore = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
      if (varietyScore < 2) {
        return res.status(400).send("Password must include at least 2 of the following: uppercase letters, lowercase letters, numbers, and special characters");
      }
      
      // Check for common passwords
      const commonPasswords = ["password", "123456", "qwerty", "welcome", "admin"];
      if (commonPasswords.includes(newPassword.toLowerCase())) {
        return res.status(400).send("This password is too common and not secure");
      }
      
      // Verify current password
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).send("User not found");
      }
      
      const isCorrectPassword = await comparePasswords(currentPassword, user.password);
      if (!isCorrectPassword) {
        return res.status(400).send("Current password is incorrect");
      }
      
      // Hash the new password for our database
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the user's password in our database only
      const updatedUser = await storage.updateUser(req.user.id, { password: hashedPassword });
      if (!updatedUser) {
        return res.status(500).send("Failed to update password");
      }
      
      // Send back success response
      res.status(200).json({
        success: true,
        message: "Password changed successfully"
      });
    } catch (error) {
      console.error("Password change error:", error);
      next(error);
    }
  });
  
  // Self-contained local password reset flow (no Firebase)
  
  // Create alias for backwards compatibility with any existing client code
  app.post("/api/request-password-reset", (req, res, next) => {
    console.log("Legacy endpoint /api/request-password-reset called, forwarding to /api/forgot-password");
    req.url = "/api/forgot-password";
    next();
  });
  
  // Main password reset request (forgot password) endpoint implementation
  app.post("/api/forgot-password", async (req, res, next) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required"
        });
      }
      
      // Check for rate limiting
      if (isRateLimited(email)) {
        console.log(`Password reset rate limit exceeded for email: ${email}`);
        return res.status(429).json({
          success: false,
          message: "Too many reset attempts. Please try again later."
        });
      }
      
      // Track this attempt for rate limiting
      trackEmailAttempt(email);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Don't reveal if the email exists or not for security (prevent enumeration)
      if (!user) {
        console.log(`Password reset requested for non-existent email: ${email}`);
        return res.status(200).json({
          success: true,
          message: "If an account with that email exists, a password reset link has been sent."
        });
      }
      
      // Check if user is an OAuth-only user
      if (user.providerId && user.providerUid && !user.password) {
        console.log(`Password reset requested for OAuth-only user: ${email}`);
        return res.status(400).json({
          success: false,
          message: "This account uses Google Sign-In. Please use Google to sign in."
        });
      }
      
      // Generate a secure random token with 1-hour expiry
      const { token, expiresAt } = generatePasswordResetToken();
      
      // Update the user with the token and expiry in the database
      await storage.updateUser(user.id, {
        passwordResetToken: token,
        passwordResetTokenExpiresAt: expiresAt
      });
      
      // Build clean reset link without exposing token in URL
      const resetLink = `${req.protocol}://${req.get('host')}/password-reset/${user.id}`;
      
      // Send the reset email
      console.log(`Sending password reset email to ${email} with token: ${token}`);
      
      // Attempt to send the email with a clean URL
      const emailSent = await sendPasswordResetEmail(email, resetLink, user.name || user.username);
      
      // Log but don't reveal to user whether the email was actually sent
      if (!emailSent) {
        console.error(`Failed to send password reset email to ${email}`);
      }
      
      // Always return the same message to prevent user enumeration
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent."
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      next(error);
    }
  });
  
  // Password reset token retrieval endpoint
  // This endpoint is hit by the direct URL from the email (/password-reset/:userId)
  app.get("/password-reset/:userId", async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.redirect('/auth?error=invalid_reset');
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      
      if (!user || !user.passwordResetToken || !user.passwordResetTokenExpiresAt) {
        // Return 302 redirect to /auth with an error
        return res.redirect('/auth?error=invalid_reset');
      }
      
      // Verify the token's validity
      const isValid = isPasswordResetTokenValid(user.passwordResetToken, user.passwordResetTokenExpiresAt);
      
      if (!isValid) {
        // Token is expired, redirect to auth page with expired token error
        return res.redirect('/auth?error=expired_token');
      }
      
      // Token is valid - set it in an HTTP-only cookie and redirect to the reset form
      // Make sure cookie settings are compatible with both development and production
      res.cookie('password_reset_token', user.passwordResetToken, {
        httpOnly: true, // Only accessible by the server
        secure: false, // Allow non-HTTPS in development
        maxAge: 60 * 60 * 1000, // 1 hour expiry (matching token expiry)
        sameSite: 'lax', // Changed to lax to work with redirects from email links
        path: '/' // Ensure the cookie is available on all paths
      });
      
      // Set user ID in a cookie for reference
      res.cookie('password_reset_user_id', userId.toString(), {
        httpOnly: true,
        secure: false, // Allow non-HTTPS in development
        maxAge: 60 * 60 * 1000,
        sameSite: 'lax', // Changed to lax to work with redirects from email links
        path: '/' // Ensure the cookie is available on all paths
      });
      
      // Redirect to reset password form with tab parameter to set the active tab
      return res.redirect('/auth?tab=resetPassword');
    } catch (error) {
      console.error("Password reset token retrieval error:", error);
      return res.redirect('/auth?error=server_error');
    }
  });

  // Verify reset token endpoint (keep for backward compatibility)
  app.post("/api/verify-reset-token", async (req, res, next) => {
    try {
      // Log request cookies and body for debugging
      console.log("Verify token request cookies:", req.cookies);
      console.log("Verify token request body:", req.body);
      
      // Get token from cookie first, then body as fallback
      const token = (req.cookies && req.cookies.password_reset_token) || req.body.token;
      
      console.log("Using token for verification:", token ? "Token found" : "No token");
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token is required"
        });
      }
      
      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      
      if (!user || !user.passwordResetTokenExpiresAt) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired token"
        });
      }
      
      // Verify the token's validity
      const isValid = isPasswordResetTokenValid(token, user.passwordResetTokenExpiresAt);
      
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired token"
        });
      }
      
      // Token is valid
      return res.status(200).json({
        success: true,
        message: "Token is valid",
        username: user.username,
        email: user.email
      });
    } catch (error) {
      console.error("Token verification error:", error);
      next(error);
    }
  });
  
  // Reset password with token endpoint
  app.post("/api/reset-password", async (req, res, next) => {
    try {
      // Log request cookies and body for debugging
      console.log("Reset password request cookies:", req.cookies);
      console.log("Reset password request body:", req.body);
      
      // Get token from secure cookie first, then fallback to body for backward compatibility
      const token = (req.cookies && req.cookies.password_reset_token) || req.body.token;
      const { newPassword } = req.body;
      
      console.log("Using token for reset:", token ? "Token found" : "No token");
      
      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Token and new password are required"
        });
      }
      
      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      
      if (!user || !user.passwordResetTokenExpiresAt) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired token"
        });
      }
      
      // Verify the token's validity
      const isValid = isPasswordResetTokenValid(token, user.passwordResetTokenExpiresAt);
      
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired token"
        });
      }
      
      // Validate new password
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long"
        });
      }
      
      // Validate password complexity
      const hasUppercase = /[A-Z]/.test(newPassword);
      const hasLowercase = /[a-z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
      
      // Check if password meets minimum complexity requirements
      const varietyScore = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
      if (varietyScore < 2) {
        return res.status(400).json({
          success: false,
          message: "Password must include at least 2 of the following: uppercase letters, lowercase letters, numbers, and special characters"
        });
      }
      
      // Check for common passwords
      const commonPasswords = ["password", "123456", "qwerty", "welcome", "admin"];
      if (commonPasswords.includes(newPassword.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: "This password is too common and not secure"
        });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the user's password and clear the reset token
      const updatedUser = await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null
      });
      
      if (!updatedUser) {
        return res.status(500).json({
          success: false,
          message: "Failed to update password"
        });
      }
      
      // Send confirmation email
      try {
        await sendPasswordChangedEmail(user.email, user.name || user.username);
      } catch (emailError) {
        // Log but don't fail the request if email fails
        console.error("Error sending password changed confirmation email:", emailError);
      }
      
      // Clear the secure cookies as the token is now invalidated
      res.clearCookie('password_reset_token', { path: '/' });
      res.clearCookie('password_reset_user_id', { path: '/' });
      
      // Return success response
      return res.status(200).json({
        success: true,
        message: "Password has been reset successfully. You can now log in with your new password."
      });
    } catch (error) {
      console.error("Password reset error:", error);
      next(error);
    }
  });
  
  app.post("/api/oauth/login", async (req, res, next) => {
    try {
      console.log("Processing OAuth login request");
      const { idToken } = req.body;
      
      if (!idToken) {
        console.error("OAuth error: No ID token provided");
        return res.status(400).send("ID token is required");
      }
      
      try {
        // Verify the Firebase token
        console.log("Verifying Firebase token...");
        const decodedToken = await verifyFirebaseToken(idToken);
        
        if (!decodedToken) {
          console.error("OAuth error: Invalid ID token");
          return res.status(401).send("Invalid ID token");
        }
        
        console.log("Token verified successfully, uid:", decodedToken.uid);
        
        // Extract user information from the decoded token
        const { uid, email, name, picture } = decodedToken;
        
        if (!email) {
          console.error("OAuth error: No email in token");
          return res.status(400).send("Email is required");
        }
        
        console.log(`Processing OAuth for email: ${email}`);
        
        // Generate a username based on email if needed
        const username = email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);
        
        try {
          // Check if user exists by provider ID and UID
          console.log(`Checking if user exists with providerId: google, providerUid: ${uid}`);
          let user = await storage.getUserByProviderAuth('google', uid);
          
          if (!user) {
            console.log("User not found by provider auth, checking by email");
            // Check if user exists with the same email
            user = await storage.getUserByEmail(email);
            
            if (user) {
              console.log(`Updating existing user ${user.id} with OAuth information`);
              // Update existing user with OAuth information
              try {
                const updatedUser = await storage.updateUser(user.id, {
                  providerId: 'google',
                  providerUid: uid,
                  photoUrl: picture || null
                });
                
                if (!updatedUser) {
                  console.error("Failed to update user with OAuth information");
                  return res.status(500).send("Failed to update user with OAuth information");
                }
                
                user = updatedUser;
                console.log("User updated successfully");
              } catch (updateError: any) {
                console.error("Error updating user:", updateError);
                return res.status(500).send(`Error updating user: ${updateError.message}`);
              }
            } else {
              console.log("Creating new user for OAuth");
              // Create a new user
              try {
                const oauthUserData = oauthUserSchema.parse({
                  username,
                  email,
                  name: name || email.split('@')[0],
                  providerId: 'google',
                  providerUid: uid,
                  photoUrl: picture,
                  role: 'user'
                });
                
                // Generate a random secure password for OAuth users
                // They won't use this password, but we need something in the field
                const randomPassword = Math.random().toString(36).slice(-10) + 
                                     Math.random().toString(36).slice(-10).toUpperCase() +
                                     '!@#$%';
                
                console.log("Parsed OAuth user data:", JSON.stringify({
                  ...oauthUserData,
                  password: "[REDACTED]",
                  bio: ''
                }));
                
                user = await storage.createUser({
                  ...oauthUserData,
                  password: await hashPassword(randomPassword),
                  bio: ''
                });
                
                console.log("User created successfully with id:", user.id);
              } catch (createError: any) {
                console.error("Error creating new user:", createError);
                return res.status(500).send(`Error creating user: ${createError.message}`);
              }
            }
          } else {
            console.log("Found existing user by provider auth");
          }
          
          if (!user) {
            console.error("Failed to create or retrieve user after all attempts");
            return res.status(500).send("Failed to create or retrieve user");
          }
          
          // Log in the user
          console.log("Logging in user with Passport");
          req.login(user, (err) => {
            if (err) {
              console.error("Error in req.login:", err);
              return next(err);
            }
            // Don't send password back to client
            const { password, ...userWithoutPassword } = user;
            console.log("OAuth login successful");
            res.status(200).json(userWithoutPassword);
          });
        } catch (userError: any) {
          console.error("Error in user lookup/creation:", userError);
          return res.status(500).send(`User processing error: ${userError.message}`);
        }
      } catch (tokenError: any) {
        console.error("Error verifying token:", tokenError);
        return res.status(401).send(`Token verification failed: ${tokenError.message}`);
      }
    } catch (error: any) {
      console.error("OAuth login error:", error);
      return res.status(500).send(`OAuth error: ${error.message}`);
    }
  });
}
