import { useEffect, useState, useRef } from "react";
import { CafeWithDetails } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import MapMarker from "./map-marker";

interface CafeMapProps {
  cafes: CafeWithDetails[];
  isLoading: boolean;
  singleLocation?: boolean;
}

// Google Maps type definitions
declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
  
  namespace google.maps {
    class Map {
      constructor(element: HTMLElement, options?: MapOptions);
      setCenter(latLng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      fitBounds(bounds: LatLngBounds): void;
      getZoom(): number;
    }
    
    class Marker {
      constructor(options?: MarkerOptions);
      setMap(map: Map | null): void;
      addListener(event: string, handler: Function): MapsEventListener;
    }
    
    class InfoWindow {
      constructor(options?: InfoWindowOptions);
      setContent(content: string | Node): void;
      open(map: Map, anchor?: MVCObject): void;
    }
    
    class LatLngBounds {
      constructor();
      extend(latLng: LatLng | LatLngLiteral): LatLngBounds;
      isEmpty(): boolean;
    }
    
    interface MapOptions {
      center: LatLng | LatLngLiteral;
      zoom: number;
      styles?: any[];
    }
    
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    
    interface LatLng {
      lat(): number;
      lng(): number;
    }
    
    interface MarkerOptions {
      position: LatLng | LatLngLiteral;
      map?: Map;
      title?: string;
      icon?: string | Icon;
      animation?: Animation;
    }
    
    interface Icon {
      url: string;
      scaledSize?: Size;
      origin?: Point;
      anchor?: Point;
    }
    
    class Size {
      constructor(width: number, height: number);
    }
    
    class Point {
      constructor(x: number, y: number);
    }
    
    interface InfoWindowOptions {
      content?: string | Node;
      maxWidth?: number;
    }
    
    interface MapsEventListener {
      remove(): void;
    }
    
    interface MVCObject {
      addListener(eventName: string, handler: Function): MapsEventListener;
    }
    
    enum Animation {
      DROP,
      BOUNCE
    }
    
    namespace event {
      function addListener(instance: any, eventName: string, handler: Function): MapsEventListener;
      function removeListener(listener: MapsEventListener): void;
    }
  }
}

export default function CafeMap({ cafes, isLoading, singleLocation = false }: CafeMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const { toast } = useToast();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Load Google Maps API
  useEffect(() => {
    if (!window.google) {
      // Check if API key is available
      if (!GOOGLE_MAPS_API_KEY) {
        console.warn("Google Maps API key is missing. Please set the VITE_GOOGLE_MAPS_API_KEY environment variable.");
        toast({
          title: "Map Configuration Error",
          description: "Google Maps API key is not configured. Map functionality will be limited.",
          variant: "destructive",
        });
        return;
      }
      
      // Create script element
      const script = document.createElement("script");
      // Use the API key from environment variables through the utils.ts export
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&libraries=places`;
      script.async = true;
      script.defer = true;
      
      // Define the callback
      window.initMap = () => {
        setMapLoaded(true);
        console.log("Google Maps API loaded successfully");
      };
      
      // Handle errors
      script.onerror = () => {
        console.error("Failed to load Google Maps API");
        toast({
          title: "Map Loading Error",
          description: "Failed to load Google Maps. Please check API key configuration.",
          variant: "destructive",
        });
      };
      
      document.head.appendChild(script);
      
      return () => {
        // Cleanup
        window.initMap = () => {};
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    } else {
      setMapLoaded(true);
    }
  }, [toast]);

  // Initialize map when Google Maps is loaded
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      // Create map
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: 42.3601, lng: -71.0589 }, // Boston coordinates
        zoom: 12,
        styles: [
          { featureType: "poi.business", stylers: [{ visibility: "on" }] },
          { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "on" }] }
        ],
      });
      
      setMap(newMap);
      
      // Create info window
      infoWindowRef.current = new window.google.maps.InfoWindow();
      
      return () => {
        // Cleanup markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
      };
    }
  }, [mapLoaded]);

  // Add markers for cafes
  useEffect(() => {
    if (map && cafes.length > 0) {
      // Clear previous markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      
      const bounds = new window.google.maps.LatLngBounds();
      
      cafes.forEach(cafe => {
        try {
          const lat = parseFloat(cafe.latitude);
          const lng = parseFloat(cafe.longitude);
          
          if (isNaN(lat) || isNaN(lng)) {
            console.error("Invalid coordinates for cafe:", cafe.name);
            return;
          }
          
          const position = { lat, lng };
          
          // Create custom marker
          const marker = new window.google.maps.Marker({
            position,
            map,
            title: cafe.name,
            icon: {
              url: MapMarker({ filled: cafe.isFavorite }),
              scaledSize: new window.google.maps.Size(40, 40),
              origin: new window.google.maps.Point(0, 0),
              anchor: new window.google.maps.Point(20, 40),
            },
            animation: window.google.maps.Animation.DROP,
          });
          
          // Add marker to ref array
          markersRef.current.push(marker);
          
          // Add marker click listener
          marker.addListener("click", () => {
            if (infoWindowRef.current) {
              // Format price level as $ symbols
              const priceLevel = "$".repeat(cafe.priceLevel);
              
              // Show average rating if available
              const ratingDisplay = cafe.averageRating 
                ? `<div class="flex items-center mt-1">
                     <span class="text-yellow-500">★</span>
                     <span class="ml-1 text-sm">${cafe.averageRating.toFixed(1)}</span>
                     <span class="text-xs text-gray-500 ml-1">(${cafe.totalRatings} reviews)</span>
                   </div>`
                : '<div class="text-xs text-gray-500 mt-1">No reviews yet</div>';
              
              // Build enhanced info window with more details and directions link
              const content = `
                <div class="p-3 max-w-xs">
                  <h3 class="font-semibold text-[#A0522D]">${cafe.name}</h3>
                  <p class="text-sm text-gray-600">${cafe.neighborhood} · ${priceLevel}</p>
                  ${ratingDisplay}
                  
                  <div class="border-t border-gray-200 my-2"></div>
                  
                  <div class="flex justify-between mt-2">
                    <a 
                      href="/cafe/${cafe.id}" 
                      class="text-sm text-[#A0522D] hover:underline font-medium"
                    >
                      View Details
                    </a>
                    <a 
                      href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cafe.address)}" 
                      target="_blank"
                      class="text-sm text-blue-600 hover:underline font-medium"
                    >
                      Get Directions
                    </a>
                  </div>
                </div>
              `;
              
              infoWindowRef.current.setContent(content);
              infoWindowRef.current.open(map, marker);
            }
          });
          
          // Extend bounds
          bounds.extend(position);
        } catch (error) {
          console.error("Error creating marker:", error);
        }
      });
      
      // Fit map to bounds
      if (!singleLocation && !bounds.isEmpty()) {
        map.fitBounds(bounds);
        
        // Adjust zoom if too zoomed in
        const listener = window.google.maps.event.addListener(map, "idle", () => {
          if (map.getZoom() > 16) {
            map.setZoom(16);
          }
          window.google.maps.event.removeListener(listener);
        });
      } else if (singleLocation && cafes.length === 1) {
        // Center on single cafe
        const lat = parseFloat(cafes[0].latitude);
        const lng = parseFloat(cafes[0].longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          map.setCenter({ lat, lng });
          map.setZoom(15);
        }
      }
    }
  }, [map, cafes, singleLocation]);

  if (isLoading) {
    return (
      <div className="min-h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#A0522D]" />
      </div>
    );
  }

  if (!mapLoaded) {
    // Check if API key is missing
    if (!GOOGLE_MAPS_API_KEY) {
      return (
        <div className="min-h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center p-6 max-w-md">
            <div className="bg-amber-100 p-4 rounded-lg mb-4 border border-amber-200">
              <h3 className="text-amber-800 font-medium text-lg mb-2">Map Temporarily Unavailable</h3>
              <p className="text-amber-700 text-sm">
                Google Maps API key is not configured. Location information is still 
                available in list view.
              </p>
            </div>
            
            <div className="space-y-3">
              {cafes.map(cafe => (
                <div key={cafe.id} className="bg-white p-3 rounded shadow-sm text-left">
                  <h4 className="font-medium text-[#A0522D]">{cafe.name}</h4>
                  <p className="text-sm text-gray-500">{cafe.address}</p>
                  <p className="text-xs text-gray-400 mt-1">{cafe.neighborhood}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    // Normal loading state
    return (
      <div className="min-h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center p-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#A0522D] mx-auto mb-2" />
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex rounded-lg overflow-hidden shadow-md">
      <div ref={mapRef} className="h-[500px] w-full"></div>
    </div>
  );
}
