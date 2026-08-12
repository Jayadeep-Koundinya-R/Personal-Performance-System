import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("🚨 [PPS ErrorBoundary] Uncaught runtime exception:", error, errorInfo);
    this.setState({ errorInfo });

    // Store last diagnostic error log for customer support
    try {
      const errorLog = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      };
      localStorage.setItem("pps_last_error_log", JSON.stringify(errorLog));
    } catch (e) {
      // Ignore localStorage write failure
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false, copied: false });
    window.location.reload();
  };

  handleCopyDiagnostics = () => {
    const diag = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
    navigator.clipboard.writeText(JSON.stringify(diag, null, 2));
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2500);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 text-foreground">
          <div className="max-w-lg w-full bg-card border border-border rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-destructive/20">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>

            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground text-xs leading-relaxed mb-6">
              {this.state.error?.message || "An unexpected system error occurred. We have captured the diagnostic log."}
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={this.handleCopyDiagnostics}
                  className="flex-1 bg-surface border border-border py-2.5 rounded-xl text-xs font-semibold hover:bg-muted/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  {this.state.copied ? <Check className="w-3.5 h-3.5 text-pps-green" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{this.state.copied ? "Copied Diagnostics!" : "Copy Error Details"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="bg-surface border border-border px-3 py-2.5 rounded-xl text-xs font-semibold hover:bg-muted/40 transition-colors flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <span>Technical Log</span>
                  {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {this.state.showDetails && (
                <div className="text-left bg-surface/80 border border-border/80 rounded-xl p-3.5 mt-3 max-h-48 overflow-y-auto font-mono text-[10.5px] text-muted-foreground space-y-2">
                  <div className="font-bold text-destructive">Message: {this.state.error?.message}</div>
                  {this.state.error?.stack && (
                    <div>
                      <div className="font-bold text-foreground mb-1">Stack Trace:</div>
                      <pre className="whitespace-pre-wrap text-[9.5px] leading-snug">{this.state.error.stack}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground mt-5">
              If reloading does not resolve this, please email <span className="font-mono text-primary font-bold">support@upalakshya.com</span> with copied error details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
