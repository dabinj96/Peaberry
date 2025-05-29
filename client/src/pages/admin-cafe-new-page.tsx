import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CafeWithDetails, insertCafeSchema } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { ArrowLeft, CheckCircle, Coffee, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CheckboxGroup } from "../components/checkbox-group";
import { toast as toastAction } from "@/hooks/use-toast";
import PlacesAutocomplete from "@/components/places-autocomplete";

// Extend the insert schema with validation rules
const cafeFormSchema = insertCafeSchema.extend({
  area: z.string().min(1, "Neighborhood is required"),
  name: z.string().min(1, "Cafe name is required"),
  address: z.string().min(5, "Address is required"),
  description: z.string().min(10, "Description should be at least 10 characters"),
  latitude: z.string().regex(/^-?\d+(\.\d+)?$/, "Latitude must be a valid number"),
  longitude: z.string().regex(/^-?\d+(\.\d+)?$/, "Longitude must be a valid number"),
});

export type CafeFormValues = z.infer<typeof cafeFormSchema>;

export default function AdminCafeNewPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Form definition
  const form = useForm<CafeFormValues>({
    resolver: zodResolver(cafeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      area: "Boston",
      latitude: "",
      longitude: "",
      priceLevel: 2, // Medium price level by default
      website: "",
      phone: "",
      instagramHandle: "",
      googleMapsUrl: "",
      imageUrl: "",
      status: "draft" as const,
    },
  });

  // Handle address selection from Google Places
  const handleAddressSelect = (
    address: string,
    lat?: number,
    lng?: number,
    area?: string
  ) => {
    form.setValue("address", address);
    if (lat && lng) {
      form.setValue("latitude", lat.toString());
      form.setValue("longitude", lng.toString());
    }
    if (area) {
      form.setValue("area", area);
    }
  };

  // Create cafe mutation
  const createCafeMutation = useMutation({
    mutationFn: async (cafeData: CafeFormValues & { roastLevels?: string[], brewingMethods?: string[] }) => {
      const response = await apiRequest("POST", "/api/admin/cafes", cafeData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create cafe");
      }
      return await response.json();
    },
    onSuccess: (data: CafeWithDetails) => {
      // Invalidate queries and navigate
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cafes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cafes'] });
      
      toast({
        title: "Success!",
        description: `${data.name} has been created successfully.`,
        variant: "default",
      });
      
      // Navigate to the edit page for the new cafe
      navigate(`/admin/cafes/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to create cafe",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: CafeFormValues) => {
    // Get selected roast levels and brewing methods
    const roastLevels = document.querySelectorAll<HTMLInputElement>('input[name="roastLevel"]:checked');
    const brewingMethods = document.querySelectorAll<HTMLInputElement>('input[name="brewingMethod"]:checked');
    
    // Create arrays from the selected values
    const roastLevelValues = Array.from(roastLevels).map(input => input.value);
    const brewingMethodValues = Array.from(brewingMethods).map(input => input.value);
    
    // Add these to the form values
    const cafeData = {
      ...values,
      roastLevels: roastLevelValues,
      brewingMethods: brewingMethodValues,
    };
    
    createCafeMutation.mutate(cafeData);
  };

  return (
    <div className="container my-8 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Add New Cafe</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Cafe Information
          </CardTitle>
          <CardDescription>
            Enter the details for a new cafe. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Cafe name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address *</FormLabel>
                        <FormControl>
                          <PlacesAutocomplete
                            id="address"
                            value={field.value}
                            onChange={(address) => field.onChange(address)}
                            onSelect={handleAddressSelect}
                            placeholder="Enter address"
                          />
                        </FormControl>
                        <FormDescription>
                          Search for an address to automatically fill location details
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 42.3601" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. -71.0589" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Neighborhood *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Back Bay" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priceLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Level</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString() || "2"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select price level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">$ - Inexpensive</SelectItem>
                            <SelectItem value="2">$$ - Moderate</SelectItem>
                            <SelectItem value="3">$$$ - Expensive</SelectItem>
                            <SelectItem value="4">$$$$ - Very Expensive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Additional Info */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the cafe" 
                            className="min-h-[120px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com"
                              value={field.value || ""} 
                              onChange={field.onChange}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="(555) 555-5555"
                              value={field.value || ""} 
                              onChange={field.onChange}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="instagramHandle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instagram</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="@handle"
                              value={field.value || ""} 
                              onChange={field.onChange}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/image.jpg"
                              value={field.value || ""} 
                              onChange={field.onChange}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-4 pt-4">
                    <h3 className="text-lg font-medium">Amenities</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="hasWifi"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>WiFi</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value === true}
                                onCheckedChange={(checked) => field.onChange(checked ? true : null)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Coffee Specifics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Roast Levels</h3>
                  <div className="border rounded-lg p-4">
                    <CheckboxGroup
                      name="roastLevel"
                      items={[
                        { id: "light", label: "Light Roast" },
                        { id: "medium", label: "Medium Roast" },
                        { id: "dark", label: "Dark Roast" }
                      ]}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Brewing Methods</h3>
                  <div className="border rounded-lg p-4">
                    <CheckboxGroup
                      name="brewingMethod"
                      items={[
                        { id: "pour_over", label: "Pour Over" },
                        { id: "espresso", label: "Espresso" },
                        { id: "aeropress", label: "Aeropress" },
                        { id: "french_press", label: "French Press" },
                        { id: "siphon", label: "Siphon" }
                      ]}
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full md:w-auto"
                  disabled={createCafeMutation.isPending}
                >
                  {createCafeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Create Cafe
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}