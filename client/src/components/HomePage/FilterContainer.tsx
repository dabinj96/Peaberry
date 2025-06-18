import { CafeFilter } from "@shared/schema";
import AreaFilter from "./AreaFilter";
import { RoastLevelFilter } from "./RoastLevelFilter";
import { BrewingMethodsFilter } from "./BrewingMethodsFilter";
import { RatingFilter } from "./RatingFilter";
import { CoffeeBeansFilter } from "./CoffeeBeansFilter";

interface FilterContainerProps {
  filters: CafeFilter;
  areas: string[];
  onFilterChange: (newFilters: CafeFilter) => void;
}

export default function FilterContainer({
  filters,
  areas,
  onFilterChange
}: FilterContainerProps) {
  return (
    <aside className="lg:w-64 shrink-0">
      <div className="sticky top-[130px] h-[calc(100vh-150px)] overflow-auto bg-white rounded-lg shadow-md p-4">
        <h2 className="font-serif text-lg font-semibold text-[#8B4513] mb-4">
          Filters
        </h2>

        <div className="space-y-5">
          <AreaFilter
            filters={filters}
            areas={areas}
            onFilterChange={onFilterChange}
          />

          <RoastLevelFilter
            selectedRoastLevels={filters.roastLevels || []}
            onRoastLevelsChange={(roastLevels: string[]) => onFilterChange({ ...filters, roastLevels })}
          />

          <BrewingMethodsFilter
            selectedBrewingMethods={filters.brewingMethods || []}
            onBrewingMethodsChange={(brewingMethods: string[]) => onFilterChange({ ...filters, brewingMethods })}
          />

          <RatingFilter
            minRating={filters.minRating || null}
            onMinRatingChange={(minRating: number | null) => onFilterChange({ ...filters, minRating })}
          />

          <CoffeeBeansFilter
            sellsCoffeeBeans={filters.sellsCoffeeBeans}
            onSellsCoffeeBeansChange={(sellsCoffeeBeans) => onFilterChange({ ...filters, sellsCoffeeBeans })}
          />
        </div>
      </div>
    </aside>
  );
}