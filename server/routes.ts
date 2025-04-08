import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { cafeFilterSchema, insertRatingSchema, insertFavoriteSchema } from "@shared/schema";
import { z } from "zod";

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

  const httpServer = createServer(app);
  return httpServer;
}
