import { CafeWithDetails } from "@shared/schema";
import CafeCard from "./cafe-card";
import { Loader2 } from "lucide-react";

interface CafeListProps {
  cafes: CafeWithDetails[];
  isLoading: boolean;
}

export default function CafeList({ cafes, isLoading }: CafeListProps) {
  if (isLoading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#A0522D]" />
      </div>
    );
  }

  if (cafes.length === 0) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <h2 className="text-xl font-serif font-semibold mb-2 text-[#8B4513]">No cafés found</h2>
        <p className="text-gray-600 text-center max-w-md">
          We couldn't find any cafés matching your criteria. Try adjusting your filters or search terms.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cafes.map((cafe) => (
        <CafeCard key={cafe.id} cafe={cafe} />
      ))}
    </div>
  );
}
