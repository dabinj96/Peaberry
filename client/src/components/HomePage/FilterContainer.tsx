import { CafeFilter } from "@shared/schema";
import NeighborhoodFilter from "./NeighborhoodFilter";
import RoastLevelFilter from "./RoastLevelFilter";
import BrewingMethodsFilter from "./BrewingMethodsFilter";
import RatingFilter from "./RatingFilter";
import AmenityFilters from "./AmenityFilters";

interface FilterContainerProps {
  filters: CafeFilter;
  neighborhoods: string[];
  onFilterChange: (newFilters: CafeFilter) => void;
}

export default function FilterContainer({
  filters,
  neighborhoods,
  onFilterChange
}: FilterContainerProps) {
  return (
    <aside className="lg:w-64 shrink-0">
      <div className="sticky top-[130px] h-[calc(100vh-150px)] overflow-auto bg-white rounded-lg shadow-md p-4">
        <h2 className="font-serif text-lg font-semibold text-[#8B4513] mb-4">
          Filters
        </h2>

        <div className="space-y-5">
          <NeighborhoodFilter
            selectedNeighborhood={filters.neighborhood}
            neighborhoods={neighborhoods}
            onFilterChange={onFilterChange}
            filters={filters}
          />

          <RoastLevelFilter
            selectedRoastLevels={filters.roastLevels || []}
            onFilterChange={onFilterChange}
            filters={filters}
          />

          <BrewingMethodsFilter
            selectedBrewingMethods={filters.brewingMethods || []}
            onFilterChange={onFilterChange}
            filters={filters}
          />

          <RatingFilter
            selectedMinRating={filters.minRating}
            onFilterChange={onFilterChange}
            filters={filters}
          />

          <AmenityFilters
            filters={filters}
            onFilterChange={onFilterChange}
          />
        </div>
      </div>
    </aside>
  );
}