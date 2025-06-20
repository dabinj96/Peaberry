import {
  users,
  type User,
  type InsertUser,
  cafes,
  type Cafe,
  type InsertCafe,
  cafeRoastLevels,
  type CafeRoastLevel,
  type InsertCafeRoastLevel,
  cafeBrewingMethods,
  type CafeBrewingMethod,
  type InsertCafeBrewingMethod,
  ratings,
  type Rating,
  type InsertRating,
  favorites,
  type Favorite,
  type InsertFavorite,
  CafeWithDetails,
  CafeFilter,
  roastLevelEnum,
  brewingMethodEnum,
} from "@shared/schema";
import { db } from "./db";
import {
  eq,
  and,
  ilike,
  or,
  count,
  avg,
  desc,
  sql,
  not,
  inArray,
} from "drizzle-orm";
import { IStorage } from "./storage";
import session from "express-session";
import connectPg from "connect-pg-simple";

export class DatabaseStorage implements IStorage {
  public sessionStore: any; // Using any to avoid SessionStore type issues

  constructor() {
    // Create PostgreSQL session store
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ssl: true,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByProviderAuth(
    providerId: string,
    providerUid: string,
  ): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.providerId, providerId),
          eq(users.providerUid, providerUid),
        ),
      );
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(
    id: number,
    userData: Partial<User>,
  ): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();

    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // Begin by deleting related data for this user

      // Delete ratings by this user
      await db.delete(ratings).where(eq(ratings.userId, id));

      // Delete favorites by this user
      await db.delete(favorites).where(eq(favorites.userId, id));

      // Finally delete the user
      const result = await db.delete(users).where(eq(users.id, id));

      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  async deleteUserByProviderAuth(
    providerId: string,
    providerUid: string,
  ): Promise<boolean> {
    try {
      // Find the user first
      const user = await this.getUserByProviderAuth(providerId, providerUid);
      if (!user) {
        console.log(
          `No user found with provider auth: ${providerId}:${providerUid}`,
        );
        return false;
      }

      console.log(
        `Deleting user ${user.id} with provider auth: ${providerId}:${providerUid}`,
      );
      // Delete the user using the id
      return this.deleteUser(user.id);
    } catch (error) {
      console.error("Error deleting user by provider auth:", error);
      return false;
    }
  }

  async listUsers(): Promise<User[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      console.error("Error listing users:", error);
      return [];
    }
  }

  // Cafe methods
  async getCafe(id: number): Promise<Cafe | undefined> {
    const [cafe] = await db.select().from(cafes).where(eq(cafes.id, id));
    return cafe;
  }

  async getCafeWithDetails(
    id: number,
    userId?: number,
  ): Promise<CafeWithDetails | undefined> {
    // const rows = await db
    //   .select({
    //     cafe: cafes,
    //     roastLevels: sql`array_agg(${cafeRoastLevels.roastLevel})`,
    //     brewingMethods: cafeBrewingMethods,
    //   })
    //   .from(cafes)
    //   .where(eq(cafes.id, id))
    //   .leftJoin(cafeRoastLevels, eq(cafes.id, cafeRoastLevels.cafeId))
    //   .groupBy(cafes)
    //   .leftJoin(cafeBrewingMethods, eq(cafes.id, cafeBrewingMethods.cafeId));
    // console.log(rows);

    const [cafe] = await db.select().from(cafes).where(eq(cafes.id, id));
    if (!cafe) return undefined;

    // Get roast levels
    const roastLevels = await this.getCafeRoastLevels(id);

    // Get brewing methods
    const brewingMethods = await this.getCafeBrewingMethods(id);

    // Get rating info
    const ratingInfo = await this.getCafeAverageRating(id);

    const cafeWithDetails: CafeWithDetails = {
      ...cafe,
      roastLevels: roastLevels.map((rl) => rl.roastLevel),
      brewingMethods: brewingMethods.map((bm) => bm.brewingMethod),
      averageRating: ratingInfo.average,
      totalRatings: ratingInfo.count,
    };

    // Check if user has favorited this cafe
    if (userId) {
      cafeWithDetails.isFavorite = await this.isUserFavorite(userId, id);
    }

    return cafeWithDetails;
  }

  async listCafes(
    filters?: CafeFilter,
    userId?: number,
  ): Promise<CafeWithDetails[]> {
    // Base query
    let query = db.select().from(cafes);

    // Create where conditions array
    const whereConditions = [];

    // Status filter - if explicit status is provided, use that
    // Otherwise, default to showing only published cafes for public routes
    if (filters?.status) {
      whereConditions.push(eq(cafes.status, filters.status));
    } else if (!filters?.hasOwnProperty("status")) {
      // If status property is completely absent, default to published
      // This ensures admin routes can explicitly pass undefined to see all statuses
      whereConditions.push(eq(cafes.status, "published"));
    }

    if (filters) {
      // Area filter
      if (filters.area && filters.area !== "") {
        whereConditions.push(eq(cafes.area, filters.area));
      }

      // Price level filter
      if (filters.priceLevel) {
        whereConditions.push(eq(cafes.priceLevel, filters.priceLevel));
      }

      // Coffee beans filter
      if (filters.sellsCoffeeBeans !== undefined) {
        whereConditions.push(eq(cafes.sellsCoffeeBeans, filters.sellsCoffeeBeans));
      }

      // Text search filter
      if (filters.query && filters.query.trim() !== "") {
        const searchTerm = `%${filters.query.toLowerCase()}%`;
        whereConditions.push(
          or(
            ilike(cafes.name, searchTerm),
            ilike(cafes.description, searchTerm),
            ilike(cafes.area, searchTerm),
            ilike(cafes.address, searchTerm),
          ),
        );
      }
    }

    // Apply all conditions
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Execute query to get filtered cafes
    const filteredCafes = await query;

    // Enhancement: We could optimize further by using JOINs, but this follows
    // the existing pattern of the memory storage implementation
    const cafesWithDetails: CafeWithDetails[] = await Promise.all(
      filteredCafes.map(async (cafe) => {
        const cafeDetails = await this.getCafeWithDetails(cafe.id, userId);
        return cafeDetails!;
      }),
    );

    // Apply post-fetch filters that require the CafeWithDetails info
    let result = cafesWithDetails;

    // Roast level filter - café must have ALL selected roast levels
    if (filters?.roastLevels && filters.roastLevels.length > 0) {
      // Log for debugging
      console.log("Filtering by roast levels:", filters.roastLevels);

      result = result.filter((cafe) => {
        // Log for debugging
        console.log(
          `Cafe ${cafe.id} (${cafe.name}) has roast levels:`,
          cafe.roastLevels,
        );

        // Check if the cafe has ALL the selected roast levels
        return filters.roastLevels!.every((level) =>
          cafe.roastLevels.includes(level),
        );
      });
    }

    // Brewing method filter - café must have ALL selected brewing methods
    if (filters?.brewingMethods && filters.brewingMethods.length > 0) {
      // Log for debugging
      console.log("Filtering by brewing methods:", filters.brewingMethods);

      result = result.filter((cafe) => {
        // Log for debugging
        console.log(
          `Cafe ${cafe.id} (${cafe.name}) has brewing methods:`,
          cafe.brewingMethods,
        );

        // Check if the cafe has ALL the selected brewing methods
        return filters.brewingMethods!.every((method) =>
          cafe.brewingMethods.includes(method),
        );
      });
    }

    // Minimum rating filter
    if (filters?.minRating && filters.minRating > 0) {
      result = result.filter(
        (cafe) => (cafe.averageRating || 0) >= filters.minRating!,
      );
    }

    return result;
  }

  async createCafe(insertCafe: InsertCafe): Promise<Cafe> {
    const [cafe] = await db.insert(cafes).values(insertCafe).returning();
    return cafe;
  }

  async updateCafe(
    id: number,
    cafeData: Partial<Cafe>,
  ): Promise<Cafe | undefined> {
    const [updatedCafe] = await db
      .update(cafes)
      .set(cafeData)
      .where(eq(cafes.id, id))
      .returning();

    return updatedCafe;
  }

  async deleteCafe(id: number): Promise<boolean> {
    try {
      // Use a transaction to ensure all related data is deleted
      // Step 1: Delete cafe roast levels
      await db.delete(cafeRoastLevels).where(eq(cafeRoastLevels.cafeId, id));

      // Step 2: Delete cafe brewing methods
      await db
        .delete(cafeBrewingMethods)
        .where(eq(cafeBrewingMethods.cafeId, id));

      // Step 3: Delete ratings
      await db.delete(ratings).where(eq(ratings.cafeId, id));

      // Step 4: Delete favorites
      await db.delete(favorites).where(eq(favorites.cafeId, id));

      // Step 5: Delete the cafe itself
      await db.delete(cafes).where(eq(cafes.id, id));

      return true;
    } catch (error) {
      console.error(`Error deleting cafe with ID ${id}:`, error);
      return false;
    }
  }

  async searchCafes(
    query: string,
    userId?: number,
  ): Promise<CafeWithDetails[]> {
    if (!query || query.trim() === "") {
      return this.listCafes(undefined, userId);
    }

    // Make sure we only return published cafes for the public search
    return this.listCafes({ query, status: "published" }, userId);
  }

  async listAreas(): Promise<string[]> {
    const results = await db
      .selectDistinct({ area: cafes.area })
      .from(cafes)
      .where(eq(cafes.status, "published")) // Only show areas from published cafés
      .orderBy(cafes.area);

    return results.map((r) => r.area);
  }

  // Cafe roast level methods
  async addCafeRoastLevel(
    insertCafeRoastLevel: InsertCafeRoastLevel,
  ): Promise<CafeRoastLevel> {
    // Check if the relationship already exists
    const existing = await db
      .select()
      .from(cafeRoastLevels)
      .where(
        and(
          eq(cafeRoastLevels.cafeId, insertCafeRoastLevel.cafeId),
          eq(cafeRoastLevels.roastLevel, insertCafeRoastLevel.roastLevel),
        ),
      );

    if (existing.length > 0) {
      return existing[0];
    }

    const [result] = await db
      .insert(cafeRoastLevels)
      .values(insertCafeRoastLevel)
      .returning();

    return result;
  }

  async getCafeRoastLevels(cafeId: number): Promise<CafeRoastLevel[]> {
    return db
      .select()
      .from(cafeRoastLevels)
      .where(eq(cafeRoastLevels.cafeId, cafeId));
  }

  async updateCafeRoastLevels(
    cafeId: number,
    roastLevels: string[],
  ): Promise<CafeRoastLevel[]> {
    // Delete all existing roast levels for this cafe
    await db.delete(cafeRoastLevels).where(eq(cafeRoastLevels.cafeId, cafeId));

    // Add the new roast levels
    const newRoastLevels: CafeRoastLevel[] = [];
    for (const level of roastLevels) {
      if (
        [
          "light",
          "light_medium",
          "medium",
          "medium_dark",
          "dark",
          "extra_dark",
        ].includes(level)
      ) {
        const roastLevel = await this.addCafeRoastLevel({
          cafeId,
          roastLevel: level as
            | "light"
            | "light_medium"
            | "medium"
            | "medium_dark"
            | "dark"
            | "extra_dark",
        });
        newRoastLevels.push(roastLevel);
      }
    }

    return newRoastLevels;
  }

  // Cafe brewing method methods
  async addCafeBrewingMethod(
    insertCafeBrewingMethod: InsertCafeBrewingMethod,
  ): Promise<CafeBrewingMethod> {
    // Check if the relationship already exists
    const existing = await db
      .select()
      .from(cafeBrewingMethods)
      .where(
        and(
          eq(cafeBrewingMethods.cafeId, insertCafeBrewingMethod.cafeId),
          eq(
            cafeBrewingMethods.brewingMethod,
            insertCafeBrewingMethod.brewingMethod,
          ),
        ),
      );

    if (existing.length > 0) {
      return existing[0];
    }

    const [result] = await db
      .insert(cafeBrewingMethods)
      .values(insertCafeBrewingMethod)
      .returning();

    return result;
  }

  async getCafeBrewingMethods(cafeId: number): Promise<CafeBrewingMethod[]> {
    return db
      .select()
      .from(cafeBrewingMethods)
      .where(eq(cafeBrewingMethods.cafeId, cafeId));
  }

  async updateCafeBrewingMethods(
    cafeId: number,
    brewingMethods: string[],
  ): Promise<CafeBrewingMethod[]> {
    // Delete all existing brewing methods for this cafe
    await db
      .delete(cafeBrewingMethods)
      .where(eq(cafeBrewingMethods.cafeId, cafeId));

    // Add the new brewing methods
    const newBrewingMethods: CafeBrewingMethod[] = [];
    const validMethods = [
      "espresso_based",
      "pour_over",
      "siphon",
      "mixed_drinks",
      "nitro",
      "cold_brew",
    ];

    for (const method of brewingMethods) {
      if (validMethods.includes(method)) {
        const brewingMethod = await this.addCafeBrewingMethod({
          cafeId,
          brewingMethod: method as
            | "espresso_based"
            | "pour_over"
            | "siphon"
            | "mixed_drinks"
            | "nitro"
            | "cold_brew",
        });
        newBrewingMethods.push(brewingMethod);
      }
    }

    return newBrewingMethods;
  }

  // Rating methods
  async getRating(id: number): Promise<Rating | undefined> {
    const [rating] = await db.select().from(ratings).where(eq(ratings.id, id));

    return rating;
  }

  async getUserRatingForCafe(
    userId: number,
    cafeId: number,
  ): Promise<Rating | undefined> {
    const [rating] = await db
      .select()
      .from(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.cafeId, cafeId)));

    return rating;
  }

  async getCafeRatings(cafeId: number): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.cafeId, cafeId));
  }

  async createRating(insertRating: InsertRating): Promise<Rating> {
    // Check if the user has already rated this cafe
    const existingRating = await this.getUserRatingForCafe(
      insertRating.userId,
      insertRating.cafeId,
    );

    if (existingRating) {
      // Update the existing rating
      return (await this.updateRating(existingRating.id, insertRating))!;
    }

    // Create a new rating
    const [rating] = await db.insert(ratings).values(insertRating).returning();

    return rating;
  }

  async updateRating(
    id: number,
    ratingUpdate: Partial<InsertRating>,
  ): Promise<Rating | undefined> {
    const [updatedRating] = await db
      .update(ratings)
      .set(ratingUpdate)
      .where(eq(ratings.id, id))
      .returning();

    return updatedRating;
  }

  async getCafeAverageRating(
    cafeId: number,
  ): Promise<{ average: number; count: number }> {
    const [result] = await db
      .select({
        average: avg(ratings.rating),
        count: count(),
      })
      .from(ratings)
      .where(eq(ratings.cafeId, cafeId));

    return {
      average: result.average
        ? parseFloat(Number(result.average).toFixed(1))
        : 0,
      count: result.count || 0,
    };
  }

  // Favorite methods
  async getFavorite(id: number): Promise<Favorite | undefined> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(eq(favorites.id, id));

    return favorite;
  }

  async getUserFavorites(userId: number): Promise<CafeWithDetails[]> {
    // Get the user's favorites
    const userFavorites = await db
      .select({
        cafeId: favorites.cafeId,
      })
      .from(favorites)
      .where(eq(favorites.userId, userId));

    // Get detailed information for each favorited cafe
    const cafesWithDetails: CafeWithDetails[] = [];
    for (const fav of userFavorites) {
      const cafe = await this.getCafeWithDetails(fav.cafeId, userId);
      if (cafe) {
        cafesWithDetails.push(cafe);
      }
    }

    return cafesWithDetails;
  }

  async createFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    // Check if the user has already favorited this cafe
    const existing = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, insertFavorite.userId),
          eq(favorites.cafeId, insertFavorite.cafeId),
        ),
      );

    if (existing.length > 0) {
      return existing[0];
    }

    // Create a new favorite
    const [favorite] = await db
      .insert(favorites)
      .values(insertFavorite)
      .returning();

    return favorite;
  }

  async deleteFavorite(userId: number, cafeId: number): Promise<boolean> {
    const result = await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.cafeId, cafeId)));

    // Simplified return value - we just need to know if the operation was successful
    return true;
  }

  async isUserFavorite(userId: number, cafeId: number): Promise<boolean> {
    const result = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.cafeId, cafeId)));

    return result.length > 0;
  }
}
