import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AdminPageLayout,
  AdminPageHeader,
  AdminPageContent,
  AdminSection,
  AdminCardSkeleton,
} from "@/components/admin";
import {
  Shield,
  Key,
  Lock,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  History,
  Users,
  Copy,
  Download,
  Loader2,
} from "lucide-react";

interface TotpStatus {
  totpEnabled: boolean;
  hasSecret: boolean;
}

interface SetupResponse {
  qrCode: string;
  otpauth: string;
}

interface VerifyResponse {
  success: boolean;
  message: string;
  recoveryCodes: string[];
}

interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

interface SecurityLog {
  id: string;
  action: string;
  timestamp: string;
  ip: string;
  success: boolean;
}

export default function SecurityPage() {
  const { toast } = useToast();
  const [setupStep, setSetupStep] = useState<"idle" | "scanning" | "verifying" | "complete">("idle");
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<TotpStatus>({
    queryKey: ["/api/totp/status"],
  });

  const { data: sessions } = useQuery<{ sessions: Session[] }>({
    queryKey: ["/api/security/sessions"],
  });

  const { data: logs } = useQuery<{ logs: SecurityLog[] }>({
    queryKey: ["/api/security/logs"],
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/totp/setup");
      return res.json() as Promise<SetupResponse>;
    },
    onSuccess: (data) => {
      setQrCodeData(data.qrCode);
      setSetupStep("scanning");
      toast({ title: "Scan the QR code", description: "Use your authenticator app (Google Authenticator, Authy, etc.)" });
    },
    onError: (error: any) => {
      toast({ title: "Setup failed", description: error.message || "Failed to start 2FA setup", variant: "destructive" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/totp/verify", { code });
      return res.json() as Promise<VerifyResponse>;
    },
    onSuccess: (data) => {
      setRecoveryCodes(data.recoveryCodes);
      setSetupStep("complete");
      setShowRecoveryDialog(true);
      refetchStatus();
      toast({ title: "2FA Enabled!", description: "Save your recovery codes in a safe place" });
    },
    onError: (error: any) => {
      toast({ title: "Verification failed", description: error.message || "Invalid code", variant: "destructive" });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/totp/disable", { code });
      return res.json();
    },
    onSuccess: () => {
      setSetupStep("idle");
      setDisableCode("");
      refetchStatus();
      toast({ title: "2FA Disabled", description: "Two-factor authentication has been turned off" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to disable", description: error.message || "Invalid code", variant: "destructive" });
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => apiRequest("POST", `/api/security/sessions/${sessionId}/revoke`),
    onSuccess: () => {
      toast({ title: "Session revoked" });
      queryClient.invalidateQueries({ queryKey: ["/api/security/sessions"] });
    },
    onError: () => toast({ title: "Failed to revoke session", variant: "destructive" }),
  });

  const handleStartSetup = () => {
    setupMutation.mutate();
  };

  const handleVerify = () => {
    if (verificationCode.length === 6) {
      verifyMutation.mutate(verificationCode);
    }
  };

  const handleDisable = () => {
    if (disableCode.length === 6) {
      disableMutation.mutate(disableCode);
    }
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    toast({ title: "Copied!", description: "Recovery codes copied to clipboard" });
  };

  const downloadRecoveryCodes = () => {
    const contents = `TRAVI CMS - Recovery Codes\n${"=".repeat(30)}\n\nSave these codes in a safe place.\nEach code can only be used once.\n\n${recoveryCodes.join("\n")}\n\nGenerated: ${new Date().toLocaleString()}`;
    const blob = new Blob([contents], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "travi-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (statusLoading) {
    return (
      <AdminPageLayout>
        <AdminPageHeader
          title="Security"
          description="Manage two-factor authentication, sessions, and security preferences"
        />
        <AdminPageContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <AdminCardSkeleton key={i} />
            ))}
          </div>
        </AdminPageContent>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Security"
        description="Manage two-factor authentication, sessions, and security preferences"
      />
      <AdminPageContent>
        <AdminSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  2FA Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={status?.totpEnabled ? "default" : "secondary"}
                  className="text-sm"
                  data-testid="badge-2fa-status"
                >
                  {status?.totpEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Active Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-sessions">
                  {sessions?.sessions?.length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Security Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-security-events">
                  {logs?.logs?.length || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </AdminSection>

        <AdminSection className="mt-6">
          <Tabs defaultValue="2fa" className="space-y-4">
            <TabsList>
              <TabsTrigger value="2fa" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Two-Factor Auth
              </TabsTrigger>
              <TabsTrigger value="sessions" className="gap-2">
                <Users className="h-4 w-4" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2">
                <History className="h-4 w-4" />
                Security Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="2fa">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Two-Factor Authentication
                  </CardTitle>
                  <CardDescription>
                    Add an extra layer of security using Google Authenticator or similar apps
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!status?.totpEnabled ? (
                    <>
                      {setupStep === "idle" && (
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-muted">
                              <Shield className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                              <h4 className="font-medium">Authenticator App</h4>
                              <p className="text-sm text-muted-foreground">
                                Protect your account with time-based codes
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={handleStartSetup}
                            disabled={setupMutation.isPending}
                            data-testid="button-enable-2fa"
                          >
                            {setupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Enable 2FA
                          </Button>
                        </div>
                      )}

                      {setupStep === "scanning" && (
                        <div className="space-y-6">
                          <Alert>
                            <Key className="h-4 w-4" />
                            <AlertTitle>Step 1: Scan QR Code</AlertTitle>
                            <AlertDescription>
                              Open your authenticator app and scan this QR code
                            </AlertDescription>
                          </Alert>

                          <div className="flex flex-col items-center gap-6">
                            {qrCodeData && (
                              <img 
                                src={qrCodeData} 
                                alt="2FA QR Code" 
                                className="w-48 h-48 border rounded-lg p-2 bg-white"
                                data-testid="img-qr-code"
                              />
                            )}

                            <div className="w-full max-w-sm space-y-4">
                              <Alert>
                                <Smartphone className="h-4 w-4" />
                                <AlertTitle>Step 2: Enter Code</AlertTitle>
                                <AlertDescription>
                                  Enter the 6-digit code from your authenticator app
                                </AlertDescription>
                              </Alert>

                              <div className="flex gap-2">
                                <Input
                                  placeholder="000000"
                                  value={verificationCode}
                                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                  maxLength={6}
                                  className="text-center text-2xl tracking-widest font-mono"
                                  data-testid="input-verification-code"
                                />
                                <Button
                                  onClick={handleVerify}
                                  disabled={verificationCode.length !== 6 || verifyMutation.isPending}
                                  data-testid="button-verify-code"
                                >
                                  {verifyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                  Verify
                                </Button>
                              </div>
                            </div>

                            <Button variant="ghost" onClick={() => setSetupStep("idle")}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h4 className="font-medium text-green-900 dark:text-green-100">2FA is Active</h4>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              Your account is protected with two-factor authentication
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-300">
                          Enabled
                        </Badge>
                      </div>

                      <div className="p-4 border rounded-lg space-y-4">
                        <h4 className="font-medium text-destructive flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Disable 2FA
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Enter your current authenticator code to disable two-factor authentication
                        </p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter 6-digit code"
                            value={disableCode}
                            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            maxLength={6}
                            className="max-w-[200px] text-center font-mono"
                            data-testid="input-disable-code"
                          />
                          <Button
                            variant="destructive"
                            onClick={handleDisable}
                            disabled={disableCode.length !== 6 || disableMutation.isPending}
                            data-testid="button-disable-2fa"
                          >
                            {disableMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Disable 2FA
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sessions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Active Sessions
                  </CardTitle>
                  <CardDescription>
                    Manage devices currently logged into your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {sessions?.sessions && sessions.sessions.length > 0 ? (
                      <div className="space-y-3">
                        {sessions.sessions.map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between p-4 rounded-lg border"
                            data-testid={`session-item-${session.id}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-muted rounded-lg">
                                <Lock className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium flex items-center gap-2">
                                  {session.device}
                                  {session.isCurrent && (
                                    <Badge variant="outline" className="text-xs">
                                      Current
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {session.location} • Last active: {new Date(session.lastActive).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {!session.isCurrent && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => revokeSessionMutation.mutate(session.id)}
                                disabled={revokeSessionMutation.isPending}
                                data-testid={`button-revoke-${session.id}`}
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No active sessions found</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Security Logs
                  </CardTitle>
                  <CardDescription>
                    Recent security events on your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {logs?.logs && logs.logs.length > 0 ? (
                      <div className="space-y-2">
                        {logs.logs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                            data-testid={`log-item-${log.id}`}
                          >
                            <div className="flex items-center gap-3">
                              {log.success ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                              <div>
                                <p className="font-medium text-sm">{log.action}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(log.timestamp).toLocaleString()} • IP: {log.ip}
                                </p>
                              </div>
                            </div>
                            <Badge variant={log.success ? "outline" : "destructive"}>
                              {log.success ? "Success" : "Failed"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No security logs available</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </AdminSection>
      </AdminPageContent>

      <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Recovery Codes
            </DialogTitle>
            <DialogDescription>
              Save these codes in a safe place. Each code can only be used once to access your account if you lose your authenticator.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important!</AlertTitle>
            <AlertDescription>
              These codes will only be shown once. Save them now!
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-lg font-mono text-sm grid grid-cols-2 gap-2">
            {recoveryCodes.map((code, index) => (
              <div key={index} className="p-2 bg-background rounded border" data-testid={`recovery-code-${index}`}>
                {code}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={copyRecoveryCodes}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={downloadRecoveryCodes}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>

          <Button onClick={() => setShowRecoveryDialog(false)} className="w-full" data-testid="button-done-recovery">
            I've saved my codes
          </Button>
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
}
