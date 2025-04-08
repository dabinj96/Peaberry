import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CafeWithDetails, insertRatingSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Star, Heart } from "lucide-react";
import { formatBrewingMethod, formatPriceLevel, formatRoastLevel } from "@/lib/utils";
import RatingInput from "@/components/rating-input";
import CafeMap from "@/components/cafe-map";

export default function CafeDetailPage() {
  const [, params] = useRoute("/cafe/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const cafeId = params?.id ? parseInt(params.id, 10) : 0;
  const [activeTab, setActiveTab] = useState("details");
  const [userRating, setUserRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");

  // Fetch cafe details
  const { data: cafe, isLoading: isLoadingCafe } = useQuery<CafeWithDetails>({
    queryKey: ["/api/cafes", cafeId],
    queryFn: async () => {
      const res = await fetch(`/api/cafes/${cafeId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch cafe details");
      }
      return res.json();
    },
    enabled: !!cafeId,
  });

  // Fetch user's existing rating for this cafe if logged in
  const { data: existingRating } = useQuery({
    queryKey: ["/api/user/ratings", cafeId],
    queryFn: async () => {
      const res = await fetch(`/api/user/ratings?cafeId=${cafeId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch user rating");
      }
      return res.json();
    },
    enabled: !!user && !!cafeId,
    onSuccess: (data) => {
      if (data) {
        setUserRating(data.rating);
        setReviewText(data.review || "");
      }
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      if (cafe?.isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${cafeId}`);
      } else {
        await apiRequest("POST", "/api/favorites", { cafeId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cafes", cafeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      
      toast({
        title: cafe?.isFavorite ? "Removed from favorites" : "Added to favorites",
        description: cafe?.isFavorite
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

  // Submit rating mutation
  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      if (!userRating) {
        throw new Error("Please select a rating");
      }

      const ratingData = {
        rating: userRating,
        review: reviewText,
      };

      const validationResult = insertRatingSchema
        .omit({ userId: true, cafeId: true })
        .safeParse(ratingData);

      if (!validationResult.success) {
        throw new Error("Invalid rating data");
      }

      await apiRequest("POST", `/api/cafes/${cafeId}/ratings`, ratingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cafes", cafeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/ratings", cafeId] });
      
      toast({
        title: "Rating submitted",
        description: "Thank you for rating this café!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to submit rating: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  if (isLoadingCafe) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#A0522D]" />
      </div>
    );
  }

  if (!cafe) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-serif font-bold text-[#8B4513] mb-4">Café Not Found</h1>
          <p className="text-gray-600 mb-6">The café you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/")} className="bg-[#A0522D] hover:bg-[#8B4513]">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Hero section with cafe image */}
      <div className="relative h-80 rounded-xl overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
        <img
          src={cafe.imageUrl || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085"}
          alt={cafe.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 p-6 z-20">
          <h1 className="text-4xl font-serif font-bold text-white mb-2">{cafe.name}</h1>
          <div className="flex items-center gap-4 text-white">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{cafe.neighborhood}</span>
            </div>
            <div className="flex items-center">
              <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
              <span>{cafe.averageRating?.toFixed(1) || "No ratings"} ({cafe.totalRatings || 0})</span>
            </div>
            <div>{formatPriceLevel(cafe.priceLevel)}</div>
          </div>
        </div>
        <div className="absolute top-4 right-4 z-20">
          <Button 
            variant="outline" 
            size="icon" 
            className={`rounded-full bg-white ${cafe.isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
            onClick={() => toggleFavoriteMutation.mutate()}
            disabled={toggleFavoriteMutation.isPending}
          >
            <Heart className={`h-5 w-5 ${cafe.isFavorite ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Cafe details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="map">Map</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-serif font-bold text-[#8B4513] mb-3">About this café</h2>
                  <p className="text-gray-700 mb-6">{cafe.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Roast Levels</h3>
                      <div className="flex flex-wrap gap-2">
                        {cafe.roastLevels.map((roast) => (
                          <span 
                            key={roast} 
                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                          >
                            {formatRoastLevel(roast)}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Brewing Methods</h3>
                      <div className="flex flex-wrap gap-2">
                        {cafe.brewingMethods.map((method) => (
                          <span 
                            key={method} 
                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                          >
                            {formatBrewingMethod(method)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t my-6"></div>
                  
                  <h3 className="text-lg font-semibold mb-3">Amenities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-2 ${cafe.hasWifi ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-gray-700">WiFi</span>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-2 ${cafe.hasPower ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-gray-700">Power Outlets</span>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-2 ${cafe.hasFood ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-gray-700">Food Options</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="map">
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-serif font-bold text-[#8B4513] mb-3">Location</h2>
                  <p className="text-gray-700 mb-4">{cafe.address}</p>
                  <div className="h-[400px] rounded-md overflow-hidden">
                    <CafeMap cafes={[cafe]} isLoading={false} singleLocation />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reviews">
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-serif font-bold text-[#8B4513] mb-3">Reviews & Ratings</h2>
                  <div className="flex items-center gap-2 mb-6">
                    <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                    <span className="text-2xl font-bold">{cafe.averageRating?.toFixed(1) || "0.0"}</span>
                    <span className="text-gray-500">({cafe.totalRatings || 0} ratings)</span>
                  </div>
                  
                  {/* Add your review section */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h3 className="text-lg font-semibold mb-3">
                      {existingRating ? "Update your rating" : "Add your rating"}
                    </h3>
                    {user ? (
                      <div>
                        <div className="mb-4">
                          <RatingInput 
                            rating={userRating || 0}
                            onChange={setUserRating}
                          />
                        </div>
                        <div className="mb-4">
                          <textarea
                            placeholder="Share your experience (optional)"
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#A0522D]"
                          />
                        </div>
                        <Button 
                          onClick={() => submitRatingMutation.mutate()}
                          disabled={!userRating || submitRatingMutation.isPending}
                          className="bg-[#A0522D] hover:bg-[#8B4513]"
                        >
                          {submitRatingMutation.isPending ? "Submitting..." : "Submit Rating"}
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <p className="mb-3 text-gray-600">Please login to leave a rating.</p>
                        <Button onClick={() => navigate("/auth")} className="bg-[#A0522D] hover:bg-[#8B4513]">
                          Login to Rate
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* TODO: Add reviews list here when implemented */}
                  <p className="text-gray-500 text-center py-4">
                    Rating data is being collected. Reviews will be displayed here soon.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div>
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-serif font-bold text-[#8B4513] mb-3">Contact & Hours</h2>
              <p className="text-gray-700 mb-6">
                <span className="block font-semibold">Address:</span>
                {cafe.address}
              </p>
              
              {/* Placeholder for hours */}
              <div className="space-y-2">
                <h3 className="font-semibold">Hours</h3>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monday - Friday</span>
                  <span>7:00 AM - 7:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Saturday</span>
                  <span>8:00 AM - 8:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sunday</span>
                  <span>8:00 AM - 6:00 PM</span>
                </div>
              </div>
              
              <div className="mt-6">
                <Button className="w-full bg-[#A0522D] hover:bg-[#8B4513]">
                  Get Directions
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardContent className="pt-6">
              <h2 className="text-xl font-serif font-bold text-[#8B4513] mb-3">Similar Cafés</h2>
              <p className="text-gray-500 text-center py-4">
                Similar cafés feature coming soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
