import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, uniqueIndex, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roastLevelEnum = pgEnum('roast_level', ['light', 'light_medium', 'medium', 'medium_dark', 'dark', 'extra_dark']);
export const brewingMethodEnum = pgEnum('brewing_method', ['espresso_based', 'pour_over', 'siphon', 'mixed_drinks', 'nitro', 'cold_brew']);
export const cafeStatusEnum = pgEnum('cafe_status', ['draft', 'published', 'archived']);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'cafe_owner']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  bio: text("bio"),
  role: userRoleEnum("role").default('user').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // OAuth related fields
  providerId: text("provider_id"),    // e.g. 'google', 'facebook'
  providerUid: text("provider_uid"),  // unique ID from the provider
  photoUrl: text("photo_url"),        // profile photo URL
  
  // Password reset fields
  passwordResetToken: text("password_reset_token"),
  passwordResetTokenExpiresAt: timestamp("password_reset_token_expires_at"),
});

// Cafes table
export const cafes = pgTable("cafes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  area: text("area").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  priceLevel: integer("price_level").default(1), // 1-4 representing $ to $$$$
  sellsCoffeeBeans: boolean("sells_coffee_beans").default(false),
  imageUrl: text("image_url"),
  website: text("website").default(''),
  phone: text("phone").default(''),
  instagramHandle: text("instagram_handle").default(''),
  googleMapsUrl: text("google_maps_url").default(''),
  status: cafeStatusEnum("status").default('draft').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CafeRoastLevels table (many-to-many)
export const cafeRoastLevels = pgTable("cafe_roast_levels", {
  id: serial("id").primaryKey(),
  cafeId: integer("cafe_id").notNull().references(() => cafes.id),
  roastLevel: roastLevelEnum("roast_level").notNull(),
}, (table) => {
  return {
    cafeRoastLevelIdx: uniqueIndex("cafe_roast_level_idx").on(table.cafeId, table.roastLevel),
  };
});

// CafeBrewingMethods table (many-to-many)
export const cafeBrewingMethods = pgTable("cafe_brewing_methods", {
  id: serial("id").primaryKey(),
  cafeId: integer("cafe_id").notNull().references(() => cafes.id),
  brewingMethod: brewingMethodEnum("brewing_method").notNull(),
}, (table) => {
  return {
    cafeBrewingMethodIdx: uniqueIndex("cafe_brewing_method_idx").on(table.cafeId, table.brewingMethod),
  };
});

// Ratings table
export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  cafeId: integer("cafe_id").notNull().references(() => cafes.id),
  rating: integer("rating").notNull(), // 1-5 stars
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userCafeIdx: uniqueIndex("user_cafe_idx").on(table.userId, table.cafeId),
  };
});

// Favorites table
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  cafeId: integer("cafe_id").notNull().references(() => cafes.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userCafeIdx: uniqueIndex("user_cafe_favorite_idx").on(table.userId, table.cafeId),
  };
});

// Password validation regex patterns
const hasUppercase = /[A-Z]/;
const hasLowercase = /[a-z]/;
const hasNumber = /[0-9]/;
const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/;

// Common passwords to reject (simplified list for demo)
const commonPasswords = ["password", "123456", "qwerty", "welcome", "admin"];

// Create a schema for OAuth login
export const oauthUserSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  name: z.string(),
  providerId: z.string(),
  providerUid: z.string(),
  photoUrl: z.string().optional(),
  role: z.enum(["user", "admin", "cafe_owner"]).default("user"),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  // Make password optional to support OAuth users, but validate if provided
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters")
    .refine((password) => {
      // Check for at least 2 character types
      let count = 0;
      if (hasUppercase.test(password)) count++;
      if (hasLowercase.test(password)) count++;
      if (hasNumber.test(password)) count++;
      if (hasSpecialChar.test(password)) count++;
      return count >= 2;
    }, "Password must contain at least 2 of: uppercase, lowercase, numbers, or special characters")
    .refine((password) => {
      return !commonPasswords.includes(password.toLowerCase());
    }, "This password is too common and easily guessed")
    .optional()
    .refine((password) => {
      // Either password is undefined (OAuth) or it meets our requirements
      return password === undefined || password.length >= 8;
    }, "Password is required for standard authentication")
});

export const insertCafeSchema = createInsertSchema(cafes).omit({
  id: true,
  createdAt: true,
});

export const insertCafeRoastLevelSchema = createInsertSchema(cafeRoastLevels).omit({
  id: true,
});

export const insertCafeBrewingMethodSchema = createInsertSchema(cafeBrewingMethods).omit({
  id: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  createdAt: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

// Search and filter types
// Sort options enumeration
export const cafeSortOptionsEnum = [
  "default",        // Default sorting (featured/relevance)
  "distance",       // Distance from user's location
  "rating_high",    // Highest rating first
  "reviews_count"   // Most reviews first
] as const;

export const cafeFilterSchema = z.object({
  area: z.string().optional(),
  roastLevels: z.array(z.enum(["light", "light_medium", "medium", "medium_dark", "dark", "extra_dark"])).optional(),
  brewingMethods: z.array(z.enum(["espresso_based", "pour_over", "siphon", "mixed_drinks", "nitro", "cold_brew"])).optional(),
  minRating: z.number().min(0).max(5).optional(),
  priceLevel: z.number().min(1).max(4).optional(),
  sellsCoffeeBeans: z.boolean().optional(),
  query: z.string().optional(),
  sortBy: z.enum(cafeSortOptionsEnum).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  name: z.string().optional(),
  address: z.string().optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCafe = z.infer<typeof insertCafeSchema>;
export type Cafe = typeof cafes.$inferSelect;

export type InsertCafeRoastLevel = z.infer<typeof insertCafeRoastLevelSchema>;
export type CafeRoastLevel = typeof cafeRoastLevels.$inferSelect;

export type InsertCafeBrewingMethod = z.infer<typeof insertCafeBrewingMethodSchema>;
export type CafeBrewingMethod = typeof cafeBrewingMethods.$inferSelect;

export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

export type CafeFilter = z.infer<typeof cafeFilterSchema>;

// Extended types with additional data for frontend
export interface CafeWithDetails extends Cafe {
  roastLevels: string[];
  brewingMethods: string[];
  averageRating?: number;
  totalRatings?: number;
  isFavorite?: boolean;
}
