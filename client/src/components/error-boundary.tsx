import { Component, ErrorInfo, ReactNode } from "react";
import { useTranslation } from "react-i18next";

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
 * Error Boundary component to catch React errors and display a fallback UI.
 * Uses plain HTML/inline styles to avoid importing heavy UI components
 * (Card, Button, lucide icons) which would pull large page chunks into
 * the entry bundle and create circular dependencies.
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
          <div className="max-w-lg w-full rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="text-center mb-4">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-destructive"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4"
              >
                {tryAgain}
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4"
              >
                {reload}
              </button>
            </div>
          </div>
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
