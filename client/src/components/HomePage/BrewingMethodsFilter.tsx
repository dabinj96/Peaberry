import { CafeFilter } from "@shared/schema";

interface BrewingMethodsFilterProps {
  selectedBrewingMethods: string[];
  onFilterChange: (newFilters: CafeFilter) => void;
  filters: CafeFilter;
}

const brewingMethods = [
  {value: 'espresso_based' as const, label: 'Espresso-based'},
  {value: 'pour_over' as const, label: 'Pour over'},
  {value: 'siphon' as const, label: 'Siphon'},
  {value: 'mixed_drinks' as const, label: 'Mixed Drinks'},
  {value: 'nitro' as const, label: 'Nitro'},
  {value: 'cold_brew' as const, label: 'Cold Brew'}
];

export default function BrewingMethodsFilter({
  selectedBrewingMethods,
  onFilterChange,
  filters
}: BrewingMethodsFilterProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm text-gray-700">Brewing Methods</h3>
      <div className="space-y-1">
        {brewingMethods.map(method => {
          const isSelected = selectedBrewingMethods.includes(method.value as any) || false;
          return (
            <label key={method.value} className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isSelected}
                onChange={() => {
                  const currentMethods = selectedBrewingMethods;
                  const newMethods = isSelected 
                    ? currentMethods.filter(m => m !== method.value)
                    : [...currentMethods, method.value];
                  onFilterChange({...filters, brewingMethods: newMethods});
                }}
                className="form-checkbox h-4 w-4 text-[#A0522D] rounded" 
              />
              <span className="text-sm text-gray-700">{method.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}