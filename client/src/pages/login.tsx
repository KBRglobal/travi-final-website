import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LogIn, Shield } from "lucide-react";
import { SiGoogle, SiGithub } from "react-icons/si";
import { SEOHead } from "@/components/seo-head";

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  return (
    <>
      <SEOHead
        title="Login - Travi CMS"
        description="Sign in to access the Travi CMS admin panel"
        noindex={true}
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Travi CMS</CardTitle>
            <CardDescription className="text-base">
              Sign in with your Google or GitHub account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Button
                onClick={handleSignIn}
                className="w-full gap-3"
                size="lg"
                data-testid="button-sign-in-google"
              >
                <SiGoogle className="w-5 h-5" />
                Sign in with Google
              </Button>

              <Button
                onClick={handleSignIn}
                variant="outline"
                className="w-full gap-3"
                size="lg"
                data-testid="button-sign-in-github"
              >
                <SiGithub className="w-5 h-5" />
                Sign in with GitHub
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground pt-4 border-t">
              <p className="flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" />
                Secure authentication
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
