import { CafeFilter } from "@shared/schema";

interface RatingFilterProps {
  selectedMinRating?: number;
  onFilterChange: (newFilters: CafeFilter) => void;
  filters: CafeFilter;
}

export default function RatingFilter({
  selectedMinRating,
  onFilterChange,
  filters
}: RatingFilterProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm text-gray-700">Minimum Rating</h3>
      <div className="mt-3">
        <div className="flex justify-center space-x-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              className="focus:outline-none transition-transform hover:scale-110"
              onClick={() => {
                const newRating = rating === selectedMinRating ? undefined : rating;
                onFilterChange({...filters, minRating: newRating});
              }}
              aria-label={`Set minimum rating to ${rating}`}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill={selectedMinRating && selectedMinRating >= rating ? "#FFD700" : "none"}
                stroke={selectedMinRating && selectedMinRating >= rating ? "#FFD700" : "#C0C0C0"}
                strokeWidth="1.5" 
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          ))}
        </div>
        {selectedMinRating && (
          <div className="text-center mt-2 text-gray-700 font-medium text-sm">
            {selectedMinRating}+ stars minimum
          </div>
        )}
      </div>
    </div>
  );
}