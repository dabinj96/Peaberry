import { CafeWithDetails } from "@shared/schema";
import CafeCard from "./cafe-card";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";

interface CafeListProps {
  cafes: CafeWithDetails[];
  isLoading: boolean;
  cafeDistances?: Map<number, number>; // Map of cafe IDs to distances in km
}

export default function CafeList({ cafes, isLoading, cafeDistances }: CafeListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [cafesPerPage] = useState(9); // Display 9 cafés per page (3x3 grid)
  
  // Reset pagination when cafes array changes
  useEffect(() => {
    setCurrentPage(1);
  }, [cafes.length]);
  
  // Calculate indexes for pagination
  const indexOfLastCafe = currentPage * cafesPerPage;
  const indexOfFirstCafe = indexOfLastCafe - cafesPerPage;
  const currentCafes = cafes.slice(indexOfFirstCafe, indexOfLastCafe);
  const totalPages = Math.ceil(cafes.length / cafesPerPage);
  
  // Change page
  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // Scroll to top of list with smooth animation
    window.scrollTo({
      top: document.querySelector('.cafe-list-container')?.getBoundingClientRect().top! + window.scrollY - 100,
      behavior: 'smooth'
    });
  };
  
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
    <div className="cafe-list-container space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentCafes.map((cafe) => (
          <CafeCard 
            key={cafe.id} 
            cafe={cafe} 
            distance={cafeDistances ? cafeDistances.get(cafe.id) : undefined}
          />
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center items-center pt-4">
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-1">
              {/* Generate page buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => 
                  // Show first 2 pages, last 2 pages, and pages around current page
                  page <= 2 || 
                  page > totalPages - 2 || 
                  (page >= currentPage - 1 && page <= currentPage + 1)
                )
                .map((page, idx, arr) => {
                  // If there's a gap, show ellipsis
                  const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                  
                  return (
                    <div key={page} className="flex items-center">
                      {showEllipsis && (
                        <span className="mx-1 text-gray-500">...</span>
                      )}
                      <Button 
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(page)}
                        className={`h-8 w-8 p-0 ${currentPage === page ? 'bg-[#A0522D] hover:bg-[#8B4513]' : ''}`}
                        aria-label={`Page ${page}`}
                        aria-current={currentPage === page ? "page" : undefined}
                      >
                        {page}
                      </Button>
                    </div>
                  );
                })
              }
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex justify-center text-sm text-gray-500">
        Showing {indexOfFirstCafe + 1}-{Math.min(indexOfLastCafe, cafes.length)} of {cafes.length} cafés
      </div>
    </div>
  );
}
