import { CafeFilter } from "@shared/schema";

interface RoastLevelFilterProps {
  selectedRoastLevels: string[];
  onFilterChange: (newFilters: CafeFilter) => void;
  filters: CafeFilter;
}

const roastLevels = ['light', 'light_medium', 'medium', 'medium_dark', 'dark', 'extra_dark'] as const;

export default function RoastLevelFilter({
  selectedRoastLevels,
  onFilterChange,
  filters
}: RoastLevelFilterProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm text-gray-700">Roast Level</h3>
      <div className="space-y-1">
        {roastLevels.map(roast => {
          const isSelected = selectedRoastLevels.includes(roast as any) || false;
          return (
            <label key={roast} className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isSelected}
                onChange={() => {
                  const currentRoasts = selectedRoastLevels;
                  const newRoasts = isSelected 
                    ? currentRoasts.filter(r => r !== roast)
                    : [...currentRoasts, roast];
                  onFilterChange({...filters, roastLevels: newRoasts});
                }}
                className="form-checkbox h-4 w-4 text-[#A0522D] rounded" 
              />
              <span className="text-sm text-gray-700 capitalize">
                {roast.replace(/_/g, '-')}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}