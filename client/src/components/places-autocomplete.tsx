import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { GOOGLE_MAPS_API_KEY } from "@/lib/utils";

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (address: string, lat?: number, lng?: number, area?: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

export default function PlacesAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Enter a location",
  id = "location-input",
  className = "",
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const { toast } = useToast();
  
  // Load Google Maps JavaScript API with Places library
  useEffect(() => {
    if (!window.google && !document.querySelector('#google-maps-script')) {
      if (!GOOGLE_MAPS_API_KEY) {
        toast({
          title: "API Key Missing",
          description: "Google Maps API key is not configured. Autocomplete will not work.",
          variant: "destructive",
        });
        return;
      }
      
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {

        setScriptLoaded(true);
      };
      script.onerror = () => {
        console.error("Error loading Google Maps Places API");
        toast({
          title: "API Loading Error",
          description: "Could not load Google Maps API. Please check your connection and API key.",
          variant: "destructive",
        });
      };
      
      document.head.appendChild(script);
    } else if (window.google) {
      setScriptLoaded(true);
    }
  }, [toast]);
  
  // Initialize Places Autocomplete once script is loaded
  useEffect(() => {
    if (scriptLoaded && inputRef.current) {
      try {
        const options = {
          types: ['(cities)'], // Restrict to cities only
          componentRestrictions: { country: "us" }, // Restrict to US
        };
        
        const autocomplete = new window.google.maps.places.Autocomplete(
          inputRef.current,
          options
        );
        
        // Listen for place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.formatted_address) {
            onChange(place.formatted_address);
            
            // Call onSelect if provided
            if (onSelect && place.geometry?.location) {
              // Extract latitude and longitude
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              
              // Extract area from address components if available
              let area = "";
              if (place.address_components) {
                // Look for the area component
                const areaComponent = place.address_components.find(
                  (component: any) => component.types.includes('area')
                );
                
                // Look for sublocality if area is not found
                const sublocalityComponent = place.address_components.find(
                  (component: any) => component.types.includes('sublocality')
                );
                
                // Look for locality if neither area nor sublocality is found
                const localityComponent = place.address_components.find(
                  (component: any) => component.types.includes('locality')
                );
                
                area = areaComponent ? areaComponent.long_name :
                              sublocalityComponent ? sublocalityComponent.long_name :
                              localityComponent ? localityComponent.long_name : "";
              }
              
              onSelect(place.formatted_address, lat, lng, area);
            }
          }
        });
        
        // Cleanup
        return () => {
          // Remove event listeners from autocomplete instance
          if (google && google.maps && google.maps.event) {
            google.maps.event.clearInstanceListeners(autocomplete);
          }
        };
      } catch (error) {
        console.error("Error initializing Places Autocomplete:", error);
      }
    }
  }, [scriptLoaded, onChange, onSelect]);
  
  return (
    <Input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      id={id}
      className={className}
      autoComplete="off" // Prevent browser autocomplete interfering with Google's
    />
  );
}

// Add types for Google Maps API
declare global {
  interface Window {
    google: typeof google;
  }
  
  namespace google.maps {
    namespace event {
      function clearInstanceListeners(instance: any): void;
    }
    
    namespace places {
      class Autocomplete {
        constructor(inputField: HTMLInputElement, options?: google.maps.places.AutocompleteOptions);
        addListener(eventName: string, handler: Function): void;
        getPlace(): google.maps.places.PlaceResult;
      }
      
      interface AutocompleteOptions {
        types?: string[];
        componentRestrictions?: {
          country: string | string[];
        };
      }
      
      interface PlaceResult {
        formatted_address?: string;
        geometry?: {
          location: google.maps.LatLng;
        };
        name?: string;
        place_id?: string;
        address_components?: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
      }
    }
  }
}