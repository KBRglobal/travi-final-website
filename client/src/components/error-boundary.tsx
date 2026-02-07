import { Component, ErrorInfo, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  tryAgainText?: string;
  reloadText?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch React errors and display a fallback UI
 * Prevents the entire app from crashing on component errors
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error Boundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private readonly handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private readonly handleReload = () => {
    globalThis.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const title = this.props.fallbackTitle ?? "Something went wrong";
      const message =
        this.props.fallbackMessage ?? "An unexpected error occurred. Please try again.";
      const tryAgain = this.props.tryAgainText ?? "Try Again";
      const reload = this.props.reloadText ?? "Reload Page";

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="rounded-md bg-muted p-3 text-sm font-mono text-muted-foreground overflow-auto max-h-32">
                  {this.state.error.message}
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={this.handleRetry}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {tryAgain}
                </Button>
                <Button onClick={this.handleReload}>{reload}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper that provides i18n-translated strings to ErrorBoundary
 */
export function TranslatedErrorBoundary({
  children,
  fallback,
}: Readonly<{
  children: ReactNode;
  fallback?: ReactNode;
}>) {
  const { t } = useTranslation("common");
  return (
    <ErrorBoundary
      fallback={fallback}
      fallbackTitle={t("errors.boundary.title", "Something went wrong")}
      fallbackMessage={t(
        "errors.boundary.message",
        "An unexpected error occurred. Please try again."
      )}
      tryAgainText={t("errors.boundary.tryAgain", "Try Again")}
      reloadText={t("errors.boundary.reloadPage", "Reload Page")}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * HOC to wrap a component with a translated error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <TranslatedErrorBoundary fallback={fallback}>
        <Component {...props} />
      </TranslatedErrorBoundary>
    );
  };
}
