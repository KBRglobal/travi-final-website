import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, Mail } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            This application is restricted to authorized users only.
          </p>
          <div className="bg-muted rounded-md p-3 flex items-center justify-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Contact the administrator for access
            </span>
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = "/"}
            data-testid="button-go-home"
          >
            Go to Homepage
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
