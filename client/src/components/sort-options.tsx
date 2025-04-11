import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, ArrowDownAZ, MapPin, Star, MessageSquare } from "lucide-react";
import { cafeSortOptionsEnum } from "@shared/schema";

// Type for the sort options
export type SortOption = typeof cafeSortOptionsEnum[number];

interface SortOptionsProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

interface SortOptionInfo {
  value: SortOption;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// Sort options with their display info
const sortOptions: SortOptionInfo[] = [
  {
    value: "default",
    label: "Relevance",
    icon: <ArrowDownAZ className="h-4 w-4" />,
    description: "Sort by relevance and featured cafés"
  },
  {
    value: "distance",
    label: "Distance",
    icon: <MapPin className="h-4 w-4" />,
    description: "Sort by distance from your location"
  },
  {
    value: "rating_high",
    label: "Rating",
    icon: <Star className="h-4 w-4" />,
    description: "Sort by highest rating"
  },
  {
    value: "reviews_count",
    label: "Most Reviewed",
    icon: <MessageSquare className="h-4 w-4" />,
    description: "Sort by most number of reviews"
  }
];

export default function SortOptions({ value, onChange }: SortOptionsProps) {
  const [open, setOpen] = useState(false);
  
  // Get the selected option
  const selectedOption = sortOptions.find(option => option.value === value) || sortOptions[0];
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center justify-between w-full md:w-auto px-4"
        >
          <div className="flex items-center">
            {selectedOption.icon}
            <span className="ml-2">Sort: {selectedOption.label}</span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className={`flex items-start px-3 py-2 cursor-pointer ${option.value === value ? 'bg-muted' : ''}`}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
          >
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mr-2 mt-0.5">
              {option.value === value ? (
                <Check className="h-4 w-4" />
              ) : (
                option.icon
              )}
            </div>
            <div>
              <div className="font-medium">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}