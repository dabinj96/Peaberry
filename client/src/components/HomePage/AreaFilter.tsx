import { CafeFilter } from "@shared/schema";

interface AreaFilterProps {
  filters: CafeFilter;
  areas: string[];
  onFilterChange: (filters: CafeFilter) => void;
}

export default function AreaFilter({ 
  filters, 
  areas, 
  onFilterChange 
}: AreaFilterProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm text-gray-700">Location</h3>
      <select
        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#A0522D]"
        value={filters.area || ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            area: e.target.value,
          })
        }
      >
        <option value="">All Locations</option>
        {areas.map((area) => (
          <option key={area} value={area}>
            {area}
          </option>
        ))}
      </select>
    </div>
  );
}