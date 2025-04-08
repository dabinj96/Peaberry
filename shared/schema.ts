import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roastLevelEnum = pgEnum('roast_level', ['light', 'medium', 'dark']);
export const brewingMethodEnum = pgEnum('brewing_method', ['pour_over', 'espresso', 'aeropress', 'french_press', 'siphon']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cafes table
export const cafes = pgTable("cafes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  neighborhood: text("neighborhood").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  priceLevel: integer("price_level").notNull(), // 1-4 representing $ to $$$$
  hasWifi: boolean("has_wifi").default(false),
  hasPower: boolean("has_power").default(false),
  hasFood: boolean("has_food").default(false),
  imageUrl: text("image_url"),
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

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
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
export const cafeFilterSchema = z.object({
  neighborhood: z.string().optional(),
  roastLevels: z.array(roastLevelEnum).optional(),
  brewingMethods: z.array(brewingMethodEnum).optional(),
  minRating: z.number().min(0).max(5).optional(),
  priceLevel: z.number().min(1).max(4).optional(),
  hasWifi: z.boolean().optional(),
  hasPower: z.boolean().optional(),
  hasFood: z.boolean().optional(),
  query: z.string().optional(),
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
