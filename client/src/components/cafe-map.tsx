import { useEffect, useState, useRef } from "react";
import { CafeWithDetails } from "@shared/schema";
import { Loader2, Navigation, Star, Phone, Clock, MapPin } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import MapMarker from "./map-marker";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

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
    
    namespace marker {
      class AdvancedMarkerElement {
        constructor(options?: AdvancedMarkerElementOptions);
        map?: Map;
      }
      
      interface AdvancedMarkerElementOptions {
        position: LatLng | LatLngLiteral;
        map?: Map;
        title?: string;
        content?: Element;
        zIndex?: number;
      }
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
      label?: string | MarkerLabel;
      zIndex?: number;
    }
    
    interface MarkerLabel {
      text: string;
      color?: string;
      fontSize?: string;
      fontWeight?: string;
      fontFamily?: string;
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
  
  // Reference for the marker clusterer
  const markerClustererRef = useRef<MarkerClusterer | null>(null);

  // Add markers for cafes
  useEffect(() => {
    if (map) {
      // Clear previous markers and clusterer
      if (markerClustererRef.current) {
        markerClustererRef.current.clearMarkers();
      }
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      
      // Skip showing toast notification - we'll handle empty state in the render method
      
      const bounds = new window.google.maps.LatLngBounds();
      
      cafes.forEach(cafe => {
        try {
          const lat = parseFloat(cafe.latitude);
          const lng = parseFloat(cafe.longitude);
          
          if (isNaN(lat) || isNaN(lng)) {
            console.error("Invalid coordinates for cafe:", cafe.name, cafe.latitude, cafe.longitude);
            return;
          }
          
          const position = { lat, lng };
          
          // Create custom marker
          const marker = new window.google.maps.Marker({
            position,
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
              const priceLevel = cafe.priceLevel ? "$".repeat(cafe.priceLevel) : "";
              
              // Get cafe features for display
              const features = [];
              if (cafe.roastLevels && cafe.roastLevels.length > 0) {
                features.push(`<span class="inline-flex items-center px-2 py-1 mr-1 mb-1 text-xs bg-amber-50 text-amber-800 rounded-full">
                  ${cafe.roastLevels.join(', ')} Roast
                </span>`);
              }
              
              if (cafe.brewingMethods && cafe.brewingMethods.length > 0) {
                features.push(`<span class="inline-flex items-center px-2 py-1 mr-1 mb-1 text-xs bg-amber-50 text-amber-800 rounded-full">
                  ${cafe.brewingMethods.join(', ')}
                </span>`);
              }
              
              // Show average rating if available
              const ratingDisplay = cafe.averageRating 
                ? `<div class="flex items-center mt-2 mb-2">
                     <span class="inline-flex items-center text-yellow-500 mr-1">
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                         <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                       </svg>
                     </span>
                     <span class="font-medium">${cafe.averageRating.toFixed(1)}</span>
                     <span class="text-xs text-gray-500 ml-1">(${cafe.totalRatings} reviews)</span>
                   </div>`
                : '<div class="text-xs text-gray-500 mt-2 mb-2">No reviews yet</div>';
              
              // Build enhanced info window with more visual details
              const content = `
                <div class="p-4 max-w-xs">
                  <div class="flex items-start mb-2">
                    <div class="flex-grow">
                      <h3 class="font-semibold text-[#A0522D] text-lg">${cafe.name}</h3>
                      <p class="text-sm text-gray-600">${cafe.neighborhood} ${priceLevel ? '· ' + priceLevel : ''}</p>
                    </div>
                    ${cafe.isFavorite ? `
                      <div class="ml-2 text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      </div>
                    ` : ''}
                  </div>
                  
                  ${ratingDisplay}
                  
                  <div class="flex flex-wrap mb-2">
                    ${features.join('')}
                  </div>
                  
                  <div class="text-sm text-gray-700 flex items-start mb-2">
                    <span class="inline-flex items-center text-gray-500 mr-2 shrink-0 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    </span>
                    <span>${cafe.address}</span>
                  </div>
                  
                  <div class="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
                    <a 
                      href="/cafe/${cafe.id}" 
                      class="inline-flex items-center text-sm font-medium text-[#A0522D] hover:text-[#8B4513]"
                    >
                      <span>View Details</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-1">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </a>
                    <a 
                      href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cafe.name + ' ' + cafe.neighborhood + ' Boston MA')}" 
                      target="_blank"
                      class="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      <span>View on Maps</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-1">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
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
      
      // Create marker clusterer with custom styles if we're not in single location mode
      if (!singleLocation) {
        // Create a MarkerClusterer with custom renderer
        markerClustererRef.current = new MarkerClusterer({
          map,
          markers: markersRef.current,
          // Custom renderer with coffee-themed colors
          renderer: {
            render: ({ count, position }) => {
              // Determine size and color based on count
              // Use distinctive color palette for better visual contrast
              let size, color, textColor = "white";
              
              if (count < 5) {
                size = 40;
                color = "#C87137"; // Light coffee
              } else if (count < 10) {
                size = 45;
                color = "#86592D"; // Medium coffee
              } else if (count < 15) {
                size = 50;
                color = "#D4A76A"; // Coffee with cream
                textColor = "#703030"; // Dark text for better contrast
              } else if (count < 20) {
                size = 55;
                color = "#4A2C2A"; // Dark espresso
              } else {
                size = 60;
                color = "#291711"; // Deep espresso
              }
              
              // Create a styled DIV for the cluster marker
              const clusterMarker = document.createElement("div");
              Object.assign(clusterMarker.style, {
                background: color,
                borderRadius: "50%",
                width: `${size}px`,
                height: `${size}px`,
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: textColor,
                fontWeight: "bold",
                fontSize: `${Math.min(18, 13 + Math.floor(count / 10))}px`,
                boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                border: "2px solid white"
              });
              
              // Add the count to the cluster
              clusterMarker.textContent = count.toString();
              
              // Return standard marker
              return new google.maps.Marker({
                position,
                icon: {
                  url: `data:image/svg+xml;base64,${btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
                      <circle cx="${size/2}" cy="${size/2}" r="${size/2-1}" fill="${color}" stroke="white" stroke-width="2"/>
                      <text x="${size/2}" y="${size/2+5}" text-anchor="middle" font-size="${Math.min(18, 13 + Math.floor(count/10))}px" font-family="Arial" font-weight="bold" fill="${textColor}">${count}</text>
                    </svg>
                  `)}`,
                  size: new google.maps.Size(size, size),
                  anchor: new google.maps.Point(size/2, size/2),
                  scaledSize: new google.maps.Size(size, size)
                },
                zIndex: 1000 + count
              });
            }
          }
        });
      } else {
        // If singleLocation is true, just add markers to the map
        markersRef.current.forEach(marker => marker.setMap(map));
      }
      
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

  // No cafes found but map loaded
  if (mapLoaded && cafes.length === 0) {
    return (
      <div className="min-h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <div className="bg-amber-100 p-4 rounded-lg mb-4 border border-amber-200">
            <h3 className="text-amber-800 font-medium text-lg mb-2">No Cafés Found</h3>
            <p className="text-amber-700 text-sm">
              No cafés match your current filters. Try adjusting your search criteria or removing some filters.
            </p>
          </div>
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
