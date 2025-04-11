import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { cafeFilterSchema, insertRatingSchema, insertFavoriteSchema, insertCafeSchema, insertCafeRoastLevelSchema, insertCafeBrewingMethodSchema } from "@shared/schema";
import { z } from "zod";
import axios from "axios";
import { log } from "./vite";
import bcrypt from 'bcrypt';

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

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
      
      const cafes = await storage.listCafes(
        Object.keys(filterParams).length > 0 ? filterResult.data : undefined,
        userId
      );
      
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
  app.post("/api/admin/import-cafes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Check for admin access (for now, whitelist specific usernames)
    const adminUsernames = ['admin', 'testuser']; // Add your admin usernames here
    if (!adminUsernames.includes(req.user.username)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
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
            googleMapsUrl: place.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}`
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
  app.post("/api/admin/cafes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Check for admin access
    const adminUsernames = ['admin', 'testuser']; // Admin usernames
    if (!adminUsernames.includes(req.user.username)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
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

  app.get("/api/admin/cafes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Check for admin access
    const adminUsernames = ['admin', 'testuser']; // Admin usernames
    if (!adminUsernames.includes(req.user.username)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    try {
      // Get all cafes with details for admin view
      const cafes = await storage.listCafes();
      res.json(cafes);
    } catch (error) {
      console.error("Error fetching admin cafes:", error);
      res.status(500).json({ error: "Failed to fetch cafes" });
    }
  });
  
  app.get("/api/admin/cafes/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Check for admin access
    const adminUsernames = ['admin', 'testuser']; // Admin usernames
    if (!adminUsernames.includes(req.user.username)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
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
  
  app.put("/api/admin/cafes/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Check for admin access
    const adminUsernames = ['admin', 'testuser']; // Admin usernames
    if (!adminUsernames.includes(req.user.username)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
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
  
  app.put("/api/admin/cafes/:id/roast-levels", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Check for admin access
    const adminUsernames = ['admin', 'testuser']; // Admin usernames
    if (!adminUsernames.includes(req.user.username)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
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
  
  app.put("/api/admin/cafes/:id/brewing-methods", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Check for admin access
    const adminUsernames = ['admin', 'testuser']; // Admin usernames
    if (!adminUsernames.includes(req.user.username)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
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
  
  app.put("/api/admin/cafes/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Check for admin access
    const adminUsernames = ['admin', 'testuser']; // Admin usernames
    if (!adminUsernames.includes(req.user.username)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
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
  app.delete("/api/admin/cafes/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Check for admin access
    const adminUsernames = ['admin', 'testuser']; // Admin usernames
    if (!adminUsernames.includes(req.user.username)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
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

  // Create a test user for development if none exists
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

  const httpServer = createServer(app);
  return httpServer;
}
