import { CafeFilter } from "@shared/schema";

interface NeighborhoodFilterProps {
  filters: CafeFilter;
  neighborhoods: string[];
  onFilterChange: (filters: CafeFilter) => void;
}

export default function NeighborhoodFilter({ 
  filters, 
  neighborhoods, 
  onFilterChange 
}: NeighborhoodFilterProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm text-gray-700">Location</h3>
      <select
        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#A0522D]"
        value={filters.neighborhood || ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            neighborhood: e.target.value,
          })
        }
      >
        <option value="">All Locations</option>
        {neighborhoods.map((neighborhood) => (
          <option key={neighborhood} value={neighborhood}>
            {neighborhood}
          </option>
        ))}
      </select>
    </div>
  );
}