// this hook will call the cafes API and return the data

import { useQuery } from "@tanstack/react-query";

import {
  CafeWithDetails as BaseCafeWithDetails,
  CafeFilter,
} from "@shared/schema";

// Extended type for CafeWithDetails to include rating info
interface CafeWithDetails extends BaseCafeWithDetails {
  avgRating?: number;
  ratingCount?: number;
}

// Build query string with filters
const buildCafesQueryString = (filters: CafeFilter, searchQuery: string) => {
  const params = new URLSearchParams();

  // Add neighborhood filter
  if (filters.neighborhood) {
    params.append("neighborhood", filters.neighborhood);
  }

  // Add roast levels filter
  if (filters.roastLevels && filters.roastLevels.length > 0) {
    params.append("roastLevels", filters.roastLevels.join(","));
  }

  // Add brewing methods filter
  if (filters.brewingMethods && filters.brewingMethods.length > 0) {
    params.append("brewingMethods", filters.brewingMethods.join(","));
  }

  // Add minimum rating filter
  if (filters.minRating) {
    params.append("minRating", filters.minRating.toString());
  }

  // Add other amenity filters
  if (filters.hasWifi !== undefined) {
    params.append("hasWifi", filters.hasWifi.toString());
  }

  if (filters.sellsCoffeeBeans !== undefined) {
    params.append("sellsCoffeeBeans", filters.sellsCoffeeBeans.toString());
  }

  // Add search query if present
  if (searchQuery) {
    params.append("q", searchQuery);
  }

  const queryString = params.toString();
  return queryString ? `/api/cafes?${queryString}` : "/api/cafes";
};

export default function useCafesQuery(
  filters: CafeFilter,
  searchQuery: string,
) {
  const queryUrl = buildCafesQueryString(filters, searchQuery);

  const {
    data: cafes = [],
    isLoading,
    error,
    refetch,
  } = useQuery<CafeWithDetails[]>({
    queryKey: [queryUrl],
    staleTime: 0, // Always fetch fresh data when filters change
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  return {
    cafes,
    isLoading,
    error,
    refetch,
  };
}
