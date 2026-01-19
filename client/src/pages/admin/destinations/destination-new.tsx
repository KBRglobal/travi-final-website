import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  MapPin,
  Save,
  Loader2,
} from "lucide-react";

const COUNTRIES = [
  "Australia",
  "China",
  "France",
  "Germany",
  "Indonesia",
  "Italy",
  "Japan",
  "Netherlands",
  "Singapore",
  "Spain",
  "Thailand",
  "Turkey",
  "UAE",
  "United Kingdom",
  "USA",
];

const createDestinationSchema = z.object({
  name: z.string().min(1, "Destination name is required").min(2, "Name must be at least 2 characters"),
  country: z.string().min(1, "Country is required"),
  destinationLevel: z.enum(["country", "city", "area"]),
});

type CreateDestinationForm = z.infer<typeof createDestinationSchema>;

export default function DestinationNewPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<CreateDestinationForm>({
    resolver: zodResolver(createDestinationSchema),
    defaultValues: {
      name: "",
      country: "",
      destinationLevel: "city",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateDestinationForm) => {
      return apiRequest("/api/admin/destinations", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: async (response) => {
      const newDestination = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/destinations"] });
      toast({
        title: "Destination created",
        description: `${form.getValues("name")} has been added successfully.`,
      });
      setLocation(`/admin/destinations/${newDestination.slug || newDestination.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create destination.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateDestinationForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/destinations" data-testid="link-back-destinations">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="heading-new-destination">
            New Destination
          </h1>
          <p className="text-muted-foreground" data-testid="text-description">
            Add a new travel destination to your CMS
          </p>
        </div>
      </div>

      <Card data-testid="card-destination-form">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-card-title">
            <MapPin className="w-5 h-5" />
            Destination Details
          </CardTitle>
          <CardDescription data-testid="text-card-description">
            Enter the basic information for the new destination
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-create-destination">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Tokyo, Barcelona, Maldives"
                        data-testid="input-destination-name"
                      />
                    </FormControl>
                    <FormMessage data-testid="error-destination-name" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-country">
                          <SelectValue placeholder="Select a country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem 
                            key={c} 
                            value={c}
                            data-testid={`select-country-option-${c.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage data-testid="error-country" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destinationLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-level">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="country" data-testid="select-level-option-country">Country</SelectItem>
                        <SelectItem value="city" data-testid="select-level-option-city">City</SelectItem>
                        <SelectItem value="area" data-testid="select-level-option-area">Area / District</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage data-testid="error-level" />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-3 pt-4">
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  data-testid="button-create-destination"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Create Destination
                </Button>
                <Link href="/admin/destinations">
                  <Button variant="outline" type="button" data-testid="button-cancel">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
