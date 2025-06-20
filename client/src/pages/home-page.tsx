import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CafeWithDetails as BaseCafeWithDetails,
  CafeFilter,
} from "@shared/schema";
import SearchFilters from "@/components/search-filters";
import CafeList from "@/components/cafe-list";
import CafeMap from "@/components/cafe-map";
import FeaturedCafes from "@/components/featured-cafes";
import HomePageSearchBar from "@/components/home-page-search-bar";
import FilterContainer from "@/components/HomePage/FilterContainer";
import { User, Search, MapPin, Filter, Loader2, Star, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import useCafesQuery from "@/hooks/use-cafes-query";

// Extended type for CafeWithDetails to include rating info
interface CafeWithDetails extends BaseCafeWithDetails {
  avgRating?: number;
  ratingCount?: number;
}

// Simple string enum for sort options to match the UI
type SortOption = "relevance" | "distance" | "rating" | "reviews";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const isAuthenticated = !!user;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [filters, setFilters] = useState<CafeFilter>({});
  const [defaultLocation, setDefaultLocation] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<string>("relevance");
  const [sortedCafes, setSortedCafes] = useState<CafeWithDetails[]>([]);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [cafeDistances, setCafeDistances] = useState<Map<number, number>>(
    new Map(),
  );
  const [distanceUnit, setDistanceUnit] = useState<"mi" | "km">("mi");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [distanceDropdownOpen, setDistanceDropdownOpen] = useState(false);

  // Define the roast levels and brewing methods for type safety
  const roastLevels = [
    "light",
    "light_medium",
    "medium",
    "medium_dark",
    "dark",
    "extra_dark",
  ] as const;
  type RoastLevel = (typeof roastLevels)[number];

  const brewingMethods = [
    { value: "espresso_based" as const, label: "Espresso-based" },
    { value: "pour_over" as const, label: "Pour over" },
    { value: "siphon" as const, label: "Siphon" },
    { value: "mixed_drinks" as const, label: "Mixed Drinks" },
    { value: "nitro" as const, label: "Nitro" },
    { value: "cold_brew" as const, label: "Cold Brew" },
  ];
  type BrewingMethod = (typeof brewingMethods)[number]["value"];

  // Fetch cafes from API with filters
  const { cafes, isLoading, error, refetch } = useCafesQuery(
    filters,
    searchQuery,
  );

  // Refetch cafes when filters change
  useEffect(() => {
    refetch();
    // Log applied filters for debugging
    console.log("Applied filters:", filters);
  }, [filters, refetch]);

  // Fetch areas for filters
  const { data: areas = [] } = useQuery<string[]>({
    queryKey: ["/api/areas"],
  });

  // Set default location when areas are loaded
  useEffect(() => {
    if (areas.length > 0 && !defaultLocation) {
      setDefaultLocation(areas[0]);
    }
  }, [areas, defaultLocation]);

  // Fetch user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting user location:", error);
          // Default to Boston
          setUserLocation({ lat: 42.3601, lng: -71.0589 });
        },
      );
    } else {
      // Default to Boston if geolocation not available
      setUserLocation({ lat: 42.3601, lng: -71.0589 });
    }
  }, []);

  // Calculate distances when cafes and user location are available
  useEffect(() => {
    if (cafes.length && userLocation) {
      const distances = new Map<number, number>();

      cafes.forEach((cafe) => {
        if (cafe.latitude && cafe.longitude) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            parseFloat(cafe.latitude),
            parseFloat(cafe.longitude),
          );
          distances.set(cafe.id, distance);
        }
      });

      setCafeDistances(distances);
    }
  }, [cafes, userLocation]);

  // Helper function to calculate distance between two points using Haversine formula
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  };

  // Handler for search input
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // TODO: Implement search functionality
  };

  // Handler for filter changes
  const handleFilterChange = (newFilters: CafeFilter) => {
    setFilters(newFilters);
  };

  // Handle sort selection
  const handleSort = (option: string) => {
    // Update sort option state
    setSortOption(option);

    if (!cafes.length) {
      setSortedCafes([]);
      return;
    }

    let sorted = [...cafes];

    switch (option) {
      case "distance":
        sorted.sort((a, b) => {
          const distA = cafeDistances.get(a.id) || 9999;
          const distB = cafeDistances.get(b.id) || 9999;
          return distA - distB;
        });
        break;
      case "rating":
        sorted.sort((a, b) => {
          const ratingA = a.avgRating || 0;
          const ratingB = b.avgRating || 0;
          return ratingB - ratingA;
        });
        break;
      case "reviews":
        sorted.sort((a, b) => {
          const countA = a.ratingCount || 0;
          const countB = b.ratingCount || 0;
          return countB - countA;
        });
        break;
      default: // relevance or any other case
        // Default sorting is handled by the API
        sorted = [...cafes];
    }

    setSortedCafes(sorted);
  };

  // Apply sorting whenever cafes data changes
  useEffect(() => {
    if (cafes.length > 0) {
      handleSort(sortOption);
    } else {
      // Clear sorted cafes when filter results are empty
      setSortedCafes([]);
    }
  }, [cafes, cafeDistances]);

  const toggleViewMode = () => {
    setViewMode(viewMode === "list" ? "map" : "list");
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Search bar section */}
      <HomePageSearchBar
        searchQuery={searchQuery}
        filters={filters}
        defaultLocation={defaultLocation}
        onSearch={handleSearch}
      />

      {/* Main Content */}
      <main className="w-full mx-auto px-1 pt-4 pb-2">
        <div className="flex flex-col lg:flex-row gap-1">
          {/* Left Sidebar - Filters */}
          <FilterContainer
            filters={filters}
            areas={areas}
            onFilterChange={handleFilterChange}
          />

          {/* Main content - Café List or Map */}
          <div className="flex-1 p-1">
            {/* Clean Dropdown Controls */}
            <div className="flex items-center justify-between mb-3 bg-white rounded-lg shadow-sm px-4 py-3">
              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#8B4513] transition-colors"
                >
                  <span className="font-medium">Sort:</span>
                  <span className="capitalize">
                    {sortOption === "relevance" ? "Recommended" : 
                     sortOption === "rating" ? "Highest Rated" :
                     sortOption === "reviews" ? "Most Reviewed" :
                     sortOption}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {sortDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="py-1">
                      {[
                        { value: "relevance", label: "Recommended" },
                        { value: "rating", label: "Highest Rated" },
                        { value: "reviews", label: "Most Reviewed" },
                        { value: "distance", label: "Distance" }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            handleSort(option.value);
                            setSortDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                            sortOption === option.value ? "text-[#8B4513] bg-blue-50" : "text-gray-700"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Distance Unit Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDistanceDropdownOpen(!distanceDropdownOpen)}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#8B4513] transition-colors"
                >
                  <span className="font-medium">Distance:</span>
                  <span>{distanceUnit === "mi" ? "Miles" : "Kilometers"}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${distanceDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {distanceDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setDistanceUnit("mi");
                          setDistanceDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                          distanceUnit === "mi" ? "text-[#8B4513] bg-blue-50" : "text-gray-700"
                        }`}
                      >
                        Miles
                      </button>
                      <button
                        onClick={() => {
                          setDistanceUnit("km");
                          setDistanceDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                          distanceUnit === "km" ? "text-[#8B4513] bg-blue-50" : "text-gray-700"
                        }`}
                      >
                        Kilometers
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile map view toggle */}
            <div className="lg:hidden mb-3">
              <button
                className="w-full py-2 bg-white rounded-lg shadow-md text-center text-gray-700 flex items-center justify-center gap-2"
                onClick={toggleViewMode}
              >
                {viewMode === "list" ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                      <line x1="9" x2="9" y1="3" y2="18" />
                      <line x1="15" x2="15" y1="6" y2="21" />
                    </svg>
                    <span>Switch to Map View</span>
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="8" x2="21" y1="6" y2="6" />
                      <line x1="8" x2="21" y1="12" y2="12" />
                      <line x1="8" x2="21" y1="18" y2="18" />
                      <line x1="3" x2="3.01" y1="6" y2="6" />
                      <line x1="3" x2="3.01" y1="12" y2="12" />
                      <line x1="3" x2="3.01" y1="18" y2="18" />
                    </svg>
                    <span>Switch to List View</span>
                  </>
                )}
              </button>
            </div>

            {/* Café list - always shown on desktop, conditionally on mobile */}
            <div className={viewMode === "map" ? "hidden lg:block" : ""}>
              {isLoading && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-3 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#A0522D] mx-auto mb-2" />
                  <p className="text-gray-600">Loading cafés...</p>
                </div>
              )}

              {!isLoading && cafes.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-3 text-center">
                  <p className="text-gray-600">
                    No cafés found. Try adjusting your filters.
                  </p>
                </div>
              )}

              {/* CafeList component */}
              <CafeList
                key="cafe-list"
                cafes={sortedCafes.length > 0 ? sortedCafes : cafes}
                isLoading={isLoading}
                cafeDistances={cafeDistances}
                distanceUnit={distanceUnit}
              />
            </div>

            {/* Map view - shown on mobile when viewMode is map */}
            {viewMode === "map" && (
              <div className="lg:hidden h-[calc(100vh-250px)] bg-white rounded-lg shadow-md overflow-hidden">
                <CafeMap
                  key={`cafe-map-mobile-${cafes.length}`}
                  cafes={sortedCafes.length > 0 ? sortedCafes : cafes}
                  isLoading={isLoading}
                  singleLocation={false}
                />
              </div>
            )}
          </div>

          {/* Map sidebar - desktop only */}
          <aside className="w-1/2 shrink-0 hidden lg:block">
            <div className="sticky top-[130px] h-[calc(100vh-150px)] bg-white rounded-lg shadow-md overflow-hidden">
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
