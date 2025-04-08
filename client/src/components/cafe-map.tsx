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

declare global {
  interface Window {
    google: any;
    initMap: () => void;
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
      // Create script element
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      // Define the callback
      window.initMap = () => {
        setMapLoaded(true);
      };
      
      // Handle errors
      script.onerror = () => {
        toast({
          title: "Map Loading Error",
          description: "Failed to load Google Maps. Please try again later.",
          variant: "destructive",
        });
      };
      
      document.head.appendChild(script);
      
      return () => {
        // Cleanup
        window.initMap = () => {};
        document.head.removeChild(script);
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
              const content = `
                <div class="p-2">
                  <h3 class="font-semibold">${cafe.name}</h3>
                  <p class="text-sm">${cafe.neighborhood}</p>
                  <a 
                    href="/cafe/${cafe.id}" 
                    class="text-sm text-[#A0522D] hover:underline block mt-1"
                  >
                    View Details
                  </a>
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
