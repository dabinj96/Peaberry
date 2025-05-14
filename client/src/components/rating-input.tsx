import { useState } from "react";

interface RatingInputProps {
  rating: number;
  onChange: (rating: number) => void;
  size?: "sm" | "md" | "lg";
}

export default function RatingInput({ 
  rating, 
  onChange,
  size = "md" 
}: RatingInputProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  const containerClasses = {
    sm: "space-x-1",
    md: "space-x-2",
    lg: "space-x-3"
  };

  // Handle mouse enter on a star
  const handleMouseEnter = (starRating: number) => {
    setHoverRating(starRating);
  };

  // Handle mouse leave from stars container
  const handleMouseLeave = () => {
    setHoverRating(null);
  };

  // Handle star click
  const handleClick = (starRating: number) => {
    // Toggle off if clicking the same star twice
    if (rating === starRating) {
      onChange(0);
    } else {
      onChange(starRating);
    }
  };

  return (
    <div 
      className={`flex ${containerClasses[size]}`} 
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((starRating) => {
        const isActive = (hoverRating !== null ? starRating <= hoverRating : starRating <= rating);
        
        return (
          <button
            key={starRating}
            type="button"
            className="focus:outline-none transition-transform hover:scale-110"
            onMouseEnter={() => handleMouseEnter(starRating)}
            onClick={() => handleClick(starRating)}
            aria-label={`Rate ${starRating} stars`}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={starSizes[size]}
              viewBox="0 0 24 24" 
              fill={isActive ? "#FFD700" : "none"}
              stroke={isActive ? "#FFD700" : "#C0C0C0"}
              strokeWidth="1.5" 
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
        );
      })}
    </div>
  );
}
