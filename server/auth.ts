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
      
      if (newPassword.length < 6) {
        return res.status(400).send("New password must be at least 6 characters long");
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
      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).send("ID token is required");
      }
      
      // Verify the Firebase token
      const decodedToken = await verifyFirebaseToken(idToken);
      
      if (!decodedToken) {
        return res.status(401).send("Invalid ID token");
      }
      
      // Extract user information from the decoded token
      const { uid, email, name, picture } = decodedToken;
      
      if (!email) {
        return res.status(400).send("Email is required");
      }
      
      // Generate a username based on email if needed
      const username = email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);
      
      // Check if user exists by provider ID and UID
      let user = await storage.getUserByProviderAuth('google', uid);
      
      if (!user) {
        // Check if user exists with the same email
        user = await storage.getUserByEmail(email);
        
        if (user) {
          // Update existing user with OAuth information
          const updatedUser = await storage.updateUser(user.id, {
            providerId: 'google',
            providerUid: uid,
            photoUrl: picture || null
          });
          
          if (!updatedUser) {
            return res.status(500).send("Failed to update user with OAuth information");
          }
          
          user = updatedUser;
        } else {
          // Create a new user
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
          
          user = await storage.createUser({
            ...oauthUserData,
            password: await hashPassword(randomPassword),
            bio: ''
          });
        }
      }
      
      if (!user) {
        return res.status(500).send("Failed to create or retrieve user");
      }
      
      // Log in the user
      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send password back to client
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.password;
        res.status(200).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("OAuth login error:", error);
      next(error);
    }
  });
}
