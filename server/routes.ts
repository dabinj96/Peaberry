import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin, requireCafeOwnerOrAdmin } from "./auth";
import { cafeFilterSchema, insertRatingSchema, insertFavoriteSchema, insertCafeSchema, insertCafeRoastLevelSchema, insertCafeBrewingMethodSchema } from "@shared/schema";
import { z } from "zod";
import axios from "axios";
import { log } from "./vite";
import bcrypt from 'bcrypt';
import { randomBytes, scrypt as scryptCallback } from "crypto";
import { promisify } from "util";
import { 
  verifyFirebaseAuthWebhookSignature, 
  checkUserExistsInFirebase, 
  listFirebaseUsers,
  getFirebaseUserByUid,
  getFirebaseUserByEmail,
  getProviderData
} from './firebase-admin';
import { User } from '@shared/schema';

// Convert the callback-based scrypt to a Promise-based one
const scryptAsync = promisify(scryptCallback);

// Utility for password hashing with scrypt
const scrypt = {
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  
  async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return Buffer.compare(hashedBuf, suppliedBuf) === 0;
  }
};

// Google Places API helper function
async function fetchCafesFromGooglePlaces(location: string = "Boston, MA") {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("Google Maps API key is not configured");
    }

    // First search for coffee shops in Boston
    const searchResponse = await axios.get(
      "https://maps.googleapis.com/maps/api/place/textsearch/json",
      {
        params: {
          query: `specialty coffee shops in ${location}`,
          key: apiKey,
          type: "cafe"
        }
      }
    );

    if (searchResponse.data.status !== "OK") {
      throw new Error(`Places API error: ${searchResponse.data.status}`);
    }

    // Process and enrich each place
    const places = searchResponse.data.results;
    const enrichedPlaces = [];

    for (const place of places) {
      try {
        // Get additional details for each place
        const detailsResponse = await axios.get(
          "https://maps.googleapis.com/maps/api/place/details/json",
          {
            params: {
              place_id: place.place_id,
              fields: "name,formatted_address,formatted_phone_number,website,url,geometry,photos,price_level,rating,user_ratings_total,opening_hours,business_status",
              key: apiKey
            }
          }
        );

        if (detailsResponse.data.status === "OK") {
          const details = detailsResponse.data.result;
          
          // Combine search and details results
          enrichedPlaces.push({
            place_id: place.place_id,
            name: details.name || place.name,
            address: details.formatted_address || place.formatted_address,
            lat: details.geometry?.location.lat || place.geometry?.location.lat,
            lng: details.geometry?.location.lng || place.geometry?.location.lng,
            phone: details.formatted_phone_number,
            website: details.website,
            googleMapsUrl: details.url,
            rating: details.rating || place.rating,
            totalRatings: details.user_ratings_total || place.user_ratings_total,
            price_level: details.price_level,
            neighborhood: extractNeighborhood(details.formatted_address || place.formatted_address),
            description: `A specialty coffee shop located in ${extractNeighborhood(details.formatted_address || place.formatted_address)}.`,
            photos: details.photos ? details.photos.map((photo: any) => ({
              photo_reference: photo.photo_reference,
              width: photo.width,
              height: photo.height
            })) : []
          });
        }
      } catch (err) {
        console.error(`Error fetching details for ${place.name}:`, err);
        // Still include the basic place data even if details fail
        enrichedPlaces.push({
          place_id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          lat: place.geometry?.location.lat,
          lng: place.geometry?.location.lng,
          neighborhood: extractNeighborhood(place.formatted_address),
          description: `A specialty coffee shop located in ${extractNeighborhood(place.formatted_address)}.`,
        });
      }
      
      // Small delay to avoid hitting API rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return enrichedPlaces;
  } catch (error) {
    console.error("Error fetching cafes from Google Places:", error);
    throw error;
  }
}

// Helper to extract neighborhood from address
function extractNeighborhood(address: string): string {
  // If no address, return null to use the city name later
  if (!address) return "Unknown";
  
  // First check for cities in the Greater Boston area
  const citiesAndTowns = [
    "Cambridge", "Somerville", "Brookline", "Newton", "Watertown", 
    "Arlington", "Medford", "Malden", "Everett", "Chelsea", 
    "Revere", "Winthrop", "Quincy", "Milton", "Dedham",
    "Needham", "Wellesley", "Weston", "Waltham", "Belmont",
    "Lexington", "Winchester", "Woburn", "Stoneham", "Melrose"
  ];
  
  for (const city of citiesAndTowns) {
    if (address.includes(city)) {
      return city;
    }
  }
  
  // Next check for Boston neighborhoods
  const bostonNeighborhoods = [
    "Back Bay", "Beacon Hill", "North End", "South End", "Downtown",
    "Fenway", "Kenmore", "Allston", "Brighton", "Jamaica Plain",
    "Roxbury", "Dorchester", "South Boston", "Charlestown", "East Boston",
    "West Roxbury", "Roslindale", "Hyde Park", "Mattapan", "Mission Hill"
  ];
  
  for (const neighborhood of bostonNeighborhoods) {
    if (address.includes(neighborhood)) {
      return neighborhood;
    }
  }
  
  // Try to extract neighborhood from address components
  // Format is typically: "123 Main St, Neighborhood, Boston, MA 02XXX, USA"
  const addressParts = address.split(",").map(part => part.trim());
  
  // If we have at least 3 parts (street, city/neighborhood, state/zip) and Boston is mentioned
  if (addressParts.length >= 3 && address.includes("Boston")) {
    // Check if the part before "Boston" might be a neighborhood
    for (let i = 1; i < addressParts.length; i++) {
      if (addressParts[i].includes("Boston") && i > 0) {
        const potentialNeighborhood = addressParts[i-1];
        // If it's not just a street name (typically ends with St, Ave, Rd, etc.)
        if (!potentialNeighborhood.match(/\b(St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Boulevard|Hwy|Highway|Way|Place|Pl)\b/i)) {
          return potentialNeighborhood;
        }
      }
    }
  }
  
  // If it mentions Boston but we couldn't extract a neighborhood
  if (address.includes("Boston")) {
    return "Boston";
  }
  
  // If we reach here, we couldn't find a specific neighborhood
  // Extract the city from the address if possible
  const cityMatch = address.match(/([A-Za-z\s]+),\s*[A-Z]{2}/);
  if (cityMatch && cityMatch[1]) {
    return cityMatch[1].trim();
  }
  
  // Final fallback
  return "Unknown";
}

// Helper to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Setup periodic synchronization with Firebase Auth
function setupPeriodicFirebaseSync(intervalHours = 24) {
  // Skip setup in development mode unless explicitly enabled
  if (process.env.NODE_ENV === 'development' && process.env.ENABLE_FIREBASE_SYNC !== 'true') {
    console.log('Periodic Firebase sync is disabled in development mode');
    return;
  }
  
  // Initial sync after 2 minutes to allow server to fully start up
  setTimeout(() => {
    console.log('Running initial Firebase user synchronization');
    syncFirebaseUsers().catch(err => {
      console.error('Error during initial Firebase user synchronization:', err);
    });
    
    // Then set up periodic sync every 24 hours (or as configured)
    const intervalMs = intervalHours * 60 * 60 * 1000;
    setInterval(() => {
      console.log(`Running scheduled Firebase user synchronization (${intervalHours}h interval)`);
      syncFirebaseUsers().catch(err => {
        console.error('Error during scheduled Firebase user synchronization:', err);
      });
    }, intervalMs);
  }, 2 * 60 * 1000);
  
  console.log(`Scheduled periodic Firebase user synchronization every ${intervalHours} hours`);
}

// Synchronize users between Firebase Auth and our database
async function syncFirebaseUsers(): Promise<{ added: number; updated: number; deleted: number; errors: string[] }> {
  console.log('Starting Firebase user synchronization');
  
  // Track results
  const results = {
    added: 0,
    updated: 0,
    deleted: 0,
    errors: [] as string[]
  };
  
  try {
    // 1. Get all users from Firebase
    const firebaseUsers = await listFirebaseUsers();
    console.log(`Retrieved ${firebaseUsers.length} users from Firebase`);
    
    // 2. Get all users from our database
    const dbUsers = await storage.listUsers();
    console.log(`Retrieved ${dbUsers.length} users from database`);
    
    // 3. Create maps for fast lookups
    const firebaseUserMap = new Map(); // providerId:providerUid -> Firebase user
    const dbUserMap = new Map(); // providerId:providerUid -> DB user
    const dbUserByEmailMap = new Map(); // email -> DB user
    
    // Populate Firebase user map
    firebaseUsers.forEach(fbUser => {
      // Add by provider data
      fbUser.providerData.forEach(provider => {
        const key = `${provider.providerId}:${provider.uid}`;
        firebaseUserMap.set(key, fbUser);
      });
      
      // Also add by Firebase UID for users without provider data
      firebaseUserMap.set(`firebase:${fbUser.uid}`, fbUser);
    });
    
    // Populate DB user maps
    dbUsers.forEach(dbUser => {
      // Add by provider auth if available
      if (dbUser.providerId && dbUser.providerUid) {
        const key = `${dbUser.providerId}:${dbUser.providerUid}`;
        dbUserMap.set(key, dbUser);
      }
      
      // Also add by email for matching users without provider auth
      if (dbUser.email) {
        dbUserByEmailMap.set(dbUser.email.toLowerCase(), dbUser);
      }
    });
    
    // 4. Process each Firebase user to ensure they exist in our DB with correct info
    for (const fbUser of firebaseUsers) {
      try {
        // Check for each provider
        for (const provider of fbUser.providerData) {
          const providerKey = `${provider.providerId}:${provider.uid}`;
          const dbUser = dbUserMap.get(providerKey);
          
          if (dbUser) {
            // User exists with this provider, update info if needed
            const updates: Partial<User> = {};
            let needsUpdate = false;
            
            // Check if name needs updating
            if (fbUser.displayName && dbUser.name !== fbUser.displayName) {
              updates.name = fbUser.displayName;
              needsUpdate = true;
            }
            
            // Check if email needs updating
            if (fbUser.email && dbUser.email !== fbUser.email) {
              updates.email = fbUser.email;
              needsUpdate = true;
            }
            
            // Check if photo URL needs updating
            if (fbUser.photoURL && dbUser.photoUrl !== fbUser.photoURL) {
              updates.photoUrl = fbUser.photoURL;
              needsUpdate = true;
            }
            
            if (needsUpdate) {
              console.log(`Updating user ${dbUser.id} with latest Firebase data`);
              await storage.updateUser(dbUser.id, updates);
              results.updated++;
            }
          } else {
            // Check if user exists by email
            const dbUserByEmail = fbUser.email ? dbUserByEmailMap.get(fbUser.email.toLowerCase()) : null;
            
            if (dbUserByEmail) {
              // User exists by email but doesn't have this provider linked - update provider info
              console.log(`Linking Firebase provider ${provider.providerId} to existing user ${dbUserByEmail.id}`);
              
              await storage.updateUser(dbUserByEmail.id, {
                providerId: provider.providerId,
                providerUid: provider.uid,
                photoUrl: fbUser.photoURL || dbUserByEmail.photoUrl
              });
              
              results.updated++;
            }
            // We don't create new users - they should be created through normal auth flow
          }
        }
      } catch (error) {
        console.error(`Error processing Firebase user ${fbUser.uid}:`, error);
        results.errors.push(`Failed to process Firebase user ${fbUser.uid}: ${error}`);
      }
    }
    
    // 5. Check for users in our DB that have provider info but don't exist in Firebase
    // These are likely deleted Firebase users that weren't properly cleaned up
    for (const [providerKey, dbUser] of dbUserMap.entries()) {
      try {
        if (!firebaseUserMap.has(providerKey) && dbUser.providerId && dbUser.providerUid) {
          // User exists in DB but not in Firebase - they've been deleted from Firebase
          console.log(`Detected deleted Firebase user: ${providerKey}, cleaning up DB user ${dbUser.id}`);
          
          // If using hard delete:
          // const deleted = await storage.deleteUser(dbUser.id);
          
          // If using soft update (removing provider link):
          const updated = await storage.updateUser(dbUser.id, {
            providerId: null,
            providerUid: null
          });
          
          if (updated) {
            console.log(`Removed Firebase provider link from user ${dbUser.id}`);
            results.deleted++;
          }
        }
      } catch (error) {
        console.error(`Error checking deleted user ${providerKey}:`, error);
        results.errors.push(`Failed to check deleted user ${providerKey}: ${error}`);
      }
    }
    
    console.log('Firebase user synchronization completed:', results);
    return results;
  } catch (error) {
    console.error('Error during Firebase user synchronization:', error);
    results.errors.push(`Synchronization error: ${error}`);
    return results;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Setup periodic Firebase sync job (every 24 hours)
  setupPeriodicFirebaseSync();

  // Cafe routes
  app.get("/api/cafes", async (req, res) => {
    try {
      const userId = req.user?.id;
      
      // Handle search query
      if (req.query.q) {
        const query = req.query.q as string;
        const cafes = await storage.searchCafes(query, userId);
        return res.json(cafes);
      }
      
      // Handle filters
      const filterParams: Record<string, any> = {};
      
      if (req.query.neighborhood) {
        filterParams.neighborhood = req.query.neighborhood as string;
      }
      
      if (req.query.roastLevels) {
        filterParams.roastLevels = (req.query.roastLevels as string).split(',');
      }
      
      if (req.query.brewingMethods) {
        filterParams.brewingMethods = (req.query.brewingMethods as string).split(',');
      }
      
      if (req.query.minRating) {
        filterParams.minRating = parseInt(req.query.minRating as string, 10);
      }
      
      if (req.query.priceLevel) {
        filterParams.priceLevel = parseInt(req.query.priceLevel as string, 10);
      }
      
      if (req.query.hasWifi) {
        filterParams.hasWifi = req.query.hasWifi === 'true';
      }
      
      if (req.query.hasPower) {
        filterParams.hasPower = req.query.hasPower === 'true';
      }
      
      if (req.query.hasFood) {
        filterParams.hasFood = req.query.hasFood === 'true';
      }

      // Parse and validate filters
      const filterResult = cafeFilterSchema.safeParse(filterParams);
      
      if (!filterResult.success) {
        return res.status(400).json({ error: "Invalid filter parameters" });
      }
      
      // Add status filter to only show published cafes
      let filters = Object.keys(filterParams).length > 0 ? filterResult.data : {};
      
      // Always enforce published status for public cafe listing
      filters = {
        ...filters,
        status: "published"
      };
      
      console.log("Public API filtering cafes with status:", filters.status);
      
      const cafes = await storage.listCafes(filters, userId);
      
      res.json(cafes);
    } catch (error) {
      console.error("Error fetching cafes:", error);
      res.status(500).json({ error: "An error occurred while fetching cafes" });
    }
  });

  app.get("/api/cafes/:id", async (req, res) => {
    try {
      const cafeId = parseInt(req.params.id, 10);
      if (isNaN(cafeId)) {
        return res.status(400).json({ error: "Invalid cafe ID" });
      }
      
      const userId = req.user?.id;
      const cafe = await storage.getCafeWithDetails(cafeId, userId);
      
      if (!cafe) {
        return res.status(404).json({ error: "Cafe not found" });
      }
      
      res.json(cafe);
    } catch (error) {
      res.status(500).json({ error: "An error occurred while fetching cafe details" });
    }
  });

  // Neighborhood routes
  app.get("/api/neighborhoods", async (req, res) => {
    try {
      const neighborhoods = await storage.listNeighborhoods();
      res.json(neighborhoods);
    } catch (error) {
      console.error("Error fetching neighborhoods:", error);
      res.status(500).json({ error: "An error occurred while fetching neighborhoods" });
    }
  });

  // Rating routes
  app.post("/api/cafes/:id/ratings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const cafeId = parseInt(req.params.id, 10);
      if (isNaN(cafeId)) {
        return res.status(400).json({ error: "Invalid cafe ID" });
      }

      const cafe = await storage.getCafe(cafeId);
      if (!cafe) {
        return res.status(404).json({ error: "Cafe not found" });
      }

      const ratingData = {
        ...req.body,
        userId: req.user.id,
        cafeId
      };

      const validationResult = insertRatingSchema.safeParse(ratingData);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid rating data", details: validationResult.error });
      }

      const rating = await storage.createRating(validationResult.data);
      res.status(201).json(rating);
    } catch (error) {
      res.status(500).json({ error: "An error occurred while creating the rating" });
    }
  });

  app.get("/api/cafes/:id/ratings", async (req, res) => {
    try {
      const cafeId = parseInt(req.params.id, 10);
      if (isNaN(cafeId)) {
        return res.status(400).json({ error: "Invalid cafe ID" });
      }

      const ratings = await storage.getCafeRatings(cafeId);
      res.json(ratings);
    } catch (error) {
      res.status(500).json({ error: "An error occurred while fetching ratings" });
    }
  });

  app.get("/api/user/ratings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const cafeId = req.query.cafeId ? parseInt(req.query.cafeId as string, 10) : undefined;
      
      if (cafeId) {
        const rating = await storage.getUserRatingForCafe(req.user.id, cafeId);
        return res.json(rating || null);
      }
      
      res.status(400).json({ error: "cafeId parameter required" });
    } catch (error) {
      res.status(500).json({ error: "An error occurred while fetching user ratings" });
    }
  });

  // Favorite routes
  app.post("/api/favorites", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const favoriteData = {
        ...req.body,
        userId: req.user.id
      };

      const validationResult = insertFavoriteSchema.safeParse(favoriteData);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid favorite data", details: validationResult.error });
      }

      const favorite = await storage.createFavorite(validationResult.data);
      res.status(201).json(favorite);
    } catch (error) {
      res.status(500).json({ error: "An error occurred while creating the favorite" });
    }
  });

  app.delete("/api/favorites/:cafeId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const cafeId = parseInt(req.params.cafeId, 10);
      if (isNaN(cafeId)) {
        return res.status(400).json({ error: "Invalid cafe ID" });
      }

      const success = await storage.deleteFavorite(req.user.id, cafeId);
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Favorite not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "An error occurred while removing the favorite" });
    }
  });

  app.get("/api/favorites", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const favorites = await storage.getUserFavorites(req.user.id);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ error: "An error occurred while fetching favorites" });
    }
  });

  // Admin endpoint to import cafes from Google Places API
  app.post("/api/admin/import-cafes", requireAdmin, async (req, res) => {
    try {
      // Only admin users can access this endpoint
      
      const location = req.body.location || "Boston, MA";
      log(`Importing cafes from Google Places for location: ${location}`, "routes");
      
      // Fetch places from Google Places API
      const places = await fetchCafesFromGooglePlaces(location);
      log(`Found ${places.length} cafes from Google Places`, "routes");
      
      // Track results
      const results = {
        total: places.length,
        imported: 0,
        errors: [] as string[]
      };

      // Import each place into our database
      for (const place of places) {
        try {
          // Map Google Place data to our cafe schema
          const cafeData = {
            name: place.name,
            description: place.description || `A specialty coffee shop in ${place.neighborhood || 'Boston'}.`,
            address: place.address,
            neighborhood: place.neighborhood || "Boston",
            website: place.website || "",
            phone: place.phone || "",
            latitude: place.lat.toString(),
            longitude: place.lng.toString(),
            imageUrl: "",  // We'll handle images separately
            instagramHandle: "",
            googleMapsUrl: place.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}`,
            status: "draft"  // Set imported cafés to draft by default so they require admin review
          };
          
          // Validate against our schema
          const validatedData = insertCafeSchema.parse(cafeData);
          
          // Add to database
          const cafe = await storage.createCafe(validatedData);
          
          // Add random roast levels and brewing methods to make data more interesting
          const roastLevels: Array<"light" | "medium" | "dark"> = ["light", "medium", "dark"];
          const brewingMethods: Array<"pour_over" | "espresso" | "aeropress" | "french_press" | "siphon"> = ["pour_over", "espresso", "aeropress", "french_press", "siphon"];
          
          // Add 1-3 random roast levels
          const numRoastLevels = Math.floor(Math.random() * 3) + 1;
          const selectedRoastLevels = shuffleArray([...roastLevels]).slice(0, numRoastLevels);
          
          for (const level of selectedRoastLevels) {
            await storage.addCafeRoastLevel({
              cafeId: cafe.id,
              roastLevel: level
            });
          }
          
          // Add 1-4 random brewing methods
          const numBrewingMethods = Math.floor(Math.random() * 4) + 1;
          const selectedBrewingMethods = shuffleArray([...brewingMethods]).slice(0, numBrewingMethods);
          
          for (const method of selectedBrewingMethods) {
            await storage.addCafeBrewingMethod({
              cafeId: cafe.id,
              brewingMethod: method
            });
          }
          
          results.imported++;
        } catch (error) {
          console.error(`Error importing cafe ${place.name}:`, error);
          results.errors.push(`Failed to import ${place.name}: ${error}`);
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error in import process:", error);
      res.status(500).json({ error: "Failed to import cafes from Google Places" });
    }
  });
  
  // Admin routes for managing cafes
  // Add endpoint for creating a single cafe manually
  app.post("/api/admin/cafes", requireAdmin, async (req, res) => {
    try {
      // Validate cafe data
      const validatedData = insertCafeSchema.parse(req.body);
      
      // Check if a cafe with this name and address already exists
      const existingCafes = await storage.listCafes({
        name: validatedData.name,
        address: validatedData.address
      });
      
      if (existingCafes.length > 0) {
        return res.status(400).json({ error: `Cafe "${validatedData.name}" already exists at this address.` });
      }
      
      // Create the cafe
      const cafe = await storage.createCafe(validatedData);
      
      // If roastLevels or brewingMethods are provided, add them
      if (req.body.roastLevels && Array.isArray(req.body.roastLevels)) {
        for (const level of req.body.roastLevels) {
          await storage.addCafeRoastLevel({
            cafeId: cafe.id,
            roastLevel: level
          });
        }
      }
      
      if (req.body.brewingMethods && Array.isArray(req.body.brewingMethods)) {
        for (const method of req.body.brewingMethods) {
          await storage.addCafeBrewingMethod({
            cafeId: cafe.id,
            brewingMethod: method
          });
        }
      }
      
      const cafeWithDetails = await storage.getCafeWithDetails(cafe.id);
      
      return res.status(201).json(cafeWithDetails);
    } catch (error) {
      console.error("Error creating cafe:", error);
      return res.status(500).json({ error: "Failed to create cafe" });
    }
  });

  app.get("/api/admin/cafes", requireAdmin, async (req, res) => {
    try {
      // Get all cafes with details for admin view, including all statuses
      // Pass an empty object with status explicitly set to undefined to bypass the default filtering
      const cafes = await storage.listCafes({ status: undefined });
      res.json(cafes);
    } catch (error) {
      console.error("Error fetching admin cafes:", error);
      res.status(500).json({ error: "Failed to fetch cafes" });
    }
  });
  
  app.get("/api/admin/cafes/:id", requireAdmin, async (req, res) => {
    try {
      const cafeId = parseInt(req.params.id, 10);
      if (isNaN(cafeId)) {
        return res.status(400).json({ error: "Invalid cafe ID" });
      }
      
      const cafe = await storage.getCafeWithDetails(cafeId);
      if (!cafe) {
        return res.status(404).json({ error: "Cafe not found" });
      }
      
      res.json(cafe);
    } catch (error) {
      console.error("Error fetching admin cafe:", error);
      res.status(500).json({ error: "Failed to fetch cafe details" });
    }
  });
  
  app.put("/api/admin/cafes/:id", requireAdmin, async (req, res) => {
    try {
      const cafeId = parseInt(req.params.id, 10);
      if (isNaN(cafeId)) {
        return res.status(400).json({ error: "Invalid cafe ID" });
      }
      
      // First check if cafe exists
      const cafe = await storage.getCafe(cafeId);
      if (!cafe) {
        return res.status(404).json({ error: "Cafe not found" });
      }
      
      // Update cafe basic information
      const updateData = {
        ...req.body,
        id: cafeId // Ensure ID is included
      };
      
      // Update cafe in the database
      const updatedCafe = await storage.updateCafe(cafeId, updateData);
      res.json(updatedCafe);
    } catch (error) {
      console.error("Error updating cafe:", error);
      res.status(500).json({ error: "Failed to update cafe" });
    }
  });
  
  // Add PATCH endpoint to match the client's request method
  app.patch("/api/admin/cafes/:id", requireAdmin, async (req, res) => {
    try {
      const cafeId = parseInt(req.params.id, 10);
      if (isNaN(cafeId)) {
        return res.status(400).json({ error: "Invalid cafe ID" });
      }
      
      // First check if cafe exists
      const cafe = await storage.getCafe(cafeId);
      if (!cafe) {
        return res.status(404).json({ error: "Cafe not found" });
      }
      
      // Update cafe with the provided fields
      const updateData = {
        ...req.body,
        id: cafeId // Ensure ID is included
      };
      
      console.log("Updating cafe status:", cafeId, updateData);
      
      // Update cafe in the database
      const updatedCafe = await storage.updateCafe(cafeId, updateData);
      res.json(updatedCafe);
    } catch (error) {
      console.error("Error updating cafe:", error);
      res.status(500).json({ error: "Failed to update cafe" });
    }
  });
  
  app.put("/api/admin/cafes/:id/roast-levels", requireAdmin, async (req, res) => {
    try {
      const cafeId = parseInt(req.params.id, 10);
      if (isNaN(cafeId)) {
        return res.status(400).json({ error: "Invalid cafe ID" });
      }
      
      // First check if cafe exists
      const cafe = await storage.getCafe(cafeId);
      if (!cafe) {
        return res.status(404).json({ error: "Cafe not found" });
      }
      
      const { roastLevels } = req.body;
      if (!Array.isArray(roastLevels)) {
        return res.status(400).json({ error: "roastLevels must be an array" });
      }
      
      // Clear existing roast levels and add new ones
      await storage.updateCafeRoastLevels(cafeId, roastLevels);
      
      // Return the updated roast levels
      const updatedRoastLevels = await storage.getCafeRoastLevels(cafeId);
      res.json(updatedRoastLevels);
    } catch (error) {
      console.error("Error updating cafe roast levels:", error);
      res.status(500).json({ error: "Failed to update cafe roast levels" });
    }
  });
  
  app.put("/api/admin/cafes/:id/brewing-methods", requireAdmin, async (req, res) => {
    try {
      const cafeId = parseInt(req.params.id, 10);
      if (isNaN(cafeId)) {
        return res.status(400).json({ error: "Invalid cafe ID" });
      }
      
      // First check if cafe exists
      const cafe = await storage.getCafe(cafeId);
      if (!cafe) {
        return res.status(404).json({ error: "Cafe not found" });
      }
      
      const { brewingMethods } = req.body;
      if (!Array.isArray(brewingMethods)) {
        return res.status(400).json({ error: "brewingMethods must be an array" });
      }
      
      // Clear existing brewing methods and add new ones
      await storage.updateCafeBrewingMethods(cafeId, brewingMethods);
      
      // Return the updated brewing methods
      const updatedBrewingMethods = await storage.getCafeBrewingMethods(cafeId);
      res.json(updatedBrewingMethods);
    } catch (error) {
      console.error("Error updating cafe brewing methods:", error);
      res.status(500).json({ error: "Failed to update cafe brewing methods" });
    }
  });
  
  app.put("/api/admin/cafes/:id/status", requireAdmin, async (req, res) => {
    try {
      const cafeId = parseInt(req.params.id, 10);
      if (isNaN(cafeId)) {
        return res.status(400).json({ error: "Invalid cafe ID" });
      }
      
      // First check if cafe exists
      const cafe = await storage.getCafe(cafeId);
      if (!cafe) {
        return res.status(404).json({ error: "Cafe not found" });
      }
      
      const { status } = req.body;
      if (!status || !["draft", "published", "archived"].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      
      // Update cafe status
      const updatedCafe = await storage.updateCafe(cafeId, { status });
      res.json(updatedCafe);
    } catch (error) {
      console.error("Error updating cafe status:", error);
      res.status(500).json({ error: "Failed to update cafe status" });
    }
  });
  
  // Endpoint to permanently delete a cafe
  app.delete("/api/admin/cafes/:id", requireAdmin, async (req, res) => {
    try {
      const cafeId = parseInt(req.params.id, 10);
      if (isNaN(cafeId)) {
        return res.status(400).json({ error: "Invalid cafe ID" });
      }
      
      // First check if cafe exists
      const cafe = await storage.getCafe(cafeId);
      if (!cafe) {
        return res.status(404).json({ error: "Cafe not found" });
      }
      
      // Permanently delete the cafe and all related data
      const success = await storage.deleteCafe(cafeId);
      
      if (success) {
        res.status(204).send(); // No content
      } else {
        res.status(500).json({ error: "Failed to delete cafe" });
      }
    } catch (error) {
      console.error("Error deleting cafe:", error);
      res.status(500).json({ error: "Failed to delete cafe" });
    }
  });

  // Endpoint to publish all cafes - for admin use to fix existing data
  app.post("/api/admin/publish-all-cafes", requireAdmin, async (req, res) => {
    try {
      // Get all cafes regardless of status
      const cafes = await storage.listCafes({ status: undefined });
      
      // Track results
      const results = {
        total: cafes.length,
        updated: 0,
        errors: [] as string[]
      };
      
      // Update each cafe that's not already published
      for (const cafe of cafes) {
        if (cafe.status !== 'published') {
          try {
            const updatedCafe = await storage.updateCafe(cafe.id, { status: 'published' });
            if (updatedCafe) {
              results.updated++;
            }
          } catch (error) {
            console.error(`Error updating cafe ${cafe.name}:`, error);
            results.errors.push(`Failed to update ${cafe.name}: ${error}`);
          }
        }
      }
      
      res.json({
        message: `Successfully updated ${results.updated} of ${results.total} cafes to published status`,
        results
      });
    } catch (error) {
      console.error("Error in publish all cafes:", error);
      res.status(500).json({ error: "Failed to publish all cafes" });
    }
  });

  // Create a test user with Firebase credentials for testing
  app.post("/api/admin/test-user", async (req, res) => {
    try {
      const userData = req.body;
      
      // Validate required fields
      if (!userData.username || !userData.email || !userData.password || 
          !userData.providerId || !userData.providerUid) {
        return res.status(400).json({ 
          error: "Missing required fields. Required: username, email, password, providerId, providerUid" 
        });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Check if user with this provider auth already exists
      const existingProviderUser = await storage.getUserByProviderAuth(
        userData.providerId, 
        userData.providerUid
      );
      
      if (existingProviderUser) {
        return res.status(400).json({ 
          error: "User with this provider authentication already exists",
          userId: existingProviderUser.id
        });
      }
      
      // Hash the password
      const hashedPassword = await scrypt.hashPassword(userData.password);
      
      // Create the user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        bio: userData.bio || '',
        role: userData.role || 'user'
      });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({ 
        message: "Test user with Firebase credentials created successfully", 
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Error creating test Firebase user:", error);
      res.status(500).json({ error: "Failed to create test user" });
    }
  });
  
  // Create a simple test user for development if none exists
  app.get("/api/dev/create-test-user", async (req, res) => {
    // Only available in development environment
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: "Endpoint not available in production" });
    }
    
    try {
      // Check if the test user already exists
      const existingUser = await storage.getUserByUsername("testuser");
      
      if (existingUser) {
        return res.json({ message: "Test user already exists", userId: existingUser.id });
      }
      
      // Use the imported bcrypt package
      const hashedPassword = await bcrypt.hash('password', 10);
      
      // Create a test user with properly hashed password
      const user = await storage.createUser({
        username: "testuser",
        password: hashedPassword, // hashed 'password'
        email: "test@example.com",
        name: "Test User",
        bio: "This is a test user for development purposes."
      });
      
      res.json({ message: "Test user created successfully", userId: user.id });
    } catch (error) {
      console.error("Error creating test user:", error);
      res.status(500).json({ error: "Failed to create test user" });
    }
  });

  // Test endpoint to simulate a Firebase Auth webhook call for user deletion
  // This is for testing purposes only and should be removed in production
  app.post('/api/admin/test-firebase-webhook', requireAdmin, async (req, res) => {
    try {
      const { uid } = req.body;
      
      if (!uid) {
        return res.status(400).json({ error: 'Missing uid parameter' });
      }
      
      // Call the webhook endpoint directly with a simulated payload
      const webhookPayload = {
        event: 'user.deleted',
        data: {
          uid: uid,
          providerId: 'google'
        }
      };
      
      console.log(`Simulating Firebase Auth webhook for user deletion: ${uid}`);
      
      // Find if the user exists first
      const user = await storage.getUserByProviderAuth('google', uid);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found', uid });
      }
      
      // Delete the user
      const success = await storage.deleteUserByProviderAuth('google', uid);
      
      if (success) {
        return res.status(200).json({ 
          message: 'User successfully deleted', 
          uid,
          userId: user.id 
        });
      } else {
        return res.status(500).json({ error: 'Failed to delete user', uid });
      }
    } catch (error) {
      console.error('Error in test webhook:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  })
  
  // List all users - admin only
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      // Fetch all users
      const users = await storage.listUsers();
      
      // Remove sensitive information
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      // Get Firebase users for verification
      let firebaseUsers: any[] = [];
      try {
        firebaseUsers = await listFirebaseUsers();
      } catch (error) {
        console.warn('Could not fetch Firebase users:', error);
      }
      
      // Create a map of provider UIDs for quick lookup
      const providerMap = new Map();
      firebaseUsers.forEach(firebaseUser => {
        firebaseUser.providerData.forEach((provider: any) => {
          if (provider.providerId === 'google.com') {
            providerMap.set(`${provider.providerId}:${provider.uid}`, firebaseUser.uid);
          }
        });
      });
      
      // Check Firebase status and add to each user
      const usersWithStatus = await Promise.all(
        safeUsers.map(async (user) => {
          let firebaseStatus = 'unknown';
          
          if (user.providerId && user.providerUid) {
            const providerKey = `${user.providerId}:${user.providerUid}`;
            const firebaseUid = providerMap.get(providerKey);
            
            if (firebaseUid) {
              firebaseStatus = 'active';
            } else {
              firebaseStatus = 'deleted';
            }
          } else if (user.username) {
            // For password auth users, there's no Firebase entry
            firebaseStatus = 'local-only';
          }
          
          return {
            ...user,
            firebaseStatus
          };
        })
      );
      
      res.json(usersWithStatus);
    } catch (error) {
      console.error('Error listing users:', error);
      res.status(500).json({ error: 'Failed to list users' });
    }
  });
  
  // Manual Firebase sync endpoint for admins
  app.post('/api/admin/sync-firebase-users', requireAdmin, async (req, res) => {
    try {
      console.log('Manual Firebase user synchronization triggered by admin');
      
      // Run the sync function
      const results = await syncFirebaseUsers();
      
      res.json({
        success: true,
        message: 'Firebase user synchronization completed',
        results
      });
    } catch (error) {
      console.error('Error during manual Firebase sync:', error);
      res.status(500).json({
        success: false,
        message: 'Firebase user synchronization failed',
        error: error.message
      });
    }
  });
  
  // Delete a user directly by ID - for admin cleanup purposes
  app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id, 10);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      
      // Find if the user exists first
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found', userId });
      }
      
      // Don't allow deleting the current user
      if (req.user && req.user.id === userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
      
      // Delete the user
      const success = await storage.deleteUser(userId);
      
      if (success) {
        return res.status(200).json({ 
          message: 'User successfully deleted', 
          userId
        });
      } else {
        return res.status(500).json({ error: 'Failed to delete user', userId });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Clean up orphaned Firebase users (users in database but deleted from Firebase)
  app.post('/api/admin/cleanup-orphaned-users', requireAdmin, async (req, res) => {
    try {
      // Get all users first
      const users = await storage.listUsers();
      
      // Filter to only keep OAuth users
      const oauthUsers = users.filter(user => user.providerId && user.providerUid);
      
      // Get Firebase users to check against
      let firebaseUsers: any[] = [];
      try {
        firebaseUsers = await listFirebaseUsers();
      } catch (error) {
        console.error('Could not fetch Firebase users:', error);
        return res.status(500).json({ error: 'Failed to fetch Firebase users' });
      }
      
      // Create a map of provider UIDs for quick lookup
      const providerMap = new Map();
      firebaseUsers.forEach(firebaseUser => {
        firebaseUser.providerData.forEach((provider: any) => {
          if (provider.providerId === 'google.com') {
            providerMap.set(`${provider.providerId}:${provider.uid}`, firebaseUser.uid);
          }
        });
      });
      
      // Find orphaned users (in our DB but not in Firebase)
      const orphanedUsers = oauthUsers.filter(user => {
        const providerKey = `${user.providerId}:${user.providerUid}`;
        return !providerMap.has(providerKey);
      });
      
      if (orphanedUsers.length === 0) {
        return res.status(200).json({ 
          message: 'No orphaned users found',
          count: 0,
          users: []
        });
      }
      
      // If just checking, return the list of orphaned users
      if (req.query.check === 'true') {
        // Remove sensitive information
        const safeUsers = orphanedUsers.map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });
        
        return res.status(200).json({ 
          message: `Found ${orphanedUsers.length} orphaned users`,
          count: orphanedUsers.length,
          users: safeUsers
        });
      }
      
      // Otherwise, clean them up
      const results = {
        total: orphanedUsers.length,
        deleted: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      for (const user of orphanedUsers) {
        try {
          const success = await storage.deleteUser(user.id);
          if (success) {
            results.deleted++;
          } else {
            results.failed++;
            results.errors.push(`Failed to delete user ID ${user.id}`);
          }
        } catch (e) {
          results.failed++;
          results.errors.push(`Error deleting user ID ${user.id}: ${e}`);
        }
      }
      
      return res.status(200).json({
        message: `Cleaned up ${results.deleted} orphaned users`,
        results
      });
    } catch (error) {
      console.error('Error cleaning up orphaned users:', error);
      return res.status(500).json({ error: 'Failed to clean up orphaned users' });
    }
  });
  
  // Firebase Auth webhook endpoint for handling user events
  app.post('/api/webhooks/firebase-auth', async (req, res) => {
    try {
      console.log('Received Firebase Auth webhook event');
      
      // Verify the request is from Firebase
      const signature = req.headers['x-firebase-auth-signature'] as string;
      const rawBody = JSON.stringify(req.body);
      
      if (!signature) {
        console.warn('Missing X-Firebase-Auth-Signature header');
        return res.status(401).json({ error: 'Missing authentication signature' });
      }
      
      // Verify the signature in production
      if (process.env.NODE_ENV === 'production') {
        const isValid = verifyFirebaseAuthWebhookSignature(signature, rawBody);
        if (!isValid) {
          console.warn('Invalid webhook signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }
      
      // Extract event data
      const { event, data } = req.body;
      console.log(`Processing Firebase Auth event: ${event}`);
      
      // Handle different event types
      switch (event) {
        case 'user.deleted': {
          // User was deleted from Firebase Auth
          const { uid, providerId } = data;
          console.log(`Processing user deletion event for uid: ${uid}, providerId: ${providerId || 'google.com'}`);
          
          // Delete the user from our database
          const success = await storage.deleteUserByProviderAuth(providerId || 'google.com', uid);
          
          if (success) {
            console.log(`Successfully deleted user with uid: ${uid} from database`);
          } else {
            console.warn(`User with uid: ${uid} not found in database`);
          }
          break;
        }
        
        case 'user.created': {
          // User was created in Firebase Auth
          // This is typically handled by our registration flow, but this ensures consistency
          const { uid, email, displayName } = data;
          
          // Check if the user already exists in our database
          const existingUser = await storage.getUserByEmail(email);
          
          if (existingUser) {
            console.log(`User with email ${email} already exists in database, updating Firebase info`);
            
            // Update the user with Firebase information if needed
            if (!existingUser.providerId || !existingUser.providerUid) {
              await storage.updateUser(existingUser.id, {
                providerId: 'google.com',
                providerUid: uid,
                name: displayName || existingUser.name
              });
              console.log(`Updated user ${existingUser.id} with Firebase info`);
            }
          } else {
            console.log(`User with email ${email} does not exist in database, skipping creation`);
            // We don't create users here - they should be created through our regular auth flow
            // This prevents unauthorized users from being created in our database
          }
          break;
        }
        
        case 'user.updated': {
          // User was updated in Firebase Auth
          const { uid, email, displayName, photoURL } = data;
          console.log(`Processing user update event for uid: ${uid}, email: ${email}`);
          
          // Get the Firebase user to get full details
          const firebaseUser = await getFirebaseUserByUid(uid);
          
          if (!firebaseUser) {
            console.warn(`Could not find Firebase user with uid ${uid}`);
            break;
          }
          
          // For each provider, check if we have a user and update accordingly
          for (const provider of firebaseUser.providerData) {
            if (provider.providerId === 'google.com') {
              const existingUser = await storage.getUserByProviderAuth('google.com', provider.uid);
              
              if (existingUser) {
                console.log(`Updating user ${existingUser.id} with new Firebase data`);
                
                // Update user with latest Firebase data
                await storage.updateUser(existingUser.id, {
                  name: displayName || existingUser.name,
                  email: email || existingUser.email,
                  photoUrl: photoURL || existingUser.photoUrl
                });
              }
            }
          }
          
          // Also check by email in case the provider data doesn't match
          const userByEmail = await storage.getUserByEmail(email);
          
          if (userByEmail && (!userByEmail.providerId || !userByEmail.providerUid)) {
            console.log(`Updating user ${userByEmail.id} with Firebase auth provider details`);
            
            // Get the Google provider data
            const googleProvider = getProviderData(firebaseUser, 'google.com');
            
            if (googleProvider) {
              await storage.updateUser(userByEmail.id, {
                providerId: 'google.com',
                providerUid: googleProvider.uid,
                name: displayName || userByEmail.name,
                photoUrl: photoURL || userByEmail.photoUrl
              });
            }
          }
          break;
        }
        
        default:
          console.log(`Ignoring unsupported Firebase Auth event: ${event}`);
      }
      
      // Always return success to acknowledge receipt
      return res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('Error processing Firebase Auth webhook:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
