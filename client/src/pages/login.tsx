import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { 
  Loader2, 
  LogIn, 
  Shield, 
  Smartphone, 
  Key,
  ArrowLeft,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SEOHead } from "@/components/seo-head";

type LoginStep = "credentials" | "totp" | "recovery";

interface LoginResponse {
  success: boolean;
  user?: any;
  requiresMfa?: boolean;
  isNewDevice?: boolean;
  riskScore?: number;
  preAuthToken?: string;
  preAuthExpiresAt?: string;
  securityContext?: {
    deviceTrusted: boolean;
    country?: string;
  };
  error?: string;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<LoginStep>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginData, setLoginData] = useState<LoginResponse | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.requiresMfa) {
        setLoginData(data);
        setStep("totp");
        toast({
          title: "Verification Required",
          description: "Please enter your authenticator code",
        });
      } else {
        toast({
          title: "Success",
          description: "Logged in successfully",
        });
        window.location.href = "/";
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!totpCode || totpCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/totp/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code: totpCode,
          preAuthToken: loginData?.preAuthToken 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.remainingAttempts !== undefined) {
          setAttemptsRemaining(data.remainingAttempts);
        }
        throw new Error(data.error || "Invalid verification code");
      }

      if (rememberDevice) {
        try {
          await fetch("/api/security/device/trust", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.warn("Failed to trust device:", e);
        }
      }

      toast({
        title: "Success",
        description: "Verification successful",
      });
      window.location.href = "/";
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid code",
        variant: "destructive",
      });
      setTotpCode("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recoveryCode || recoveryCode.length < 6) {
      toast({
        title: "Error",
        description: "Please enter a valid recovery code",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/totp/validate-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          recoveryCode: recoveryCode.toUpperCase().replace(/-/g, ""),
          preAuthToken: loginData?.preAuthToken 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid recovery code");
      }

      toast({
        title: "Success",
        description: `Recovery code accepted. ${data.remainingCodes} codes remaining.`,
      });
      window.location.href = "/";
    } catch (error: any) {
      toast({
        title: "Recovery Failed",
        description: error.message || "Invalid recovery code",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTotpChange = (value: string) => {
    setTotpCode(value);
    if (value.length === 6) {
      const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
      setTimeout(() => handleTotpSubmit(syntheticEvent), 100);
    }
  };

  const resetToCredentials = () => {
    setStep("credentials");
    setTotpCode("");
    setRecoveryCode("");
    setLoginData(null);
    setAttemptsRemaining(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <SEOHead
        title="Login"
        description="Login to TRAVI admin panel"
        canonicalPath="/login"
        noIndex={true}
      />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {step === "credentials" && (
            <>
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <LogIn className="h-6 w-6" />
                Travi CMS
              </CardTitle>
              <CardDescription>
                Sign in to manage your travel contents
              </CardDescription>
            </>
          )}
          {step === "totp" && (
            <>
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Enter the code from your authenticator app
              </CardDescription>
            </>
          )}
          {step === "recovery" && (
            <>
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Key className="h-6 w-6 text-primary" />
                Recovery Code
              </CardTitle>
              <CardDescription>
                Enter one of your backup recovery codes
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {step === "credentials" && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isSubmitting}
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  data-testid="input-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="button-login"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Sign In
              </Button>
            </form>
          )}

          {step === "totp" && (
            <form onSubmit={handleTotpSubmit} className="space-y-6">
              {loginData?.isNewDevice && (
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>
                    New device detected. Please verify your identity.
                  </AlertDescription>
                </Alert>
              )}

              {attemptsRemaining !== null && attemptsRemaining < 3 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining before lockout
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={totpCode}
                  onChange={handleTotpChange}
                  disabled={isSubmitting}
                  data-testid="input-totp"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-device"
                  checked={rememberDevice}
                  onCheckedChange={(checked) => setRememberDevice(checked === true)}
                  data-testid="checkbox-remember-device"
                />
                <Label
                  htmlFor="remember-device"
                  className="text-sm cursor-pointer"
                >
                  Remember this device for 30 days
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || totpCode.length !== 6}
                data-testid="button-verify-totp"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                Verify
              </Button>

              <div className="flex flex-col gap-2 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("recovery")}
                  className="text-muted-foreground"
                  data-testid="button-use-recovery"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Use a recovery code instead
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetToCredentials}
                  className="text-muted-foreground"
                  data-testid="button-back-to-login"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </div>
            </form>
          )}

          {step === "recovery" && (
            <form onSubmit={handleRecoverySubmit} className="space-y-6">
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  Recovery codes are single-use. After using this code, it will be invalidated.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="recovery-code">Recovery Code</Label>
                <Input
                  id="recovery-code"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                  disabled={isSubmitting}
                  className="font-mono text-center text-lg tracking-wider"
                  data-testid="input-recovery-code"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || recoveryCode.length < 6}
                data-testid="button-verify-recovery"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Key className="mr-2 h-4 w-4" />
                )}
                Verify Recovery Code
              </Button>

              <div className="flex flex-col gap-2 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("totp")}
                  className="text-muted-foreground"
                  data-testid="button-use-totp"
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  Use authenticator app instead
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetToCredentials}
                  className="text-muted-foreground"
                  data-testid="button-back-to-login-recovery"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
