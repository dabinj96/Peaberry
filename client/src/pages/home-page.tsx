import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CafeWithDetails, CafeFilter } from "@shared/schema";
import SearchFilters from "@/components/search-filters";
import CafeList from "@/components/cafe-list";
import CafeMap from "@/components/cafe-map";
import FeaturedCafes from "@/components/featured-cafes";

export default function HomePage() {
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [filters, setFilters] = useState<CafeFilter>({});
  const [searchQuery, setSearchQuery] = useState("");

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
    <div className="bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Hero section with search */}
        <section className="mb-8">
          <div className="bg-[#FAEBD7] rounded-xl p-8 mb-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80')" }} />
            <div className="relative z-10 max-w-3xl">
              <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-[#8B4513]">Discover Boston's Coffee Scene</h1>
              <p className="text-lg mb-6 text-gray-700">Find the perfect specialty café with your preferred roast and brewing method.</p>
              
              {/* Search input */}
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search for cafés, neighborhoods, or keywords..." 
                  className="w-full pl-12 pr-4 py-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-[#A0522D] text-gray-700"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                <span className="absolute left-4 top-4 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </span>
              </div>
            </div>
          </div>
        </section>
        
        {/* Filters and cafe list/map */}
        <section className="mb-8">
          <SearchFilters 
            onFilterChange={handleFilterChange} 
            viewMode={viewMode} 
            onViewModeChange={toggleViewMode}
            resultCount={cafes.length}
          />
          
          {viewMode === "list" ? (
            <CafeList cafes={cafes} isLoading={isLoading} />
          ) : (
            <CafeMap cafes={cafes} isLoading={isLoading} />
          )}
        </section>
        
        {/* Featured cafes section */}
        <FeaturedCafes />
        
        {/* Community section */}
        <section className="mb-12 bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="md:w-1/2">
              <h2 className="font-serif text-2xl font-bold mb-3 text-[#8B4513]">Join Our Coffee Community</h2>
              <p className="text-gray-700 mb-4">Share your favorite cafés, discover new spots, and connect with fellow coffee enthusiasts across Boston.</p>
              <ul className="mb-6 space-y-2">
                <li className="flex items-center text-gray-700">
                  <span className="text-[#A0522D] mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </span>
                  Save your favorite cafés for quick reference
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-[#A0522D] mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </span>
                  Rate and review cafés you've visited
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-[#A0522D] mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </span>
                  Get personalized recommendations based on your taste
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-[#A0522D] mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </span>
                  Join coffee meetups and tasting events
                </li>
              </ul>
              <div className="flex flex-wrap gap-3">
                <a href="/auth" className="px-6 py-2.5 bg-[#A0522D] text-white rounded-full hover:bg-[#8B4513] transition font-medium">
                  Create Account
                </a>
                <a href="/auth" className="px-6 py-2.5 border border-[#A0522D] text-[#A0522D] rounded-full hover:bg-[#FAEBD7] transition font-medium">
                  Learn More
                </a>
              </div>
            </div>
            <div className="md:w-1/2 relative">
              <img 
                src="https://images.unsplash.com/photo-1511920170033-f8396924c348?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80" 
                alt="Coffee Community" 
                className="w-full rounded-lg shadow-md"
              />
              <div className="absolute -bottom-4 -right-4 bg-white rounded-lg shadow-md p-3 hidden md:block">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">+2.5k members</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
