import { useState } from "react";
import { 
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Slider,
  Switch,
  Separator,
  Badge
} from "@/components/ui";
import { CafeFilter, cafeSortOptionsEnum } from "@shared/schema";
import { ChevronDown, ChevronUp, List, MapPin, SlidersHorizontal, X } from "lucide-react";
import FilterOptions from "./filter-options";
import SortOptions, { SortOption } from "./sort-options";
import { useQuery } from "@tanstack/react-query";

interface SearchFiltersProps {
  onFilterChange: (filters: CafeFilter) => void;
  viewMode: "list" | "map";
  onViewModeChange: () => void;
  resultCount: number;
}

export default function SearchFilters({
  onFilterChange,
  viewMode,
  onViewModeChange,
  resultCount
}: SearchFiltersProps) {
  const [filters, setFilters] = useState<CafeFilter>({
    sortBy: "default" // Default sort option
  });
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  
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

  // Handle neighborhood filter change
  const handleNeighborhoodChange = (neighborhood: string) => {
    const newFilters = { ...filters, neighborhood: neighborhood || undefined };
    if (!neighborhood) {
      delete newFilters.neighborhood;
    }
    updateFilters(newFilters);
  };

  // Handle roast level filter change
  const handleRoastLevelChange = (selectedRoasts: string[]) => {
    const newFilters = { 
      ...filters, 
      roastLevels: selectedRoasts.length > 0 ? selectedRoasts as any[] : undefined 
    };
    updateFilters(newFilters);
  };

  // Handle brewing method filter change
  const handleBrewingMethodChange = (selectedMethods: string[]) => {
    const newFilters = { 
      ...filters, 
      brewingMethods: selectedMethods.length > 0 ? selectedMethods as any[] : undefined 
    };
    updateFilters(newFilters);
  };

  // Handle price level filter change
  const handlePriceLevelChange = (value: number[]) => {
    const newFilters = { ...filters, priceLevel: value[0] };
    updateFilters(newFilters);
  };

  // Handle minimum rating filter change
  const handleMinRatingChange = (value: number[]) => {
    const newFilters = { ...filters, minRating: value[0] };
    updateFilters(newFilters);
  };

  // Handle amenity filter changes
  const handleAmenityChange = (amenity: 'hasWifi' | 'hasPower' | 'hasFood' | 'sellsCoffeeBeans', value: boolean) => {
    const newFilters = { ...filters, [amenity]: value || undefined };
    if (!value) {
      delete newFilters[amenity];
    }
    updateFilters(newFilters);
  };

  // Handle sort option change
  const handleSortChange = (sortOption: SortOption) => {
    const newFilters = { ...filters, sortBy: sortOption };
    updateFilters(newFilters);
  };

  // Update filters and count active filters
  const updateFilters = (newFilters: CafeFilter) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
    
    // Count active filters
    let count = 0;
    if (newFilters.neighborhood) count++;
    if (newFilters.roastLevels && newFilters.roastLevels.length > 0) count++;
    if (newFilters.brewingMethods && newFilters.brewingMethods.length > 0) count++;
    if (newFilters.priceLevel) count++;
    if (newFilters.minRating) count++;
    if (newFilters.hasWifi) count++;
    if (newFilters.hasPower) count++;
    if (newFilters.hasFood) count++;
    if (newFilters.sellsCoffeeBeans) count++;
    setActiveFiltersCount(count);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
    setActiveFiltersCount(0);
  };

  return (
    <div className="mb-6">
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-[#8B4513]">Filters</h2>
          {activeFiltersCount > 0 && (
            <button 
              className="text-sm text-[#A0522D] hover:text-[#8B4513] flex items-center"
              onClick={clearFilters}
            >
              <X className="h-4 w-4 mr-1" /> 
              Clear all
            </button>
          )}
        </div>
        
        {/* Primary filters */}
        <div className="flex flex-wrap items-center space-x-2 space-y-2 md:space-y-0 overflow-x-auto pb-3">
          {/* Neighborhood filter */}
          <div className="relative mt-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={`rounded-full ${filters.neighborhood ? 'bg-[#A0522D] text-white hover:bg-[#8B4513] hover:text-white' : ''}`}
                >
                  {filters.neighborhood || "Neighborhood"}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start">
                <div className="max-h-60 overflow-y-auto">
                  <div 
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleNeighborhoodChange("")}
                  >
                    All Neighborhoods
                  </div>
                  {neighborhoods.map(neighborhood => (
                    <div 
                      key={neighborhood}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleNeighborhoodChange(neighborhood)}
                    >
                      {neighborhood}
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Roast Level filter */}
          <FilterOptions 
            title="Roast Level" 
            options={[
              { value: "light", label: "Light" },
              { value: "light_medium", label: "Light-Medium" },
              { value: "medium", label: "Medium" },
              { value: "medium_dark", label: "Medium-Dark" },
              { value: "dark", label: "Dark" },
              { value: "extra_dark", label: "Extra Dark" },
            ]}
            selectedValues={filters.roastLevels || []}
            onChange={handleRoastLevelChange}
          />
          
          {/* Brewing Method filter */}
          <FilterOptions 
            title="Brewing Method" 
            options={[
              { value: "espresso_based", label: "Espresso-Based" },
              { value: "pour_over", label: "Pour Over" },
              { value: "siphon", label: "Siphon" },
              { value: "mixed_drinks", label: "Mixed Drinks" },
              { value: "nitro", label: "Nitro" },
              { value: "cold_brew", label: "Cold Brew" },
            ]}
            selectedValues={filters.brewingMethods || []}
            onChange={handleBrewingMethodChange}
          />
          
          {/* More Filters button */}
          <Button 
            variant="outline" 
            className={`rounded-full mt-2 ${activeFiltersCount > 0 && !filters.neighborhood && !filters.roastLevels && !filters.brewingMethods ? 'bg-[#A0522D] text-white hover:bg-[#8B4513] hover:text-white' : ''}`}
            onClick={() => setIsMoreFiltersOpen(!isMoreFiltersOpen)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            More Filters
            {activeFiltersCount > 0 && !filters.neighborhood && !filters.roastLevels && !filters.brewingMethods && (
              <Badge variant="secondary" className="ml-1 bg-white text-[#A0522D] hover:bg-white">
                {activeFiltersCount}
              </Badge>
            )}
            {isMoreFiltersOpen ? (
              <ChevronUp className="h-4 w-4 ml-1" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1" />
            )}
          </Button>
        </div>
        
        {/* Additional filters */}
        {isMoreFiltersOpen && (
          <div className="pt-3 border-t mt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Price filter */}
              <div>
                <label className="block mb-2 text-sm font-medium">Price Range</label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4].map((price) => (
                    <button
                      key={price}
                      type="button"
                      className={`px-3 py-1 border rounded-md transition-colors ${
                        (filters.priceLevel || 0) === price 
                          ? 'bg-[#A0522D] text-white border-[#8B4513]' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handlePriceLevelChange([price === filters.priceLevel ? 0 : price])}
                    >
                      {"$".repeat(price)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Rating filter */}
              <div>
                <label className="block mb-2 text-sm font-medium">Minimum Rating</label>
                <div className="flex flex-wrap bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        className="focus:outline-none relative"
                        onClick={() => handleMinRatingChange([rating === filters.minRating ? 0 : rating])}
                        aria-label={`${rating} stars minimum`}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="30" 
                          height="30" 
                          viewBox="0 0 24 24" 
                          fill={(filters.minRating || 0) >= rating ? "#FFD700" : "none"}
                          stroke={(filters.minRating || 0) >= rating ? "#FFD700" : "#C0C0C0"}
                          strokeWidth="1.5" 
                          className="transition-colors duration-200 hover:stroke-[#8B4513]"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Features filter */}
              <div>
                <label className="block mb-2 text-sm font-medium">Amenities</label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="wifi" className="text-sm cursor-pointer">WiFi</label>
                    <Switch 
                      id="wifi" 
                      checked={filters.hasWifi || false}
                      onCheckedChange={(checked) => handleAmenityChange('hasWifi', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="power" className="text-sm cursor-pointer">Power Outlets</label>
                    <Switch 
                      id="power" 
                      checked={filters.hasPower || false}
                      onCheckedChange={(checked) => handleAmenityChange('hasPower', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="food" className="text-sm cursor-pointer">Food Options</label>
                    <Switch 
                      id="food" 
                      checked={filters.hasFood || false}
                      onCheckedChange={(checked) => handleAmenityChange('hasFood', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="beans" className="text-sm cursor-pointer">Sells Coffee Beans</label>
                    <Switch 
                      id="beans" 
                      checked={filters.sellsCoffeeBeans || false}
                      onCheckedChange={(checked) => handleAmenityChange('sellsCoffeeBeans', checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Results count, sort options, and view toggle */}
      <div className="flex flex-wrap justify-between items-center mb-4">
        <p className="text-gray-700">
          <span className="font-medium">{resultCount}</span> cafés found
        </p>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Sort options dropdown */}
          <SortOptions 
            value={filters.sortBy || "default"} 
            onChange={handleSortChange}
          />
          
          {/* View mode toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              className={`rounded-none ${viewMode === 'list' ? 'bg-[#A0522D] text-white hover:bg-[#8B4513] hover:text-white' : ''}`}
              onClick={() => viewMode !== 'list' && onViewModeChange()}
            >
              <List className="h-4 w-4 mr-1" />
              <span className="text-sm hidden sm:inline">List</span>
            </Button>
            <Separator orientation="vertical" />
            <Button
              variant="ghost"
              className={`rounded-none ${viewMode === 'map' ? 'bg-[#A0522D] text-white hover:bg-[#8B4513] hover:text-white' : ''}`}
              onClick={() => viewMode !== 'map' && onViewModeChange()}
            >
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm hidden sm:inline">Map</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
