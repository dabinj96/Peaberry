import { CafeWithDetails } from "@shared/schema";
import CafeCard from "./cafe-card";
import { ChevronLeft, ChevronRight, Loader2, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";

interface CafeListProps {
  cafes: CafeWithDetails[];
  isLoading: boolean;
  cafeDistances?: Map<number, number>; // Map of cafe IDs to distances in km
}

export default function CafeList({ cafes, isLoading, cafeDistances }: CafeListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [cafesPerPage] = useState(10); // Display 10 cafés per page (vertical list)
  
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
    <div className="cafe-list-container space-y-4">
      {/* Stacked café cards with numbers */}
      <div className="space-y-4">
        {currentCafes.map((cafe, index) => {
          const actualIndex = indexOfFirstCafe + index + 1;
          return (
            <div key={cafe.id} className="flex bg-white rounded-lg shadow-md overflow-hidden transition-shadow hover:shadow-lg">
              {/* Numbered marker */}
              <div className="relative shrink-0">
                <img 
                  src={cafe.imageUrl || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&h=200&q=80"} 
                  alt={cafe.name} 
                  className="h-24 w-24 object-cover m-3"
                />
                <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-[#A0522D] text-white flex items-center justify-center font-medium text-sm shadow-md">
                  {actualIndex}
                </div>
              </div>
              
              {/* Café details */}
              <div className="p-4 flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-[#8B4513] mb-1">
                      <a href={`/cafe/${cafe.id}`} className="hover:underline">{cafe.name}</a>
                    </h3>
                    <div className="text-sm text-gray-600 mb-2">
                      {cafe.neighborhood && <span>{cafe.neighborhood}</span>}
                      {cafe.priceLevel && <span className="ml-1">· {"$".repeat(cafe.priceLevel)}</span>}
                    </div>
                  </div>
                  
                  {cafe.averageRating && (
                    <div className="flex items-center bg-[#FAEBD7] px-2 py-1 rounded">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500 mr-1">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      <span className="font-medium text-sm">{cafe.averageRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                
                {/* Features and distance */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex flex-wrap gap-1">
                    {cafe.roastLevels && cafe.roastLevels.map(roast => (
                      <span key={roast} className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {roast}
                      </span>
                    ))}
                    {cafe.brewingMethods && cafe.brewingMethods.slice(0, 2).map(method => (
                      <span key={method} className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {method && method.includes('_') ? method.replace(/_/g, ' ') : method}
                      </span>
                    ))}
                    {cafe.brewingMethods && cafe.brewingMethods.length > 2 && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                        +{cafe.brewingMethods.length - 2} more
                      </span>
                    )}
                  </div>
                  
                  {cafeDistances && cafeDistances.has(cafe.id) && (
                    <div className="text-xs text-gray-500 flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {cafeDistances.get(cafe.id)?.toFixed(1)} km
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Pagination */}
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
