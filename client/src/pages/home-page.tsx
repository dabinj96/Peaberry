import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { CafeWithDetails, CafeFilter } from "@shared/schema";
import SearchFilters from "@/components/search-filters";
import CafeList from "@/components/cafe-list";
import CafeMap from "@/components/cafe-map";
import FeaturedCafes from "@/components/featured-cafes";
import { SortOption } from "@/components/sort-options";

export default function HomePage() {
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [filters, setFilters] = useState<CafeFilter>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortedCafes, setSortedCafes] = useState<CafeWithDetails[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cafeDistances, setCafeDistances] = useState<Map<number, number>>(new Map());
  
  // Define the roast levels and brewing methods for type safety
  const roastLevels = ['light', 'medium', 'dark'] as const;
  type RoastLevel = typeof roastLevels[number];
  
  const brewingMethods = [
    {value: 'pour_over' as const, label: 'Pour Over'},
    {value: 'espresso' as const, label: 'Espresso'},
    {value: 'aeropress' as const, label: 'Aeropress'},
    {value: 'french_press' as const, label: 'French Press'},
    {value: 'siphon' as const, label: 'Siphon'}
  ];
  type BrewingMethod = typeof brewingMethods[number]['value'];
  
  // Fetch neighborhoods for filter dropdown
  const { data: neighborhoods = [] } = useQuery<string[]>({
    queryKey: ["/api/neighborhoods"],
    queryFn: async () => {
      const res = await fetch("/api/neighborhoods");
      if (!res.ok) {
        throw new Error("Failed to fetch neighborhoods");
      }
      return res.json();
    }
  });

  // Fetch user's location for distance-based sorting and for showing distances
  useEffect(() => {
    // Always try to get user location for distance calculation
    if (!userLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, [userLocation]);
  
  // Fetch cafes with filters applied
  const { data: cafes = [], isLoading } = useQuery<CafeWithDetails[]>({
    queryKey: ["/api/cafes", filters, searchQuery],
    queryFn: async () => {
      let url = "/api/cafes";
      
      // Build query parameters
      const params = new URLSearchParams();
      
      if (searchQuery) {
        params.append("q", searchQuery);
      }
      
      if (filters.neighborhood) {
        params.append("neighborhood", filters.neighborhood);
      }
      
      if (filters.roastLevels && filters.roastLevels.length > 0) {
        params.append("roastLevels", filters.roastLevels.join(","));
      }
      
      if (filters.brewingMethods && filters.brewingMethods.length > 0) {
        params.append("brewingMethods", filters.brewingMethods.join(","));
      }
      
      if (filters.minRating !== undefined) {
        params.append("minRating", filters.minRating.toString());
      }
      
      if (filters.priceLevel !== undefined) {
        params.append("priceLevel", filters.priceLevel.toString());
      }
      
      if (filters.hasWifi !== undefined) {
        params.append("hasWifi", filters.hasWifi.toString());
      }
      
      if (filters.hasPower !== undefined) {
        params.append("hasPower", filters.hasPower.toString());
      }
      
      if (filters.hasFood !== undefined) {
        params.append("hasFood", filters.hasFood.toString());
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch cafes");
      }
      return response.json();
    }
  });

  // Function to calculate distance between two points (haversine formula)
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  }, []);

  // Calculate distances for all cafes when user location or cafe list changes
  useEffect(() => {
    if (userLocation && cafes && cafes.length > 0) {
      const newDistances = new Map<number, number>();
      
      cafes.forEach(cafe => {
        const lat = parseFloat(cafe.latitude || "0");
        const lng = parseFloat(cafe.longitude || "0");
        
        if (!isNaN(lat) && !isNaN(lng)) {
          const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
          newDistances.set(cafe.id, distance);
        }
      });
      
      setCafeDistances(newDistances);
    }
  }, [userLocation, cafes]);

  // Sort cafes based on the selected sort option
  useEffect(() => {
    if (!cafes || cafes.length === 0) return;

    let sorted = [...cafes];
    const sortOption = filters.sortBy || "default";

    switch (sortOption) {
      case "distance":
        if (userLocation) {
          sorted = sorted.sort((a, b) => {
            const aLat = parseFloat(a.latitude || "0");
            const aLng = parseFloat(a.longitude || "0");
            const bLat = parseFloat(b.latitude || "0");
            const bLng = parseFloat(b.longitude || "0");
            
            if (isNaN(aLat) || isNaN(aLng) || isNaN(bLat) || isNaN(bLng)) return 0;
            
            const distanceA = calculateDistance(userLocation.lat, userLocation.lng, aLat, aLng);
            const distanceB = calculateDistance(userLocation.lat, userLocation.lng, bLat, bLng);
            
            return distanceA - distanceB;
          });
        }
        break;
      
      case "rating_high":
        sorted = sorted.sort((a, b) => {
          const ratingA = a.averageRating || 0;
          const ratingB = b.averageRating || 0;
          return ratingB - ratingA;
        });
        break;
      
      case "reviews_count":
        sorted = sorted.sort((a, b) => {
          const reviewsA = a.totalRatings || 0;
          const reviewsB = b.totalRatings || 0;
          return reviewsB - reviewsA;
        });
        break;
      
      case "default":
      default:
        // Default sorting - we'll keep what comes from the server (featured/relevance)
        break;
    }

    setSortedCafes(sorted);
  }, [cafes, filters.sortBy, userLocation]);

  // Function to handle search and filter changes
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (newFilters: CafeFilter) => {
    setFilters(newFilters);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === "list" ? "map" : "list");
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header with Search */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        {/* Top bar with logo and sign in */}
        <div className="w-full bg-white border-b border-gray-200">
          <div className="w-full mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center">
              <a href="/" className="flex items-center">
                <span className="sr-only">Peaberry</span>
                <svg className="h-8 w-8 text-[#A0522D]" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" fill="white" />
                </svg>
                <h1 className="font-serif text-2xl font-bold text-[#8B4513] ml-2">Peaberry</h1>
              </a>
            </div>
            
            <div className="flex items-center gap-4">
              <a href="/auth" className="text-gray-700 hover:text-[#A0522D]">Sign In</a>
              <a href="/auth" className="px-4 py-1.5 bg-[#A0522D] text-white rounded-md hover:bg-[#8B4513] transition font-medium text-sm">Sign Up</a>
            </div>
          </div>
        </div>
        
        {/* Search bar section */}
        <div className="w-full bg-white px-4 py-3">
          <div className="mx-auto flex max-w-4xl">
            <div className="flex w-full rounded-md overflow-hidden border border-gray-300">
              <div className="relative flex-1 flex bg-white">
                <input 
                  type="text" 
                  placeholder="Search cafés, roasts, or brewing methods..." 
                  className="w-full pl-4 py-2.5 border-none focus:outline-none focus:ring-0 text-gray-700"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              
              <div className="relative bg-white border-l border-gray-300">
                <input 
                  type="text" 
                  placeholder="Boston, MA" 
                  className="w-40 px-4 py-2.5 border-none focus:outline-none focus:ring-0 text-gray-700"
                  value={filters.neighborhood ? filters.neighborhood : "Boston, MA"}
                  readOnly
                />
              </div>
              
              <button 
                className="px-5 py-2.5 bg-[#A0522D] text-white hover:bg-[#8B4513] transition flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </button>
            </div>
          </div>
        </div>
        

      </header>
      
      {/* Main Content */}
      <main className="w-full mx-auto px-1 pt-4 pb-2">
        <div className="flex flex-col lg:flex-row gap-1">
          {/* Left Sidebar - Filters */}
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-[160px] h-[calc(100vh-180px)] overflow-auto bg-white rounded-lg shadow-md p-4">
              <h2 className="font-serif text-lg font-semibold text-[#8B4513] mb-4">Filters</h2>
              
              {/* Filters Section */}
              <div className="space-y-5">
                {/* Neighborhood filter */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-gray-700">Neighborhood</h3>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#A0522D]"
                    value={filters.neighborhood || ''}
                    onChange={(e) => handleFilterChange({...filters, neighborhood: e.target.value})}
                  >
                    <option value="">All Neighborhoods</option>
                    {neighborhoods.map(neighborhood => (
                      <option key={neighborhood} value={neighborhood}>{neighborhood}</option>
                    ))}
                  </select>
                </div>
                
                {/* Roast Level filter */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-gray-700">Roast Level</h3>
                  <div className="space-y-1">
                    {roastLevels.map(roast => {
                      const isSelected = filters.roastLevels?.includes(roast as any) || false;
                      return (
                        <label key={roast} className="flex items-center space-x-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {
                              const currentRoasts = filters.roastLevels || [];
                              const newRoasts = isSelected 
                                ? currentRoasts.filter(r => r !== roast)
                                : [...currentRoasts, roast];
                              handleFilterChange({...filters, roastLevels: newRoasts.length ? newRoasts : undefined});
                            }}
                            className="rounded text-[#A0522D] focus:ring-[#A0522D]"
                          />
                          <span className="text-gray-700 capitalize">{roast}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                
                {/* Brewing Method filter */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-gray-700">Brewing Methods</h3>
                  <div className="space-y-1">
                    {brewingMethods.map(method => {
                      const isSelected = filters.brewingMethods?.includes(method.value as any) || false;
                      return (
                        <label key={method.value} className="flex items-center space-x-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {
                              const currentMethods = filters.brewingMethods || [];
                              const newMethods = isSelected 
                                ? currentMethods.filter(m => m !== method.value)
                                : [...currentMethods, method.value];
                              handleFilterChange({...filters, brewingMethods: newMethods.length ? newMethods : undefined});
                            }}
                            className="rounded text-[#A0522D] focus:ring-[#A0522D]"
                          />
                          <span className="text-gray-700">{method.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                
                {/* Price Range */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-gray-700">Price Range</h3>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="range" 
                      min="1" 
                      max="4" 
                      value={filters.priceLevel || 4}
                      onChange={(e) => handleFilterChange({...filters, priceLevel: parseInt(e.target.value)})}
                      className="w-full"
                    />
                    <span className="text-sm text-gray-600">
                      {"$".repeat(filters.priceLevel || 4)}
                    </span>
                  </div>
                </div>
                
                {/* Ratings filter */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-gray-700">Minimum Rating</h3>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="range" 
                      min="0" 
                      max="5" 
                      step="0.5"
                      value={filters.minRating || 0}
                      onChange={(e) => handleFilterChange({...filters, minRating: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                    <span className="text-sm text-gray-600">
                      {filters.minRating || 0}+
                    </span>
                  </div>
                </div>
                
                {/* Amenities */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-gray-700">Amenities</h3>
                  <div className="space-y-1">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={filters.hasWifi || false}
                        onChange={(e) => handleFilterChange({...filters, hasWifi: e.target.checked || undefined})}
                        className="rounded text-[#A0522D] focus:ring-[#A0522D]"
                      />
                      <span className="text-gray-700">WiFi</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={filters.hasPower || false}
                        onChange={(e) => handleFilterChange({...filters, hasPower: e.target.checked || undefined})}
                        className="rounded text-[#A0522D] focus:ring-[#A0522D]"
                      />
                      <span className="text-gray-700">Power Outlets</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={filters.hasFood || false}
                        onChange={(e) => handleFilterChange({...filters, hasFood: e.target.checked || undefined})}
                        className="rounded text-[#A0522D] focus:ring-[#A0522D]"
                      />
                      <span className="text-gray-700">Food Options</span>
                    </label>
                  </div>
                </div>
                
                {/* Sort */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-gray-700">Sort By</h3>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#A0522D]"
                    value={filters.sortBy || 'default'}
                    onChange={(e) => {
                      const sortValue = e.target.value as "default" | "distance" | "rating_high" | "reviews_count";
                      handleFilterChange({...filters, sortBy: sortValue});
                    }}
                  >
                    <option value="default">Relevance</option>
                    <option value="distance">Distance</option>
                    <option value="rating_high">Highest Rated</option>
                    <option value="reviews_count">Most Reviewed</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>
          
          {/* Main Content - Cafe List */}
          <div className="w-[calc(50%-66px)]">
            {/* Results count and view toggle */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-700">
                <span className="font-medium">{cafes.length}</span> cafés found
              </p>
            </div>
            
            {/* CafeList component will be updated */}
            <CafeList 
              key="cafe-list" 
              cafes={sortedCafes.length > 0 ? sortedCafes : cafes} 
              isLoading={isLoading} 
              cafeDistances={cafeDistances}
            />
          </div>
          
          {/* Map sidebar */}
          <aside className="w-1/2 shrink-0 hidden lg:block">
            <div className="sticky top-[160px] h-[calc(100vh-180px)] bg-white rounded-lg shadow-md overflow-hidden">
              <CafeMap 
                key={`cafe-map-${cafes.length}`} 
                cafes={sortedCafes.length > 0 ? sortedCafes : cafes} 
                isLoading={isLoading}
                singleLocation={false}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
