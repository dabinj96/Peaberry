import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Database, MapPin } from "lucide-react";
import { useState } from "react";

export default function AdminPage() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [location, setLocation] = useState("Boston, MA");

  const importCafes = async () => {
    setIsImporting(true);
    setImportResults(null);
    
    try {
      const response = await apiRequest("POST", "/api/admin/import-cafes", { 
        location 
      });
      
      const results = await response.json();
      setImportResults(results);
      
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

  return (
    <div className="container my-8 space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="text-muted-foreground">Import cafe data from Google Places API and manage application settings.</p>
      
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
                  <Input 
                    id="location" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
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
    </div>
  );
}