import { useQuery } from "@tanstack/react-query";
import { CafeWithDetails } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { Link } from "wouter";

export default function FeaturedCafes() {
  // Fetch cafes for featured section (filtered to the top 3 highest rated)
  const { data: cafes = [] } = useQuery<CafeWithDetails[]>({
    queryKey: ["/api/cafes", { featured: true }],
    queryFn: async () => {
      const res = await fetch("/api/cafes");
      if (!res.ok) {
        throw new Error("Failed to fetch cafes");
      }
      
      // Get all cafes and sort by rating
      const allCafes = await res.json();
      return allCafes
        .filter((cafe: CafeWithDetails) => cafe.averageRating && cafe.averageRating > 0)
        .sort((a: CafeWithDetails, b: CafeWithDetails) => 
          (b.averageRating || 0) - (a.averageRating || 0)
        )
        .slice(0, 3);
    }
  });

  if (cafes.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      <h2 className="font-serif text-2xl font-bold mb-6 text-[#8B4513]">Featured Cafés</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cafes.map(cafe => (
          <Card key={cafe.id} className="overflow-hidden">
            <Link href={`/cafe/${cafe.id}`}>
              <div className="relative h-40">
                <img 
                  src={cafe.imageUrl || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085"} 
                  alt={cafe.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-4 text-white">
                  <span className="bg-[#FF8C00] px-2 py-1 text-xs rounded-full mb-2 inline-block">Featured</span>
                  <h3 className="font-serif font-bold text-lg">{cafe.name}</h3>
                </div>
              </div>
            </Link>
            <CardContent className="p-4">
              <div className="flex items-center mb-2">
                <div className="flex mr-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-4 w-4 ${i < Math.round(cafe.averageRating || 0) ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {cafe.averageRating?.toFixed(1)} ({cafe.totalRatings} ratings)
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{cafe.description.substring(0, 100)}...</p>
              <Link href={`/cafe/${cafe.id}`} className="text-[#A0522D] hover:text-[#8B4513] font-medium text-sm flex items-center">
                View Details 
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
