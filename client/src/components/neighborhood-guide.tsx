import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CafeWithDetails } from "@shared/schema";
import { Map } from "lucide-react";

interface NeighborhoodCount {
  name: string;
  count: number;
  image: string;
}

// Sample images for areas
const areaImages: Record<string, string> = {
  "Downtown": "https://images.unsplash.com/photo-1574236170880-71d4d6a2b7c0",
  "Back Bay": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3",
  "South End": "https://images.unsplash.com/photo-1594759877531-9f7b3c12c3c7",
  "Cambridge": "https://images.unsplash.com/photo-1524094793892-da2e74e42382",
  "Somerville": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
  "North End": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
  // Default image for any other areas
  "default": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb"
};

export default function NeighborhoodGuide() {
  // Get cafes and count by area
  const { data: cafes = [] } = useQuery<CafeWithDetails[]>({
    queryKey: ["/api/cafes"],
    queryFn: async () => {
      const res = await fetch("/api/cafes");
      if (!res.ok) {
        throw new Error("Failed to fetch cafes");
      }
      return res.json();
    }
  });

  // Calculate area counts
  const areaCounts = cafes.reduce((acc: Record<string, number>, cafe) => {
    const area = cafe.area;
    if (!acc[area]) {
      acc[area] = 0;
    }
    acc[area]++;
    return acc;
  }, {});

  // Convert to array and sort by count
  const areaData: NeighborhoodCount[] = Object.entries(areaCounts)
    .map(([name, count]) => ({
      name,
      count,
      image: areaImages[name] || areaImages.default
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Get top 5 areas

  if (areaData.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <h2 className="font-serif text-2xl font-bold mb-6 text-[#8B4513]">Boston Coffee Neighborhoods</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {areaData.map(area => (
          <Link 
            key={area.name} 
            href={`/?area=${encodeURIComponent(area.name)}`}
            className="block relative rounded-lg overflow-hidden h-48 group cursor-pointer"
          >
            <img 
              src={area.image} 
              alt={area.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-4 text-white">
              <h3 className="font-serif font-bold text-xl mb-1">{area.name}</h3>
              <p className="text-sm">{area.count} specialty cafés</p>
            </div>
          </Link>
        ))}
        
        <div className="flex flex-col items-center justify-center rounded-lg bg-[#FAEBD7] h-48 group hover:bg-[#A0522D] transition-colors">
          <Map className="h-10 w-10 text-[#A0522D] group-hover:text-white mb-3 transition-colors" />
          <h3 className="font-serif font-bold text-xl text-[#A0522D] group-hover:text-white transition-colors">
            View All Neighborhoods
          </h3>
        </div>
      </div>
    </section>
  );
}
