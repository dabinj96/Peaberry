import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";

interface RatingFilterProps {
  minRating: number | undefined;
  onMinRatingChange: (rating: number | null) => void;
}

export function RatingFilter({ minRating, onMinRatingChange }: RatingFilterProps) {
  const ratings = [5, 4, 3, 2, 1];

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-gray-900">Minimum Rating</h3>
      <RadioGroup
        value={minRating?.toString() || "any"}
        onValueChange={(value) => onMinRatingChange(value === "any" ? null : parseInt(value))}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="any" id="any-rating" />
          <Label htmlFor="any-rating" className="text-sm font-normal cursor-pointer">
            Any rating
          </Label>
        </div>
        {ratings.map((rating) => (
          <div key={rating} className="flex items-center space-x-2">
            <RadioGroupItem value={rating.toString()} id={`rating-${rating}`} />
            <Label htmlFor={`rating-${rating}`} className="text-sm font-normal cursor-pointer flex items-center space-x-1">
              <div className="flex items-center">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                ))}
                <span className="ml-1">& up</span>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}