import { CafeFilter } from "@shared/schema";

interface AmenityFiltersProps {
  filters: CafeFilter;
  onFilterChange: (newFilters: CafeFilter) => void;
}

export default function AmenityFilters({
  filters,
  onFilterChange
}: AmenityFiltersProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm text-gray-700">Sells Coffee Beans</h3>
      <div className="flex items-center gap-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="sellsCoffeeBeans"
            checked={filters.sellsCoffeeBeans === true}
            onChange={() =>
              onFilterChange({
                ...filters,
                sellsCoffeeBeans: true,
              })
            }
            className="form-radio h-4 w-4 text-[#A0522D] rounded"
          />
          <span className="text-sm text-gray-700">Yes</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            name="sellsCoffeeBeans"
            checked={filters.sellsCoffeeBeans === false}
            onChange={() =>
              onFilterChange({
                ...filters,
                sellsCoffeeBeans: false,
              })
            }
            className="form-radio h-4 w-4 text-[#A0522D] rounded"
          />
          <span className="text-sm text-gray-700">No</span>
        </label>
        {filters.sellsCoffeeBeans !== undefined && (
          <button
            onClick={() =>
              onFilterChange({
                ...filters,
                sellsCoffeeBeans: undefined,
              })
            }
            className="text-xs text-gray-500 hover:text-[#A0522D]"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}