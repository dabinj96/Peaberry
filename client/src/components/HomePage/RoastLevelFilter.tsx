import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const roastLevels = [
  "light",
  "light_medium", 
  "medium",
  "medium_dark",
  "dark",
  "extra_dark"
] as const;

interface RoastLevelFilterProps {
  selectedRoastLevels: string[];
  onRoastLevelsChange: (roastLevels: string[]) => void;
}

export function RoastLevelFilter({ selectedRoastLevels, onRoastLevelsChange }: RoastLevelFilterProps) {
  const handleRoastLevelToggle = (roastLevel: string) => {
    const newRoastLevels = selectedRoastLevels.includes(roastLevel)
      ? selectedRoastLevels.filter(r => r !== roastLevel)
      : [...selectedRoastLevels, roastLevel];
    onRoastLevelsChange(newRoastLevels);
  };

  const formatRoastLevel = (level: string) => {
    return level.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="justify-between min-w-[200px]"
        >
          {selectedRoastLevels.length > 0
            ? `${selectedRoastLevels.length} roast level${selectedRoastLevels.length > 1 ? 's' : ''}`
            : "Roast Level"}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <div className="p-2">
          {roastLevels.map((roastLevel) => (
            <div
              key={roastLevel}
              className={cn(
                "flex items-center space-x-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent",
                selectedRoastLevels.includes(roastLevel) && "bg-accent"
              )}
              onClick={() => handleRoastLevelToggle(roastLevel)}
            >
              <div className={cn(
                "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                selectedRoastLevels.includes(roastLevel)
                  ? "bg-primary text-primary-foreground"
                  : "opacity-50 [&_svg]:invisible"
              )}>
                <Check className="h-3 w-3" />
              </div>
              <span>{formatRoastLevel(roastLevel)}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}