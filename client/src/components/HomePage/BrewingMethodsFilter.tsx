import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const brewingMethods = [
  { value: "espresso_based", label: "Espresso Based" },
  { value: "pour_over", label: "Pour Over" },
  { value: "siphon", label: "Siphon" },
  { value: "mixed_drinks", label: "Mixed Drinks" },
  { value: "nitro", label: "Nitro" },
  { value: "cold_brew", label: "Cold Brew" }
] as const;

interface BrewingMethodsFilterProps {
  selectedBrewingMethods: string[];
  onBrewingMethodsChange: (brewingMethods: string[]) => void;
}

export function BrewingMethodsFilter({ selectedBrewingMethods, onBrewingMethodsChange }: BrewingMethodsFilterProps) {
  const handleBrewingMethodToggle = (brewingMethod: string) => {
    const newBrewingMethods = selectedBrewingMethods.includes(brewingMethod)
      ? selectedBrewingMethods.filter(b => b !== brewingMethod)
      : [...selectedBrewingMethods, brewingMethod];
    onBrewingMethodsChange(newBrewingMethods);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="justify-between min-w-[200px]"
        >
          {selectedBrewingMethods.length > 0
            ? `${selectedBrewingMethods.length} brewing method${selectedBrewingMethods.length > 1 ? 's' : ''}`
            : "Brewing Methods"}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <div className="p-2">
          {brewingMethods.map((brewingMethod) => (
            <div
              key={brewingMethod.value}
              className={cn(
                "flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent",
                selectedBrewingMethods.includes(brewingMethod.value) && "bg-accent"
              )}
              onClick={() => handleBrewingMethodToggle(brewingMethod.value)}
            >
              <div className={cn(
                "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                selectedBrewingMethods.includes(brewingMethod.value)
                  ? "bg-primary text-primary-foreground"
                  : "opacity-50 [&_svg]:invisible"
              )}>
                <Check className="h-3 w-3" />
              </div>
              <span>{brewingMethod.label}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}