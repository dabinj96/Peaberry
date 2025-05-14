import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Export the Google Maps API Key from environment variables
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * Utility function to conditionally join classNames together
 * Uses clsx and tailwind-merge for efficiency
 * 
 * @param inputs Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a brewing method from its internal value to a display name
 * @param method Brewing method string
 * @returns Formatted brewing method string
 */
export function formatBrewingMethod(method: string): string {
  const methodMap: Record<string, string> = {
    'pourOver': 'Pour Over',
    'espresso': 'Espresso',
    'drip': 'Drip',
    'aeropress': 'AeroPress',
    'frenchPress': 'French Press',
    'coldBrew': 'Cold Brew',
    'siphon': 'Siphon',
    'chemex': 'Chemex',
    'moka': 'Moka Pot',
    'turkish': 'Turkish',
    'vietnamese': 'Vietnamese',
  };
  
  return methodMap[method] || method;
}

/**
 * Format a roast level from its internal value to a display name
 * @param level Roast level string
 * @returns Formatted roast level string
 */
export function formatRoastLevel(level: string): string {
  const levelMap: Record<string, string> = {
    'light': 'Light Roast',
    'medium': 'Medium Roast',
    'dark': 'Dark Roast',
    'light-medium': 'Light-Medium Roast',
    'medium-dark': 'Medium-Dark Roast',
  };
  
  return levelMap[level] || level;
}

/**
 * Convert kilometers to miles
 * @param km Distance in kilometers
 * @returns Distance in miles
 */
export function kmToMiles(km: number): number {
  return km * 0.621371;
}

/**
 * Format distance based on unit preference
 * @param distanceKm Distance in kilometers
 * @param unit Unit preference ('mi' for miles, 'km' for kilometers)
 * @returns Formatted distance string
 */
export function formatDistance(distanceKm: number | undefined, unit: 'mi' | 'km' = 'mi'): string {
  if (distanceKm === undefined) return "Distance unavailable";
  
  if (unit === 'mi') {
    const miles = kmToMiles(distanceKm);
    return `${miles.toFixed(1)} mi`;
  } else {
    return `${distanceKm.toFixed(1)} km`;
  }
}