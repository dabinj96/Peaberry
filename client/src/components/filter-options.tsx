import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface FilterOptionsProps {
  title: string;
  options: Option[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
}

export default function FilterOptions({
  title,
  options,
  selectedValues,
  onChange
}: FilterOptionsProps) {
  const [open, setOpen] = useState(false);

  const handleOptionToggle = (value: string) => {
    const currentIndex = selectedValues.indexOf(value);
    const newSelectedValues = [...selectedValues];

    if (currentIndex === -1) {
      newSelectedValues.push(value);
    } else {
      newSelectedValues.splice(currentIndex, 1);
    }

    onChange(newSelectedValues);
  };

  const handleClearAll = () => {
    onChange([]);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={`rounded-full ${selectedValues.length > 0 ? 'bg-[#A0522D] text-white hover:bg-[#8B4513] hover:text-white' : ''}`}
        >
          {title}
          {selectedValues.length > 0 && (
            <Badge variant="secondary" className="ml-1 bg-white text-[#A0522D] hover:bg-white">
              {selectedValues.length}
            </Badge>
          )}
          {open ? (
            <ChevronUp className="h-4 w-4 ml-1" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-1" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-sm">{title}</h3>
          {selectedValues.length > 0 && (
            <Button 
              variant="ghost" 
              className="h-6 text-xs px-2 text-[#A0522D] hover:text-[#8B4513]"
              onClick={handleClearAll}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="space-y-1">
          {options.map(option => (
            <div
              key={option.value}
              className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-gray-100 cursor-pointer"
              onClick={() => handleOptionToggle(option.value)}
            >
              <span className="text-sm">{option.label}</span>
              {selectedValues.includes(option.value) && (
                <Check className="h-4 w-4 text-[#A0522D]" />
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
