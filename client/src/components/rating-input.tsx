import { useState } from "react";
import { Star } from "lucide-react";

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
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
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
          <Star
            key={starRating}
            className={`${starSizes[size]} cursor-pointer transition-colors ${
              isActive 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-gray-300 hover:text-yellow-200'
            }`}
            onMouseEnter={() => handleMouseEnter(starRating)}
            onClick={() => handleClick(starRating)}
          />
        );
      })}
    </div>
  );
}
