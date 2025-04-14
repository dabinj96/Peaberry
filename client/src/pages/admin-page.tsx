import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PlacesAutocomplete from "@/components/places-autocomplete";
import UserManagement from "@/components/admin/user-management";
import { 
  Loader2, 
  Database, 
  MapPin, 
  Coffee, 
  Edit, 
  Trash2, 
  Tag, 
  Check, 
  Archive, 
  Search,
  Wifi,
  Power,
  Utensils,
  Plus
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CafeWithDetails } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function AdminPage() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [location, setLocation] = useState("Boston, MA");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published" | "archived">("all");

  // Fetch all cafes for the admin panel
  const { data: cafes = [], isLoading: isCafesLoading } = useQuery<CafeWithDetails[]>({
    queryKey: ['/api/admin/cafes'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filter cafes based on search term and status
  const filteredCafes = cafes.filter(cafe => {
    const matchesSearch = searchTerm === "" || 
      cafe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cafe.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cafe.neighborhood.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || cafe.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const importCafes = async () => {
    setIsImporting(true);
    setImportResults(null);
    
    try {
      const response = await apiRequest("POST", "/api/admin/import-cafes", { 
        location 
      });
      
      const results = await response.json();
      setImportResults(results);
      
      // Invalidate the cafe list cache to reload with new data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cafes'] });
      
      toast({
        title: "Import completed",
        description: `Successfully imported ${results.imported} cafes out of ${results.total}`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error importing cafes:", error);
      toast({
        title: "Import failed",
        description: "There was an error importing cafes. Please check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const createTestUser = async () => {
    try {
      const response = await apiRequest("GET", "/api/dev/create-test-user");
      const result = await response.json();
      
      toast({
        title: "Test User",
        description: result.message,
        variant: "default",
      });
    } catch (error) {
      console.error("Error creating test user:", error);
      toast({
        title: "Failed to create test user",
        description: "An error occurred while creating the test user.",
        variant: "destructive",
      });
    }
  };

  const updateCafeStatus = async (cafeId: number, status: 'draft' | 'published' | 'archived') => {
    try {
      await apiRequest("PATCH", `/api/admin/cafes/${cafeId}`, { status });
      
      // Invalidate the cafe list cache to reload with new data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cafes'] });
      
      toast({
        title: "Status updated",
        description: `Cafe status has been changed to ${status}`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating cafe status:", error);
      toast({
        title: "Status update failed",
        description: "There was an error updating the cafe status.",
        variant: "destructive",
      });
    }
  };
  
  const deleteCafe = async (cafeId: number, cafeName: string) => {
    // Show confirmation dialog
    if (!window.confirm(`Are you sure you want to permanently delete "${cafeName}"? This action cannot be undone and will remove all associated data including ratings and favorites.`)) {
      return;
    }
    
    try {
      await apiRequest("DELETE", `/api/admin/cafes/${cafeId}`);
      
      // Invalidate the cafe list cache to reload with new data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cafes'] });
      
      toast({
        title: "Cafe deleted",
        description: `${cafeName} has been permanently deleted`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting cafe:", error);
      toast({
        title: "Deletion failed",
        description: "There was an error permanently deleting the cafe.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container my-8 space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="text-muted-foreground">Import cafe data from Google Places API and manage your application's content.</p>
      
      <Tabs defaultValue="cafes">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import">Import & Settings</TabsTrigger>
          <TabsTrigger value="cafes">Manage Cafes</TabsTrigger>
          <TabsTrigger value="users">Manage Users</TabsTrigger>
        </TabsList>
        
        <TabsContent value="import" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Import Cafes
                </CardTitle>
                <CardDescription>
                  Import specialty coffee shop data from Google Places API to populate your application.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="flex gap-2">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <PlacesAutocomplete 
                        id="location" 
                        value={location} 
                        onChange={setLocation} 
                        placeholder="City, State or Zipcode"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">Enter a location to search for specialty coffee shops.</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={createTestUser}>
                  Create Test User
                </Button>
                <Button 
                  onClick={importCafes} 
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : "Import Cafes"}
                </Button>
              </CardFooter>
            </Card>

            {importResults && (
              <Card>
                <CardHeader>
                  <CardTitle>Import Results</CardTitle>
                  <CardDescription>
                    Successfully imported {importResults.imported} of {importResults.total} cafes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total cafes found:</span>
                      <span className="font-medium">{importResults.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Successfully imported:</span>
                      <span className="font-medium">{importResults.imported}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Failed to import:</span>
                      <span className="font-medium">{importResults.errors?.length || 0}</span>
                    </div>
                  </div>
                  
                  {importResults.errors?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Errors:</h4>
                      <div className="bg-muted p-2 rounded-md max-h-40 overflow-y-auto text-sm">
                        {importResults.errors.map((error: string, idx: number) => (
                          <p key={idx} className="mb-1">{error}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="cafes" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Coffee className="h-5 w-5" />
                    Cafe Management
                  </CardTitle>
                  <CardDescription>
                    Manage, edit, and curate cafe listings. Review cafes before publishing them to the live site.
                  </CardDescription>
                </div>
                
                <Link href="/admin/cafes/new">
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add New Cafe
                  </Button>
                </Link>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search cafes..." 
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant={statusFilter === "all" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                  >
                    All
                  </Button>
                  <Button 
                    variant={statusFilter === "draft" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setStatusFilter("draft")}
                  >
                    Draft
                  </Button>
                  <Button 
                    variant={statusFilter === "published" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setStatusFilter("published")}
                  >
                    Published
                  </Button>
                  <Button 
                    variant={statusFilter === "archived" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setStatusFilter("archived")}
                  >
                    Archived
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isCafesLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCafes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Coffee className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No cafes found. Try adjusting your filters or import some cafes.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cafe Name</TableHead>
                        <TableHead>Neighborhood</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Features</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCafes.map((cafe) => (
                        <TableRow key={cafe.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{cafe.name}</span>
                              <span className="text-sm text-muted-foreground truncate max-w-[250px]">
                                {cafe.address}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{cafe.neighborhood}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                cafe.status === "published" ? "default" :
                                cafe.status === "draft" ? "secondary" :
                                "destructive"
                              }
                            >
                              {cafe.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {cafe.hasWifi && 
                                <span title="WiFi Available">
                                  <Wifi className="h-4 w-4 text-muted-foreground" />
                                </span>
                              }
                              {cafe.hasPower &&
                                <span title="Power Outlets">
                                  <Power className="h-4 w-4 text-muted-foreground" />
                                </span>
                              }
                              {cafe.hasFood &&
                                <span title="Food Available">
                                  <Utensils className="h-4 w-4 text-muted-foreground" />
                                </span>
                              }
                              <div className="flex">
                                <Tag className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs ml-1">{cafe.roastLevels.length || 0} / {cafe.brewingMethods.length || 0}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center space-x-2">
                              <Link href={`/admin/cafes/${cafe.id}`}>
                                <Button variant="outline" size="icon" title="Edit Cafe">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              
                              {cafe.status !== "published" && (
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  title="Publish"
                                  onClick={() => updateCafeStatus(cafe.id, "published")}
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              
                              {cafe.status !== "draft" && (
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  title="Set as Draft"
                                  onClick={() => updateCafeStatus(cafe.id, "draft")}
                                >
                                  <Edit className="h-4 w-4 text-amber-600" />
                                </Button>
                              )}
                              
                              {cafe.status !== "archived" && (
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  title="Archive"
                                  onClick={() => updateCafeStatus(cafe.id, "archived")}
                                >
                                  <Archive className="h-4 w-4 text-red-600" />
                                </Button>
                              )}
                              
                              {/* Permanent Delete button */}
                              <Button 
                                variant="outline" 
                                size="icon"
                                title="Permanently Delete"
                                onClick={() => deleteCafe(cafe.id, cafe.name)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Total: {filteredCafes.length} cafes
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}