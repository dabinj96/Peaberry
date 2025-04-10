import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Loader2, 
  Coffee, 
  Save, 
  ArrowLeft, 
  Building, 
  MapPin, 
  Globe, 
  Phone, 
  Instagram, 
  Tag, 
  Wifi, 
  Power, 
  Utensils, 
  Flame
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CafeWithDetails, roastLevelEnum, brewingMethodEnum, cafeStatusEnum } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Define the form schema
const cafeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  address: z.string().min(1, "Address is required"),
  neighborhood: z.string().min(1, "Neighborhood is required"),
  latitude: z.string().min(1, "Latitude is required"),
  longitude: z.string().min(1, "Longitude is required"),
  priceLevel: z.coerce.number().min(1).max(4),
  hasWifi: z.boolean().default(false),
  hasPower: z.boolean().default(false),
  hasFood: z.boolean().default(false),
  imageUrl: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  instagramHandle: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]),
  roastLevels: z.array(z.enum(["light", "medium", "dark"])),
  brewingMethods: z.array(z.enum(["pour_over", "espresso", "aeropress", "french_press", "siphon"])),
});

type CafeFormValues = z.infer<typeof cafeFormSchema>;

export default function AdminCafeEditPage() {
  const params = useParams();
  const cafeId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch cafe details
  const { data: cafe, isLoading } = useQuery<CafeWithDetails>({
    queryKey: [`/api/admin/cafes/${cafeId}`],
    enabled: !isNaN(cafeId) && cafeId > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Form setup
  const form = useForm<CafeFormValues>({
    resolver: zodResolver(cafeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      neighborhood: "",
      latitude: "",
      longitude: "",
      priceLevel: 1,
      hasWifi: false,
      hasPower: false,
      hasFood: false,
      imageUrl: "",
      website: "",
      phone: "",
      instagramHandle: "",
      googleMapsUrl: "",
      status: "draft",
      roastLevels: [],
      brewingMethods: [],
    },
  });

  // Update form when cafe data is loaded
  useEffect(() => {
    if (cafe) {
      const formValues: CafeFormValues = {
        name: cafe.name,
        description: cafe.description || "",
        address: cafe.address,
        neighborhood: cafe.neighborhood,
        latitude: cafe.latitude,
        longitude: cafe.longitude,
        priceLevel: cafe.priceLevel || 1,
        hasWifi: cafe.hasWifi || false,
        hasPower: cafe.hasPower || false,
        hasFood: cafe.hasFood || false,
        imageUrl: cafe.imageUrl || "",
        website: cafe.website || "",
        phone: cafe.phone || "",
        instagramHandle: cafe.instagramHandle || "",
        googleMapsUrl: cafe.googleMapsUrl || "",
        status: cafe.status || "draft",
        roastLevels: cafe.roastLevels as any || [],
        brewingMethods: cafe.brewingMethods as any || [],
      };
      form.reset(formValues);
    }
  }, [cafe, form]);

  const onSubmit = async (data: CafeFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Update cafe basics
      await apiRequest("PUT", `/api/admin/cafes/${cafeId}`, {
        ...data,
        // omit roastLevels and brewingMethods from the main update
        roastLevels: undefined,
        brewingMethods: undefined,
      });
      
      // Update roast levels
      await apiRequest("PUT", `/api/admin/cafes/${cafeId}/roast-levels`, {
        roastLevels: data.roastLevels,
      });
      
      // Update brewing methods
      await apiRequest("PUT", `/api/admin/cafes/${cafeId}/brewing-methods`, {
        brewingMethods: data.brewingMethods,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/admin/cafes/${cafeId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cafes'] });
      
      toast({
        title: "Cafe updated",
        description: "The cafe details have been successfully updated.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating cafe:", error);
      toast({
        title: "Update failed",
        description: "There was an error updating the cafe details.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container my-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cafe) {
    return (
      <div className="container my-8">
        <Card>
          <CardHeader>
            <CardTitle>Cafe not found</CardTitle>
            <CardDescription>The cafe you are looking for does not exist.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/admin">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container my-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Coffee className="h-7 w-7" />
            Edit Cafe
          </h1>
          <p className="text-muted-foreground">Update details and manage cafe information</p>
        </div>
        <Link href="/admin">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </Link>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="specialty">Coffee Specialties</TabsTrigger>
              <TabsTrigger value="features">Features & Amenities</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Edit the basic details of the cafe
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cafe Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Describe the cafe, its atmosphere, and what makes it special." 
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <Input {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="neighborhood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Neighborhood</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <Input {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="priceLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Level</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value.toString()}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select price level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">$ - Inexpensive</SelectItem>
                              <SelectItem value="2">$$ - Moderate</SelectItem>
                              <SelectItem value="3">$$$ - Expensive</SelectItem>
                              <SelectItem value="4">$$$$ - Very Expensive</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Only published cafes will be visible to users
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Contact & Social</CardTitle>
                  <CardDescription>
                    Update contact information and social media links
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <Input {...field} placeholder="https://..." />
                            </div>
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
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <Input {...field} placeholder="+1 (555) 123-4567" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="instagramHandle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instagram</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Instagram className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <Input {...field} placeholder="@cafename" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="googleMapsUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Google Maps URL</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <Input {...field} placeholder="https://maps.google.com/..." />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." />
                        </FormControl>
                        <FormDescription>
                          Provide a URL to a high-quality image of the cafe
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="specialty" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5" />
                    Roast Levels
                  </CardTitle>
                  <CardDescription>
                    Select the roast levels offered at this cafe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="roastLevels"
                    render={() => (
                      <FormItem>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {["light", "medium", "dark"].map((roast) => (
                            <FormField
                              key={roast}
                              control={form.control}
                              name="roastLevels"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={roast}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(roast as any)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, roast])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== roast
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="capitalize">
                                        {roast} Roast
                                      </FormLabel>
                                    </div>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coffee className="h-5 w-5" />
                    Brewing Methods
                  </CardTitle>
                  <CardDescription>
                    Select the brewing methods available at this cafe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="brewingMethods"
                    render={() => (
                      <FormItem>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[
                            { id: "pour_over", label: "Pour Over" },
                            { id: "espresso", label: "Espresso" },
                            { id: "aeropress", label: "AeroPress" },
                            { id: "french_press", label: "French Press" },
                            { id: "siphon", label: "Siphon" },
                          ].map((method) => (
                            <FormField
                              key={method.id}
                              control={form.control}
                              name="brewingMethods"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={method.id}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(method.id as any)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, method.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== method.id
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel>
                                        {method.label}
                                      </FormLabel>
                                    </div>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="features" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Amenities</CardTitle>
                  <CardDescription>
                    Update the available amenities at this cafe
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="hasWifi"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="flex items-center">
                              <Wifi className="mr-2 h-4 w-4" />
                              Wi-Fi Available
                            </FormLabel>
                            <FormDescription>
                              Free WiFi for customers
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="hasPower"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="flex items-center">
                              <Power className="mr-2 h-4 w-4" />
                              Power Outlets
                            </FormLabel>
                            <FormDescription>
                              Accessible power outlets for customers
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="hasFood"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="flex items-center">
                              <Utensils className="mr-2 h-4 w-4" />
                              Food Available
                            </FormLabel>
                            <FormDescription>
                              Food options beyond pastries
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}