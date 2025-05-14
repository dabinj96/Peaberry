import { useState } from "react";
import { Link } from "wouter";
import { CafeWithDetails } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Heart, MapPin, Star } from "lucide-react";
import { formatBrewingMethod, formatDistance, formatRoastLevel } from "@/lib/utils";

interface CafeCardProps {
  cafe: CafeWithDetails;
  distance?: number;  // Distance in kilometers
  distanceUnit?: 'mi' | 'km';  // Unit to display distance in
}

export default function CafeCard({ cafe, distance, distanceUnit = 'mi' }: CafeCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isHovering, setIsHovering] = useState(false);

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!user) {
        return;
      }

      if (cafe.isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${cafe.id}`);
      } else {
        await apiRequest("POST", "/api/favorites", { cafeId: cafe.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cafes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      
      toast({
        title: cafe.isFavorite ? "Removed from favorites" : "Added to favorites",
        description: cafe.isFavorite
          ? `${cafe.name} has been removed from your favorites.`
          : `${cafe.name} has been added to your favorites.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update favorites: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Link href={`/cafe/${cafe.id}`}>
        <div className="relative h-48">
          <img 
            src={cafe.imageUrl || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80"} 
            alt={cafe.name} 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-sm">
            <Heart 
              className={`h-5 w-5 ${cafe.isFavorite ? 'text-red-500' : 'text-gray-400'} ${isHovering ? 'hover:text-red-500' : ''} cursor-pointer ${cafe.isFavorite ? 'fill-current' : ''}`}
              onClick={(e) => toggleFavoriteMutation.mutate(e)}
            />
          </div>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-serif font-bold text-lg text-[#8B4513]">{cafe.name}</h3>
            <div className="flex items-center bg-[#FAEBD7] text-[#8B4513] rounded-full px-2 py-0.5 text-sm">
              <Star className="h-3.5 w-3.5 mr-1 fill-amber-500 text-amber-500" />
              <span>{cafe.averageRating?.toFixed(1) || "N/A"}</span>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-2 flex items-center">
            <MapPin className="h-3.5 w-3.5 mr-1" />
            {cafe.neighborhood}
          </p>
          <div className="flex flex-wrap gap-1 mb-3">
            {cafe.roastLevels.map((level) => (
              <span key={level} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                {formatRoastLevel(level)}
              </span>
            ))}
            {cafe.brewingMethods.slice(0, 2).map((method) => (
              <span key={method} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                {formatBrewingMethod(method)}
              </span>
            ))}
            {cafe.brewingMethods.length > 2 && (
              <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                +{cafe.brewingMethods.length - 2} more
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            <span className="flex items-center">
              <MapPin className="h-3.5 w-3.5 mr-1" /> 
              {formatDistance(distance, distanceUnit)}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
