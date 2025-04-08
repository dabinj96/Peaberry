import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { CafeWithDetails } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import CafeCard from "@/components/cafe-card";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("favorites");

  // Fetch user favorites
  const { data: favorites = [], isLoading: isLoadingFavorites } = useQuery<CafeWithDetails[]>({
    queryKey: ["/api/favorites"],
    queryFn: async () => {
      const res = await fetch("/api/favorites");
      if (!res.ok) {
        throw new Error("Failed to fetch favorites");
      }
      return res.json();
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt={user.name} />
                    <AvatarFallback className="text-lg">{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold">{user.name}</h2>
                  <p className="text-gray-500">@{user.username}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p>{user.email}</p>
                  </div>
                  
                  {user.bio && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Bio</h3>
                      <p>{user.bio}</p>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Member Since</h3>
                    <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <Button 
                    onClick={handleLogout} 
                    variant="outline" 
                    className="w-full"
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? "Logging out..." : "Log Out"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="favorites">Favorites</TabsTrigger>
                <TabsTrigger value="ratings">My Ratings</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="favorites">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Favorite Cafés</CardTitle>
                    <CardDescription>
                      Cafés you've saved to visit again.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingFavorites ? (
                      <div className="py-12 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-border" />
                      </div>
                    ) : favorites.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-gray-500 mb-4">You haven't saved any cafés yet.</p>
                        <Button className="bg-[#A0522D] hover:bg-[#8B4513]" asChild>
                          <a href="/">Discover Cafés</a>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {favorites.map((cafe) => (
                          <CafeCard key={cafe.id} cafe={cafe} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ratings">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Ratings & Reviews</CardTitle>
                    <CardDescription>
                      Cafés you've rated and reviewed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="py-12 text-center">
                      <p className="text-gray-500">Your ratings will appear here once you start rating cafés.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>
                      Manage your account preferences.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="py-12 text-center">
                      <p className="text-gray-500">Account settings will be available in a future update.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
