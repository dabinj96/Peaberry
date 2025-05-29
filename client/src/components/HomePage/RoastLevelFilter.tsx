import { Checkbox } from "@/components/ui/checkbox";

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
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-gray-900">Roast Level</h3>
      <div className="space-y-2">
        {roastLevels.map((roastLevel) => (
          <div key={roastLevel} className="flex items-center space-x-2">
            <Checkbox
              id={roastLevel}
              checked={selectedRoastLevels.includes(roastLevel)}
              onCheckedChange={() => handleRoastLevelToggle(roastLevel)}
            />
            <label
              htmlFor={roastLevel}
              className="text-sm font-normal cursor-pointer"
            >
              {formatRoastLevel(roastLevel)}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}