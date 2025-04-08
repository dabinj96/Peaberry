import { 
  users, type User, type InsertUser,
  cafes, type Cafe, type InsertCafe,
  cafeRoastLevels, type CafeRoastLevel, type InsertCafeRoastLevel,
  cafeBrewingMethods, type CafeBrewingMethod, type InsertCafeBrewingMethod,
  ratings, type Rating, type InsertRating,
  favorites, type Favorite, type InsertFavorite,
  CafeWithDetails, CafeFilter, roastLevelEnum, brewingMethodEnum
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ilike, or, count, avg, desc, sql, not, inArray } from "drizzle-orm";
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
      ssl: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Cafe methods
  async getCafe(id: number): Promise<Cafe | undefined> {
    const [cafe] = await db.select().from(cafes).where(eq(cafes.id, id));
    return cafe;
  }

  async getCafeWithDetails(id: number, userId?: number): Promise<CafeWithDetails | undefined> {
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
      roastLevels: roastLevels.map(rl => rl.roastLevel),
      brewingMethods: brewingMethods.map(bm => bm.brewingMethod),
      averageRating: ratingInfo.average,
      totalRatings: ratingInfo.count,
    };

    // Check if user has favorited this cafe
    if (userId) {
      cafeWithDetails.isFavorite = await this.isUserFavorite(userId, id);
    }

    return cafeWithDetails;
  }

  async listCafes(filters?: CafeFilter, userId?: number): Promise<CafeWithDetails[]> {
    // Base query
    let query = db.select().from(cafes);
    
    if (filters) {
      // Apply filters
      const whereConditions = [];
      
      // Neighborhood filter
      if (filters.neighborhood && filters.neighborhood !== '') {
        whereConditions.push(eq(cafes.neighborhood, filters.neighborhood));
      }
      
      // Price level filter
      if (filters.priceLevel) {
        whereConditions.push(eq(cafes.priceLevel, filters.priceLevel));
      }
      
      // Amenities filters
      if (filters.hasWifi) {
        whereConditions.push(eq(cafes.hasWifi, true));
      }
      if (filters.hasPower) {
        whereConditions.push(eq(cafes.hasPower, true));
      }
      if (filters.hasFood) {
        whereConditions.push(eq(cafes.hasFood, true));
      }
      
      // Text search filter
      if (filters.query && filters.query.trim() !== '') {
        const searchTerm = `%${filters.query.toLowerCase()}%`;
        whereConditions.push(
          or(
            ilike(cafes.name, searchTerm),
            ilike(cafes.description, searchTerm),
            ilike(cafes.neighborhood, searchTerm),
            ilike(cafes.address, searchTerm)
          )
        );
      }
      
      // Apply all conditions
      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }
    }
    
    // Execute query to get filtered cafes
    const filteredCafes = await query;
    
    // Enhancement: We could optimize further by using JOINs, but this follows
    // the existing pattern of the memory storage implementation
    const cafesWithDetails: CafeWithDetails[] = await Promise.all(
      filteredCafes.map(async (cafe) => {
        const cafeDetails = await this.getCafeWithDetails(cafe.id, userId);
        return cafeDetails!;
      })
    );
    
    // Apply post-fetch filters that require the CafeWithDetails info
    let result = cafesWithDetails;
    
    // Roast level filter
    if (filters?.roastLevels && filters.roastLevels.length > 0) {
      result = result.filter(cafe => 
        filters.roastLevels!.some(level => cafe.roastLevels.includes(level))
      );
    }
    
    // Brewing method filter
    if (filters?.brewingMethods && filters.brewingMethods.length > 0) {
      result = result.filter(cafe => 
        filters.brewingMethods!.some(method => cafe.brewingMethods.includes(method))
      );
    }
    
    // Minimum rating filter
    if (filters?.minRating && filters.minRating > 0) {
      result = result.filter(cafe => 
        (cafe.averageRating || 0) >= filters.minRating!
      );
    }
    
    return result;
  }

  async createCafe(insertCafe: InsertCafe): Promise<Cafe> {
    const [cafe] = await db.insert(cafes).values(insertCafe).returning();
    return cafe;
  }

  async searchCafes(query: string, userId?: number): Promise<CafeWithDetails[]> {
    if (!query || query.trim() === '') {
      return this.listCafes(undefined, userId);
    }
    
    return this.listCafes({ query }, userId);
  }

  async listNeighborhoods(): Promise<string[]> {
    const results = await db
      .selectDistinct({ neighborhood: cafes.neighborhood })
      .from(cafes)
      .orderBy(cafes.neighborhood);
    
    return results.map(r => r.neighborhood);
  }

  // Cafe roast level methods
  async addCafeRoastLevel(insertCafeRoastLevel: InsertCafeRoastLevel): Promise<CafeRoastLevel> {
    // Check if the relationship already exists
    const existing = await db
      .select()
      .from(cafeRoastLevels)
      .where(
        and(
          eq(cafeRoastLevels.cafeId, insertCafeRoastLevel.cafeId),
          eq(cafeRoastLevels.roastLevel, insertCafeRoastLevel.roastLevel)
        )
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

  // Cafe brewing method methods
  async addCafeBrewingMethod(insertCafeBrewingMethod: InsertCafeBrewingMethod): Promise<CafeBrewingMethod> {
    // Check if the relationship already exists
    const existing = await db
      .select()
      .from(cafeBrewingMethods)
      .where(
        and(
          eq(cafeBrewingMethods.cafeId, insertCafeBrewingMethod.cafeId),
          eq(cafeBrewingMethods.brewingMethod, insertCafeBrewingMethod.brewingMethod)
        )
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

  // Rating methods
  async getRating(id: number): Promise<Rating | undefined> {
    const [rating] = await db
      .select()
      .from(ratings)
      .where(eq(ratings.id, id));
    
    return rating;
  }

  async getUserRatingForCafe(userId: number, cafeId: number): Promise<Rating | undefined> {
    const [rating] = await db
      .select()
      .from(ratings)
      .where(
        and(
          eq(ratings.userId, userId),
          eq(ratings.cafeId, cafeId)
        )
      );
    
    return rating;
  }

  async getCafeRatings(cafeId: number): Promise<Rating[]> {
    return db
      .select()
      .from(ratings)
      .where(eq(ratings.cafeId, cafeId));
  }

  async createRating(insertRating: InsertRating): Promise<Rating> {
    // Check if the user has already rated this cafe
    const existingRating = await this.getUserRatingForCafe(
      insertRating.userId,
      insertRating.cafeId
    );
    
    if (existingRating) {
      // Update the existing rating
      return (await this.updateRating(existingRating.id, insertRating))!;
    }
    
    // Create a new rating
    const [rating] = await db
      .insert(ratings)
      .values(insertRating)
      .returning();
    
    return rating;
  }

  async updateRating(id: number, ratingUpdate: Partial<InsertRating>): Promise<Rating | undefined> {
    const [updatedRating] = await db
      .update(ratings)
      .set(ratingUpdate)
      .where(eq(ratings.id, id))
      .returning();
    
    return updatedRating;
  }

  async getCafeAverageRating(cafeId: number): Promise<{ average: number; count: number }> {
    const [result] = await db
      .select({
        average: avg(ratings.rating),
        count: count()
      })
      .from(ratings)
      .where(eq(ratings.cafeId, cafeId));
    
    return {
      average: result.average ? parseFloat(Number(result.average).toFixed(1)) : 0,
      count: result.count || 0
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
        cafeId: favorites.cafeId
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
          eq(favorites.cafeId, insertFavorite.cafeId)
        )
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
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.cafeId, cafeId)
        )
      );
    
    // Simplified return value - we just need to know if the operation was successful
    return true;
  }

  async isUserFavorite(userId: number, cafeId: number): Promise<boolean> {
    const result = await db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.cafeId, cafeId)
        )
      );
    
    return result.length > 0;
  }
}