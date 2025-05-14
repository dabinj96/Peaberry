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
  sellsCoffeeBeans: z.boolean().default(false),
  imageUrl: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  instagramHandle: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]),
  roastLevels: z.array(z.enum(["light", "light_medium", "medium", "medium_dark", "dark", "extra_dark"])),
  brewingMethods: z.array(z.enum(["espresso_based", "pour_over", "siphon", "mixed_drinks", "nitro", "cold_brew"])),
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
  
  // Form setup with debug mode and better error handling
  const form = useForm<CafeFormValues>({
    resolver: zodResolver(cafeFormSchema),
    mode: "onSubmit",
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
      sellsCoffeeBeans: false,
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
  
  // We replace this with the more efficient preventUndefinedText function below

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
        sellsCoffeeBeans: cafe.sellsCoffeeBeans || false,
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

  // Create a wrapper that prevents "undefined" text from showing
  const preventUndefinedText = () => {
    // Find any element with text content of just "undefined" and clear it
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      if (el.childNodes && el.childNodes.length === 1 && 
          el.childNodes[0].nodeType === Node.TEXT_NODE &&
          el.childNodes[0].textContent === 'undefined') {
        el.childNodes[0].textContent = '';
      }
    });
  };
  
  // Run our fix every 300ms
  useEffect(() => {
    const interval = setInterval(preventUndefinedText, 300);
    return () => clearInterval(interval);
  }, []);
  
  const onSubmit = async (data: CafeFormValues) => {
    setIsSubmitting(true);
    
    // Immediately clean up any "undefined" text that might appear
    preventUndefinedText();
    // And run it again after a short delay
    setTimeout(preventUndefinedText, 50);
    
    try {
      // Extract just what we need for main update with safe defaults
      const cafeUpdate = {
        name: data.name || '',
        description: data.description || '',
        address: data.address || '',
        neighborhood: data.neighborhood || '',
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        priceLevel: data.priceLevel || 1,
        hasWifi: Boolean(data.hasWifi),
        hasPower: Boolean(data.hasPower),
        hasFood: Boolean(data.hasFood),
        sellsCoffeeBeans: Boolean(data.sellsCoffeeBeans),
        imageUrl: data.imageUrl || '',
        website: data.website || '',
        phone: data.phone || '',
        instagramHandle: data.instagramHandle || '',
        googleMapsUrl: data.googleMapsUrl || '',
        status: data.status || 'draft'
      };
      
      // Update cafe basics
      await apiRequest("PUT", `/api/admin/cafes/${cafeId}`, cafeUpdate);
      
      // Ensure roast levels is always a valid array
      const roastLevels = Array.isArray(data.roastLevels) ? data.roastLevels : [];
      await apiRequest("PUT", `/api/admin/cafes/${cafeId}/roast-levels`, {
        roastLevels
      });
      
      // Ensure brewing methods is always a valid array
      const brewingMethods = Array.isArray(data.brewingMethods) ? data.brewingMethods : [];
      await apiRequest("PUT", `/api/admin/cafes/${cafeId}/brewing-methods`, {
        brewingMethods
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/admin/cafes/${cafeId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cafes'] });
      
      // Clear any "undefined" text that might appear after success
      setTimeout(() => {
        preventUndefinedText();
        // Find any elements with text "undefined" and hide them 
        document.querySelectorAll("*").forEach(el => {
          if (el.textContent?.trim() === "undefined") {
            (el as HTMLElement).style.display = "none";
          }
        });
      }, 10);
      
      // Display success message
      toast({
        title: "Cafe updated",
        description: "The cafe details have been successfully updated.",
        variant: "default",
      });
    } catch (error: any) {
      // Better error handling
      console.error("Error updating cafe:", error);
      
      let errorMessage = "There was an error updating the cafe details.";
      if (error?.message) {
        errorMessage += ` Error: ${error.message}`;
      }
      
      toast({
        title: "Update failed",
        description: errorMessage,
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
              {/* Hide any accidental debug text - especially "undefined" */}
              <style>{`
                .coffee-specialties-tab .card-content > *:not(.form-field) {
                  display: none !important;
                }
                /* Specifically target any text of "undefined" */
                .coffee-specialties-tab:after {
                  content: "";
                  display: block;
                  clear: both;
                }
              `}</style>
              {/* This is a catch-all component to trap and hide any "undefined" text */}
              <div className="undefined-catcher" 
                   style={{ height: 0, overflow: 'hidden', visibility: 'hidden' }}>
                undefined
              </div>
              <div className="coffee-specialties-tab" 
                   onClick={() => setTimeout(preventUndefinedText, 10)}>
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
                  <CardContent className="card-content">
                    <FormField
                      control={form.control}
                      name="roastLevels"
                      render={() => (
                        <FormItem className="form-field">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                              { id: "light", label: "Light Roast" },
                              { id: "light_medium", label: "Light-Medium Roast" },
                              { id: "medium", label: "Medium Roast" },
                              { id: "medium_dark", label: "Medium-Dark Roast" },
                              { id: "dark", label: "Dark Roast" },
                              { id: "extra_dark", label: "Extra-Dark Roast" }
                            ].map((roast) => (
                              <FormField
                                key={roast.id}
                                control={form.control}
                                name="roastLevels"
                                render={({ field }) => {
                                  // Type safety by casting roast.id
                                  const typedRoastId = roast.id as "light" | "light_medium" | "medium" | "medium_dark" | "dark" | "extra_dark";
                                  return (
                                    <FormItem
                                      key={roast.id}
                                      className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={Array.isArray(field.value) && field.value.includes(typedRoastId)}
                                          onCheckedChange={(checked) => {
                                            const currentValues = Array.isArray(field.value) ? field.value : [];
                                            return checked
                                              ? field.onChange([...currentValues, typedRoastId])
                                              : field.onChange(
                                                  currentValues.filter(
                                                    (value) => value !== typedRoastId
                                                  )
                                                );
                                          }}
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel>
                                          {roast.label}
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
                      <Tag className="h-5 w-5" />
                      Sells Coffee Beans
                    </CardTitle>
                    <CardDescription>
                      Does this cafe sell coffee beans to customers?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="card-content">
                    <FormField
                      control={form.control}
                      name="sellsCoffeeBeans"
                      render={({ field }) => (
                        <FormItem className="form-field flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value === true}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Yes, this cafe sells coffee beans
                            </FormLabel>
                            <FormDescription>
                              Customers can purchase coffee beans to brew at home
                            </FormDescription>
                          </div>
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
                  <CardContent className="card-content">
                    <FormField
                      control={form.control}
                      name="brewingMethods"
                      render={() => (
                        <FormItem className="form-field">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                              { id: "espresso_based", label: "Espresso-based" },
                              { id: "pour_over", label: "Pour Over" },
                              { id: "siphon", label: "Siphon" },
                              { id: "mixed_drinks", label: "Mixed Drinks" },
                              { id: "nitro", label: "Nitro" },
                              { id: "cold_brew", label: "Cold Brew" },
                            ].map((method) => (
                              <FormField
                                key={method.id}
                                control={form.control}
                                name="brewingMethods"
                                render={({ field }) => {
                                  // Type safety by casting method.id
                                  const typedMethodId = method.id as "espresso_based" | "pour_over" | "siphon" | "mixed_drinks" | "nitro" | "cold_brew";
                                  return (
                                    <FormItem
                                      key={method.id}
                                      className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={Array.isArray(field.value) && field.value.includes(typedMethodId)}
                                          onCheckedChange={(checked) => {
                                            const currentValues = Array.isArray(field.value) ? field.value : [];
                                            return checked
                                              ? field.onChange([...currentValues, typedMethodId])
                                              : field.onChange(
                                                  currentValues.filter(
                                                    (value) => value !== typedMethodId
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
              </div>
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
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full md:w-auto"
              onClick={() => {
                // Immediately find and remove any text nodes with just "undefined"
                setTimeout(() => {
                  document.querySelectorAll('*').forEach(el => {
                    if (el.childNodes && el.childNodes.length === 1 && 
                        el.childNodes[0].nodeType === Node.TEXT_NODE &&
                        el.childNodes[0].textContent?.trim() === 'undefined') {
                      el.childNodes[0].textContent = '';
                    }
                  });
                }, 10);
              }}
            >
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