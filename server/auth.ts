import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, oauthUserSchema } from "@shared/schema";
import bcrypt from 'bcrypt';
import { verifyFirebaseToken } from "./firebase-admin";

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
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
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
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

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

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    if (!req.user) {
      return res.status(401).send("Authentication failed");
    }
    // Don't send password back to client
    const { password, ...userWithoutPassword } = req.user;
    res.status(200).json(userWithoutPassword);
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
      console.log("Processing account deletion request");
      
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
      console.log(`User is OAuth: ${req.user.providerId ? "Yes" : "No"}`);
      
      // Verify password if provided (unless it's an OAuth user without a regular password)
      if (password && !req.user.providerId) {
        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(404).send("User not found");
        }
        
        const isCorrectPassword = await comparePasswords(password, user.password);
        if (!isCorrectPassword) {
          return res.status(400).send("Incorrect password");
        }
      }
      
      // If user authenticated via OAuth, we also need to delete from Firebase
      // This is handled in the routes.ts file
      
      // Delete user data
      // First, get user's data
      const userId = req.user.id;
      
      // First, delete the user from the database
      storage.deleteUser(userId)
        .then((success) => {
          if (success) {
            console.log(`Successfully deleted user with ID: ${userId}`);
            
            // Now log the user out
            req.logout((err) => {
              if (err) {
                console.error("Error logging out user during account deletion:", err);
                return next(err);
              }
              
              // Send success response
              res.status(200).json({ success: true, message: "Account deleted successfully" });
            });
          } else {
            console.error(`Failed to delete user with ID: ${userId}`);
            res.status(500).json({ success: false, message: "Failed to delete account" });
          }
        })
        .catch((err) => {
          console.error("Error deleting user:", err);
          res.status(500).json({ success: false, message: "Error deleting user: " + err.message });
        });
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
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the user's password
      const updatedUser = await storage.updateUser(req.user.id, { password: hashedPassword });
      if (!updatedUser) {
        return res.status(500).send("Failed to update password");
      }
      
      res.status(200).send("Password changed successfully");
    } catch (error) {
      next(error);
    }
  });
  
  // OAuth with Firebase authentication
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
