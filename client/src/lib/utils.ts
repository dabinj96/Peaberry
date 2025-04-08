import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDLUqBksmODJ8Ej9Gi9yPJE9lzvGcsx3tc";

// Format price level
export function formatPriceLevel(level: number): string {
  return "$".repeat(level);
}

// Convert brewing method enum value to display name
export function formatBrewingMethod(method: string): string {
  const methodMap: Record<string, string> = {
    'pour_over': 'Pour Over',
    'espresso': 'Espresso',
    'aeropress': 'Aeropress',
    'french_press': 'French Press',
    'siphon': 'Siphon'
  };
  
  return methodMap[method] || method;
}

// Convert roast level enum value to display name
export function formatRoastLevel(level: string): string {
  const levelMap: Record<string, string> = {
    'light': 'Light Roast',
    'medium': 'Medium Roast',
    'dark': 'Dark Roast'
  };
  
  return levelMap[level] || level;
}

// Format a rating out of 5
export function formatRating(rating: number | undefined): string {
  if (rating === undefined) return "No ratings yet";
  return rating.toFixed(1);
}

// Random color based on seed
export function getColorFromString(str: string): string {
  const colors = [
    'bg-red-100 text-red-800',
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-yellow-100 text-yellow-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800',
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Truncate text to a specific length
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
