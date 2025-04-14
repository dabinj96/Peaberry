import { 
  users, type User, type InsertUser,
  cafes, type Cafe, type InsertCafe,
  cafeRoastLevels, type CafeRoastLevel, type InsertCafeRoastLevel,
  cafeBrewingMethods, type CafeBrewingMethod, type InsertCafeBrewingMethod,
  ratings, type Rating, type InsertRating,
  favorites, type Favorite, type InsertFavorite,
  CafeWithDetails, CafeFilter,
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

// Modify the interface with CRUD methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProviderAuth(providerId: string, providerUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  deleteUserByProviderAuth(providerId: string, providerUid: string): Promise<boolean>;

  // Cafe methods
  getCafe(id: number): Promise<Cafe | undefined>;
  getCafeWithDetails(id: number, userId?: number): Promise<CafeWithDetails | undefined>;
  listCafes(filters?: CafeFilter, userId?: number): Promise<CafeWithDetails[]>;
  createCafe(cafe: InsertCafe): Promise<Cafe>;
  updateCafe(id: number, cafeData: Partial<Cafe>): Promise<Cafe | undefined>;
  deleteCafe(id: number): Promise<boolean>;
  searchCafes(query: string, userId?: number): Promise<CafeWithDetails[]>;
  listNeighborhoods(): Promise<string[]>;

  // Cafe roast level methods
  addCafeRoastLevel(cafeRoastLevel: InsertCafeRoastLevel): Promise<CafeRoastLevel>;
  getCafeRoastLevels(cafeId: number): Promise<CafeRoastLevel[]>;
  updateCafeRoastLevels(cafeId: number, roastLevels: string[]): Promise<CafeRoastLevel[]>;

  // Cafe brewing method methods
  addCafeBrewingMethod(cafeBrewingMethod: InsertCafeBrewingMethod): Promise<CafeBrewingMethod>;
  getCafeBrewingMethods(cafeId: number): Promise<CafeBrewingMethod[]>;
  updateCafeBrewingMethods(cafeId: number, brewingMethods: string[]): Promise<CafeBrewingMethod[]>;

  // Rating methods
  getRating(id: number): Promise<Rating | undefined>;
  getUserRatingForCafe(userId: number, cafeId: number): Promise<Rating | undefined>;
  getCafeRatings(cafeId: number): Promise<Rating[]>;
  createRating(rating: InsertRating): Promise<Rating>;
  updateRating(id: number, rating: Partial<InsertRating>): Promise<Rating | undefined>;
  getCafeAverageRating(cafeId: number): Promise<{ average: number; count: number }>;

  // Favorite methods
  getFavorite(id: number): Promise<Favorite | undefined>;
  getUserFavorites(userId: number): Promise<CafeWithDetails[]>;
  createFavorite(favorite: InsertFavorite): Promise<Favorite>;
  deleteFavorite(userId: number, cafeId: number): Promise<boolean>;
  isUserFavorite(userId: number, cafeId: number): Promise<boolean>;

  // Session store
  sessionStore: any; // Using any to avoid TypeScript errors with session store
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private cafesMap: Map<number, Cafe>;
  private cafeRoastLevelsMap: Map<number, CafeRoastLevel>;
  private cafeBrewingMethodsMap: Map<number, CafeBrewingMethod>;
  private ratingsMap: Map<number, Rating>;
  private favoritesMap: Map<number, Favorite>;
  
  private userIdCounter: number;
  private cafeIdCounter: number;
  private cafeRoastLevelIdCounter: number;
  private cafeBrewingMethodIdCounter: number;
  private ratingIdCounter: number;
  private favoriteIdCounter: number;
  
  public sessionStore: any; // Using any to avoid SessionStore type issues

  constructor() {
    this.usersMap = new Map();
    this.cafesMap = new Map();
    this.cafeRoastLevelsMap = new Map();
    this.cafeBrewingMethodsMap = new Map();
    this.ratingsMap = new Map();
    this.favoritesMap = new Map();
    
    this.userIdCounter = 1;
    this.cafeIdCounter = 1;
    this.cafeRoastLevelIdCounter = 1;
    this.cafeBrewingMethodIdCounter = 1;
    this.ratingIdCounter = 1;
    this.favoriteIdCounter = 1;

    // Setup session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // Prune expired entries every 24h
    });

    // Initialize with sample data
    this.initSampleData();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.usersMap.values()) {
      if (user.username.toLowerCase() === username.toLowerCase()) {
        return user;
      }
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.usersMap.values()) {
      if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return undefined;
  }

  async getUserByProviderAuth(providerId: string, providerUid: string): Promise<User | undefined> {
    for (const user of this.usersMap.values()) {
      if (user.providerId === providerId && user.providerUid === providerUid) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.usersMap.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const existingUser = this.usersMap.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser: User = {
      ...existingUser,
      ...userData,
      id, // Ensure ID doesn't change
      createdAt: existingUser.createdAt // Preserve creation date
    };
    
    this.usersMap.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    // First check if the user exists
    if (!this.usersMap.has(id)) {
      return false;
    }
    
    // Delete related data
    
    // 1. Delete user's ratings
    const ratingsToDelete = Array.from(this.ratingsMap.entries())
      .filter(([_, rating]) => rating.userId === id)
      .map(([id, _]) => id);
    
    for (const ratingId of ratingsToDelete) {
      this.ratingsMap.delete(ratingId);
    }
    
    // 2. Delete user's favorites
    const favoritesToDelete = Array.from(this.favoritesMap.entries())
      .filter(([_, favorite]) => favorite.userId === id)
      .map(([id, _]) => id);
    
    for (const favoriteId of favoritesToDelete) {
      this.favoritesMap.delete(favoriteId);
    }
    
    // Finally, delete the user itself
    return this.usersMap.delete(id);
  }
  
  async deleteUserByProviderAuth(providerId: string, providerUid: string): Promise<boolean> {
    // Find the user by provider auth
    const user = await this.getUserByProviderAuth(providerId, providerUid);
    if (!user) {
      return false;
    }
    
    // Delete the user by ID
    return this.deleteUser(user.id);
  }

  // Cafe methods
  async getCafe(id: number): Promise<Cafe | undefined> {
    return this.cafesMap.get(id);
  }

  async getCafeWithDetails(id: number, userId?: number): Promise<CafeWithDetails | undefined> {
    const cafe = this.cafesMap.get(id);
    if (!cafe) return undefined;

    const roastLevels = await this.getCafeRoastLevels(id);
    const brewingMethods = await this.getCafeBrewingMethods(id);
    const ratingInfo = await this.getCafeAverageRating(id);
    
    const cafeWithDetails: CafeWithDetails = {
      ...cafe,
      roastLevels: roastLevels.map(rl => rl.roastLevel),
      brewingMethods: brewingMethods.map(bm => bm.brewingMethod),
      averageRating: ratingInfo.average,
      totalRatings: ratingInfo.count,
    };

    if (userId) {
      cafeWithDetails.isFavorite = await this.isUserFavorite(userId, id);
    }

    return cafeWithDetails;
  }

  async listCafes(filters?: CafeFilter, userId?: number): Promise<CafeWithDetails[]> {
    let cafes = Array.from(this.cafesMap.values());
    
    // Filter by status
    // If status is explicitly provided in filters, use that
    // Otherwise for non-admin routes, only show published cafes by default
    if (filters?.status) {
      cafes = cafes.filter(cafe => cafe.status === filters.status);
    } else if (!filters?.status && !filters?.hasOwnProperty('status')) {
      // Only apply default filtering when status property is completely absent
      // This ensures admin routes can explicitly pass null to see all statuses
      cafes = cafes.filter(cafe => cafe.status === 'published');
    }
    
    if (filters) {
      // Apply neighborhood filter
      if (filters.neighborhood && filters.neighborhood !== '') {
        cafes = cafes.filter(cafe => 
          cafe.neighborhood.toLowerCase() === filters.neighborhood!.toLowerCase()
        );
      }

      // Apply price level filter
      if (filters.priceLevel) {
        cafes = cafes.filter(cafe => cafe.priceLevel <= filters.priceLevel!);
      }

      // Apply amenities filters
      if (filters.hasWifi) {
        cafes = cafes.filter(cafe => cafe.hasWifi);
      }
      if (filters.hasPower) {
        cafes = cafes.filter(cafe => cafe.hasPower);
      }
      if (filters.hasFood) {
        cafes = cafes.filter(cafe => cafe.hasFood);
      }

      // Apply text search
      if (filters.query && filters.query.trim() !== '') {
        const query = filters.query.toLowerCase();
        cafes = cafes.filter(cafe => 
          cafe.name.toLowerCase().includes(query) || 
          cafe.description.toLowerCase().includes(query) ||
          cafe.neighborhood.toLowerCase().includes(query) ||
          cafe.address.toLowerCase().includes(query)
        );
      }
    }

    // Map to CafeWithDetails with additional info
    const cafesWithDetails: CafeWithDetails[] = await Promise.all(
      cafes.map(async (cafe) => {
        const roastLevels = await this.getCafeRoastLevels(cafe.id);
        const brewingMethods = await this.getCafeBrewingMethods(cafe.id);
        const ratingInfo = await this.getCafeAverageRating(cafe.id);
        
        const cafeWithDetails: CafeWithDetails = {
          ...cafe,
          roastLevels: roastLevels.map(rl => rl.roastLevel),
          brewingMethods: brewingMethods.map(bm => bm.brewingMethod),
          averageRating: ratingInfo.average,
          totalRatings: ratingInfo.count,
        };

        if (userId) {
          cafeWithDetails.isFavorite = await this.isUserFavorite(userId, cafe.id);
        }

        return cafeWithDetails;
      })
    );

    // Apply roast level filters
    if (filters?.roastLevels && filters.roastLevels.length > 0) {
      return cafesWithDetails.filter(cafe => 
        filters.roastLevels!.some(level => cafe.roastLevels.includes(level))
      );
    }

    // Apply brewing method filters
    if (filters?.brewingMethods && filters.brewingMethods.length > 0) {
      return cafesWithDetails.filter(cafe => 
        filters.brewingMethods!.some(method => cafe.brewingMethods.includes(method))
      );
    }

    // Apply minimum rating filter
    if (filters?.minRating && filters.minRating > 0) {
      return cafesWithDetails.filter(cafe => 
        (cafe.averageRating || 0) >= filters.minRating!
      );
    }

    return cafesWithDetails;
  }

  async createCafe(insertCafe: InsertCafe): Promise<Cafe> {
    const id = this.cafeIdCounter++;
    const createdAt = new Date();
    const cafe: Cafe = { ...insertCafe, id, createdAt };
    this.cafesMap.set(id, cafe);
    return cafe;
  }
  
  async updateCafe(id: number, cafeData: Partial<Cafe>): Promise<Cafe | undefined> {
    const existingCafe = this.cafesMap.get(id);
    if (!existingCafe) return undefined;
    
    const updatedCafe: Cafe = {
      ...existingCafe,
      ...cafeData,
      id, // Ensure ID doesn't change
      createdAt: existingCafe.createdAt // Preserve creation date
    };
    
    this.cafesMap.set(id, updatedCafe);
    return updatedCafe;
  }
  
  async deleteCafe(id: number): Promise<boolean> {
    // First check if the cafe exists
    if (!this.cafesMap.has(id)) {
      return false;
    }
    
    // Delete related data
    // 1. Delete roast levels
    const roastLevels = await this.getCafeRoastLevels(id);
    for (const rl of roastLevels) {
      this.cafeRoastLevelsMap.delete(rl.id);
    }
    
    // 2. Delete brewing methods
    const brewingMethods = await this.getCafeBrewingMethods(id);
    for (const bm of brewingMethods) {
      this.cafeBrewingMethodsMap.delete(bm.id);
    }
    
    // 3. Delete ratings
    const ratings = await this.getCafeRatings(id);
    for (const rating of ratings) {
      this.ratingsMap.delete(rating.id);
    }
    
    // 4. Delete favorites
    for (const [favId, fav] of this.favoritesMap.entries()) {
      if (fav.cafeId === id) {
        this.favoritesMap.delete(favId);
      }
    }
    
    // Finally, delete the cafe itself
    return this.cafesMap.delete(id);
  }

  async searchCafes(query: string, userId?: number): Promise<CafeWithDetails[]> {
    if (!query || query.trim() === '') {
      return this.listCafes(undefined, userId);
    }
    
    return this.listCafes({ query }, userId);
  }

  async listNeighborhoods(): Promise<string[]> {
    const neighborhoods = new Set<string>();
    for (const cafe of this.cafesMap.values()) {
      neighborhoods.add(cafe.neighborhood);
    }
    return Array.from(neighborhoods).sort();
  }

  // Cafe roast level methods
  async addCafeRoastLevel(insertCafeRoastLevel: InsertCafeRoastLevel): Promise<CafeRoastLevel> {
    const id = this.cafeRoastLevelIdCounter++;
    const cafeRoastLevel: CafeRoastLevel = { ...insertCafeRoastLevel, id };
    this.cafeRoastLevelsMap.set(id, cafeRoastLevel);
    return cafeRoastLevel;
  }

  async getCafeRoastLevels(cafeId: number): Promise<CafeRoastLevel[]> {
    return Array.from(this.cafeRoastLevelsMap.values())
      .filter(rl => rl.cafeId === cafeId);
  }
  
  async updateCafeRoastLevels(cafeId: number, roastLevels: string[]): Promise<CafeRoastLevel[]> {
    // Remove existing roast levels for this cafe
    const existingIds = Array.from(this.cafeRoastLevelsMap.entries())
      .filter(([_, rl]) => rl.cafeId === cafeId)
      .map(([id, _]) => id);
    
    for (const id of existingIds) {
      this.cafeRoastLevelsMap.delete(id);
    }
    
    // Add new roast levels
    const newRoastLevels: CafeRoastLevel[] = [];
    for (const level of roastLevels) {
      if (["light", "medium", "dark"].includes(level)) {
        const roastLevel = await this.addCafeRoastLevel({ 
          cafeId, 
          roastLevel: level as "light" | "medium" | "dark" 
        });
        newRoastLevels.push(roastLevel);
      }
    }
    
    return newRoastLevels;
  }

  // Cafe brewing method methods
  async addCafeBrewingMethod(insertCafeBrewingMethod: InsertCafeBrewingMethod): Promise<CafeBrewingMethod> {
    const id = this.cafeBrewingMethodIdCounter++;
    const cafeBrewingMethod: CafeBrewingMethod = { ...insertCafeBrewingMethod, id };
    this.cafeBrewingMethodsMap.set(id, cafeBrewingMethod);
    return cafeBrewingMethod;
  }

  async getCafeBrewingMethods(cafeId: number): Promise<CafeBrewingMethod[]> {
    return Array.from(this.cafeBrewingMethodsMap.values())
      .filter(bm => bm.cafeId === cafeId);
  }
  
  async updateCafeBrewingMethods(cafeId: number, brewingMethods: string[]): Promise<CafeBrewingMethod[]> {
    // Remove existing brewing methods for this cafe
    const existingIds = Array.from(this.cafeBrewingMethodsMap.entries())
      .filter(([_, bm]) => bm.cafeId === cafeId)
      .map(([id, _]) => id);
    
    for (const id of existingIds) {
      this.cafeBrewingMethodsMap.delete(id);
    }
    
    // Add new brewing methods
    const newBrewingMethods: CafeBrewingMethod[] = [];
    const validMethods = ["pour_over", "espresso", "aeropress", "french_press", "siphon"];
    
    for (const method of brewingMethods) {
      if (validMethods.includes(method)) {
        const brewingMethod = await this.addCafeBrewingMethod({ 
          cafeId, 
          brewingMethod: method as "pour_over" | "espresso" | "aeropress" | "french_press" | "siphon" 
        });
        newBrewingMethods.push(brewingMethod);
      }
    }
    
    return newBrewingMethods;
  }

  // Rating methods
  async getRating(id: number): Promise<Rating | undefined> {
    return this.ratingsMap.get(id);
  }

  async getUserRatingForCafe(userId: number, cafeId: number): Promise<Rating | undefined> {
    for (const rating of this.ratingsMap.values()) {
      if (rating.userId === userId && rating.cafeId === cafeId) {
        return rating;
      }
    }
    return undefined;
  }

  async getCafeRatings(cafeId: number): Promise<Rating[]> {
    return Array.from(this.ratingsMap.values())
      .filter(rating => rating.cafeId === cafeId);
  }

  async createRating(insertRating: InsertRating): Promise<Rating> {
    // Check if user has already rated this cafe
    const existingRating = await this.getUserRatingForCafe(insertRating.userId, insertRating.cafeId);
    if (existingRating) {
      return this.updateRating(existingRating.id, insertRating) as Promise<Rating>;
    }

    const id = this.ratingIdCounter++;
    const createdAt = new Date();
    const rating: Rating = { ...insertRating, id, createdAt };
    this.ratingsMap.set(id, rating);
    return rating;
  }

  async updateRating(id: number, ratingUpdate: Partial<InsertRating>): Promise<Rating | undefined> {
    const existingRating = this.ratingsMap.get(id);
    if (!existingRating) return undefined;

    const updatedRating: Rating = {
      ...existingRating,
      ...ratingUpdate,
    };

    this.ratingsMap.set(id, updatedRating);
    return updatedRating;
  }

  async getCafeAverageRating(cafeId: number): Promise<{ average: number; count: number }> {
    const ratings = await this.getCafeRatings(cafeId);
    if (ratings.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
    return { 
      average: parseFloat((sum / ratings.length).toFixed(1)), 
      count: ratings.length 
    };
  }

  // Favorite methods
  async getFavorite(id: number): Promise<Favorite | undefined> {
    return this.favoritesMap.get(id);
  }

  async getUserFavorites(userId: number): Promise<CafeWithDetails[]> {
    const favorites = Array.from(this.favoritesMap.values())
      .filter(fav => fav.userId === userId);
    
    const cafes: CafeWithDetails[] = [];
    for (const fav of favorites) {
      const cafe = await this.getCafeWithDetails(fav.cafeId, userId);
      if (cafe) {
        cafes.push(cafe);
      }
    }
    
    return cafes;
  }

  async createFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    // Check if already favorited
    for (const fav of this.favoritesMap.values()) {
      if (fav.userId === insertFavorite.userId && fav.cafeId === insertFavorite.cafeId) {
        return fav;
      }
    }

    const id = this.favoriteIdCounter++;
    const createdAt = new Date();
    const favorite: Favorite = { ...insertFavorite, id, createdAt };
    this.favoritesMap.set(id, favorite);
    return favorite;
  }

  async deleteFavorite(userId: number, cafeId: number): Promise<boolean> {
    for (const [id, fav] of this.favoritesMap.entries()) {
      if (fav.userId === userId && fav.cafeId === cafeId) {
        return this.favoritesMap.delete(id);
      }
    }
    return false;
  }

  async isUserFavorite(userId: number, cafeId: number): Promise<boolean> {
    for (const fav of this.favoritesMap.values()) {
      if (fav.userId === userId && fav.cafeId === cafeId) {
        return true;
      }
    }
    return false;
  }

  // Initialize sample data
  private async initSampleData() {
    // Sample cafes
    const sampleCafes: InsertCafe[] = [
      {
        name: "The Thinking Cup",
        description: "Known for their classic coffees and artisanal pastries, this coffeehouse has a charming vintage atmosphere.",
        address: "165 Tremont St, Boston, MA 02111",
        neighborhood: "Downtown",
        latitude: "42.3524",
        longitude: "-71.0642",
        priceLevel: 2,
        hasWifi: true,
        hasPower: true,
        hasFood: true,
        imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24",
        status: "draft" // Ensure sample cafés have an explicit status as draft for admin review
      },
      {
        name: "Barrington Coffee",
        description: "A specialty roaster offering a variety of single-origin beans and expertly crafted espresso drinks.",
        address: "303 Newbury St, Boston, MA 02115",
        neighborhood: "Back Bay",
        latitude: "42.3486",
        longitude: "-71.0846",
        priceLevel: 2,
        hasWifi: true,
        hasPower: false,
        hasFood: true,
        imageUrl: "https://images.unsplash.com/photo-1445116572660-236099ec97a0",
        status: "draft" // Ensure sample cafés have an explicit status as draft for admin review
      },
      {
        name: "Gracenote Coffee",
        description: "Small-batch roaster with an intimate space serving exceptional espresso and pour-overs.",
        address: "108 Lincoln St, Boston, MA 02111",
        neighborhood: "South End",
        latitude: "42.3489",
        longitude: "-71.0574",
        priceLevel: 3,
        hasWifi: false,
        hasPower: false,
        hasFood: false,
        imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb",
        status: "draft" // Ensure sample cafés have an explicit status as draft for admin review
      },
      {
        name: "Broadsheet Coffee",
        description: "Spacious cafe with a focus on ethically sourced beans and precise brewing techniques.",
        address: "100 Kirkland St, Cambridge, MA 02138",
        neighborhood: "Cambridge",
        latitude: "42.3782",
        longitude: "-71.1222",
        priceLevel: 2,
        hasWifi: true,
        hasPower: true,
        hasFood: true,
        imageUrl: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf",
        status: "draft" // Ensure sample cafés have an explicit status as draft for admin review
      },
      {
        name: "Ogawa Coffee",
        description: "Japanese-inspired coffee shop featuring award-winning baristas and unique brewing methods.",
        address: "10 Milk St, Boston, MA 02108",
        neighborhood: "Downtown",
        latitude: "42.3583",
        longitude: "-71.0580",
        priceLevel: 3,
        hasWifi: true,
        hasPower: true,
        hasFood: true,
        imageUrl: "https://images.unsplash.com/photo-1498804103079-a6351b050096",
        status: "draft" // Ensure sample cafés have an explicit status as draft for admin review
      },
      {
        name: "Diesel Cafe",
        description: "Spacious, industrial-chic coffeehouse with pool tables and local art.",
        address: "257 Elm St, Somerville, MA 02144",
        neighborhood: "Somerville",
        latitude: "42.3950",
        longitude: "-71.1223",
        priceLevel: 1,
        hasWifi: true,
        hasPower: true,
        hasFood: true,
        imageUrl: "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56",
        status: "draft" // Ensure sample cafés have an explicit status as draft for admin review
      },
      {
        name: "George Howell Coffee",
        description: "Known for their meticulous roasting and brewing techniques, offering a variety of single-origin beans.",
        address: "505 Washington St, Boston, MA 02111",
        neighborhood: "Downtown",
        latitude: "42.3547",
        longitude: "-71.0608",
        priceLevel: 3,
        hasWifi: true,
        hasPower: true,
        hasFood: true,
        imageUrl: "https://images.unsplash.com/photo-1559305616-3f99cd43e353",
        status: "draft" // Ensure sample cafés have an explicit status as draft for admin review
      },
      {
        name: "Pavement Coffeehouse",
        description: "A Boston staple with multiple locations, featuring house-roasted beans and artisanal bagels.",
        address: "1096 Boylston St, Boston, MA 02215",
        neighborhood: "Back Bay",
        latitude: "42.3481",
        longitude: "-71.0869",
        priceLevel: 2,
        hasWifi: true,
        hasPower: true,
        hasFood: true,
        imageUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31",
        status: "draft" // Ensure sample cafés have an explicit status as draft for admin review
      },
      {
        name: "Blue Bottle Coffee",
        description: "Minimalist cafés with a focus on single-origin beans and meticulously crafted pour-overs.",
        address: "163 Newbury St, Boston, MA 02116",
        neighborhood: "Back Bay",
        latitude: "42.3507",
        longitude: "-71.0753",
        priceLevel: 3,
        hasWifi: false,
        hasPower: false,
        hasFood: true,
        imageUrl: "https://images.unsplash.com/photo-1514481538271-cf9f99627524",
        status: "draft" // Ensure sample cafés have an explicit status as draft for admin review
      }
    ];

    // Create cafes
    for (const cafeData of sampleCafes) {
      const cafe = await this.createCafe(cafeData);
      
      // Add roast levels
      if (cafe.name.includes("The Thinking Cup") || cafe.name.includes("Ogawa Coffee")) {
        await this.addCafeRoastLevel({ cafeId: cafe.id, roastLevel: "medium" });
      }
      
      if (cafe.name.includes("Barrington Coffee") || cafe.name.includes("Broadsheet Coffee") || cafe.name.includes("Blue Bottle Coffee")) {
        await this.addCafeRoastLevel({ cafeId: cafe.id, roastLevel: "light" });
      }
      
      if (cafe.name.includes("Gracenote Coffee") || cafe.name.includes("Diesel Cafe") || cafe.name.includes("George Howell Coffee")) {
        await this.addCafeRoastLevel({ cafeId: cafe.id, roastLevel: "dark" });
      }
      
      if (cafe.name.includes("Pavement Coffeehouse")) {
        await this.addCafeRoastLevel({ cafeId: cafe.id, roastLevel: "light" });
        await this.addCafeRoastLevel({ cafeId: cafe.id, roastLevel: "medium" });
      }

      // Add brewing methods
      if (cafe.name.includes("The Thinking Cup") || cafe.name.includes("Ogawa Coffee") || 
          cafe.name.includes("Broadsheet Coffee") || cafe.name.includes("George Howell Coffee")) {
        await this.addCafeBrewingMethod({ cafeId: cafe.id, brewingMethod: "pour_over" });
      }
      
      if (cafe.name.includes("The Thinking Cup") || cafe.name.includes("Gracenote Coffee") || 
          cafe.name.includes("Ogawa Coffee") || cafe.name.includes("Diesel Cafe") ||
          cafe.name.includes("Pavement Coffeehouse")) {
        await this.addCafeBrewingMethod({ cafeId: cafe.id, brewingMethod: "espresso" });
      }
      
      if (cafe.name.includes("Barrington Coffee") || cafe.name.includes("Diesel Cafe") || 
          cafe.name.includes("Blue Bottle Coffee")) {
        await this.addCafeBrewingMethod({ cafeId: cafe.id, brewingMethod: "aeropress" });
      }
      
      if (cafe.name.includes("Barrington Coffee") || cafe.name.includes("Broadsheet Coffee")) {
        await this.addCafeBrewingMethod({ cafeId: cafe.id, brewingMethod: "french_press" });
      }
      
      if (cafe.name.includes("Gracenote Coffee") || cafe.name.includes("Blue Bottle Coffee")) {
        await this.addCafeBrewingMethod({ cafeId: cafe.id, brewingMethod: "siphon" });
      }
    }
  }
}

import { DatabaseStorage } from "./storage.database";

// Use the PostgreSQL database storage implementation
export const storage = new DatabaseStorage();
