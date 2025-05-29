import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingFilterProps {
  minRating: number | null;
  onMinRatingChange: (rating: number | null) => void;
}

export function RatingFilter({ minRating, onMinRatingChange }: RatingFilterProps) {
  const ratings = [5, 4, 3, 2, 1];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="justify-between min-w-[200px]"
        >
          {minRating ? `${minRating}+ stars` : "Rating"}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <div className="p-2">
          <div
            className={cn(
              "flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent",
              !minRating && "bg-accent"
            )}
            onClick={() => onMinRatingChange(null)}
          >
            <span>Any rating</span>
          </div>
          {ratings.map((rating) => (
            <div
              key={rating}
              className={cn(
                "flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent",
                minRating === rating && "bg-accent"
              )}
              onClick={() => onMinRatingChange(rating)}
            >
              <div className="flex items-center space-x-1">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                ))}
                <span className="ml-1">& up</span>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}