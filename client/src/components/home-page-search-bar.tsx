import { MapPin } from "lucide-react";
import { CafeFilter } from "@shared/schema";

interface HomePageSearchBarProps {
  searchQuery: string;
  filters: CafeFilter;
  defaultLocation: string;
  onSearch: (query: string) => void;
}

export default function HomePageSearchBar({
  searchQuery,
  filters,
  defaultLocation,
  onSearch
}: HomePageSearchBarProps) {
  return (
    <div className="w-full bg-white px-4 py-3">
      <div className="mx-auto flex max-w-4xl">
        <div className="flex w-full rounded-md overflow-hidden border border-gray-300">
          <div className="relative flex-1 flex bg-white">
            <input 
              type="text" 
              placeholder="Search cafés, roasts, or brewing methods..." 
              className="w-full pl-4 py-2.5 border-none focus:outline-none focus:ring-0 text-gray-700"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          
          <div className="relative bg-white border-l border-gray-300">
            <div className="flex items-center px-4 w-48">
              <MapPin className="h-4 w-4 text-[#A0522D] mr-1.5" />
              <input 
                type="text" 
                placeholder="Select a location" 
                className="w-full py-2.5 border-none focus:outline-none focus:ring-0 text-gray-700"
                value={filters.neighborhood ? `${filters.neighborhood}` : defaultLocation ? `${defaultLocation}` : "All Locations"}
                readOnly
              />
            </div>
          </div>
          
          <button 
            className="px-5 py-2.5 bg-[#A0522D] text-white hover:bg-[#8B4513] transition flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}