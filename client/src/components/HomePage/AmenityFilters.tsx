import { CafeFilter } from "@shared/schema";

interface AmenityFiltersProps {
  filters: CafeFilter;
  onFilterChange: (newFilters: CafeFilter) => void;
}

export default function AmenityFilters({
  filters,
  onFilterChange
}: AmenityFiltersProps) {
  const amenities = [
    { key: 'hasWifi', label: 'WiFi Available' },
    { key: 'hasPower', label: 'Power Outlets' },
    { key: 'hasFood', label: 'Food Available' },
    { key: 'sellsCoffeeBeans', label: 'Sells Coffee Beans' }
  ] as const;

  return (
    <div className="space-y-4">
      {amenities.map(amenity => (
        <div key={amenity.key} className="space-y-2">
          <h3 className="font-medium text-sm text-gray-700">{amenity.label}</h3>
          <div className="space-y-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={filters[amenity.key] === true}
                onChange={() => {
                  const newValue = filters[amenity.key] === true ? undefined : true;
                  onFilterChange({...filters, [amenity.key]: newValue});
                }}
                className="form-checkbox h-4 w-4 text-[#A0522D] rounded" 
              />
              <span className="text-sm text-gray-700">Yes</span>
            </label>
          </div>
          {filters[amenity.key] !== undefined && (
            <button
              onClick={() => onFilterChange({...filters, [amenity.key]: undefined})}
              className="text-xs text-gray-500 hover:text-[#A0522D]"
            >
              Clear
            </button>
          )}
        </div>
      ))}
    </div>
  );
}