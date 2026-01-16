import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export default function TiqetsConfiguration() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Configuration</h1>
          <p className="text-muted-foreground">Tiqets integration settings and preferences</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5" />
            <div>
              <CardTitle>Import Settings</CardTitle>
              <CardDescription>
                Configure how attractions are imported and processed
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Auto-assign Districts</p>
              <p className="text-sm text-muted-foreground">
                Automatically assign attractions to districts based on GPS coordinates
              </p>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Content Generation</p>
              <p className="text-sm text-muted-foreground">
                Use AI to generate descriptions, SEO content, and FAQs
              </p>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Image Generation</p>
              <p className="text-sm text-muted-foreground">
                Use Freepik to source and generate attraction images
              </p>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <div>
              <CardTitle>Content Policy</CardTitle>
              <CardDescription>
                Important notes about content handling
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="font-medium mb-2">Images and Descriptions</p>
              <p className="text-muted-foreground">
                We do NOT import images or descriptions from Tiqets. These are stored for reference only.
                All published content is generated using Freepik (images) and AI (descriptions) to ensure
                originality and SEO optimization.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="font-medium mb-2">Pricing Display</p>
              <p className="text-muted-foreground">
                Pricing is imported for internal sorting and filtering only. Prices are NOT displayed
                on the public website - users are directed to Tiqets for current pricing.
              </p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="font-medium mb-2">Affiliate Links</p>
              <p className="text-muted-foreground">
                All booking links include our partner ID (travi-182933) 
                automatically. Commission is tracked through the Tiqets Partner Portal.
              </p>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t">
            <Button variant="outline" asChild>
              <a href="https://partner.tiqets.com" target="_blank" rel="noopener noreferrer">
                Open Tiqets Partner Portal
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
