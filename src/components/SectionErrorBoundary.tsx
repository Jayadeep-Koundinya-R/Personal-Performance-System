import React, { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  sectionName?: string;
  onGoHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`🚨 [PPS SectionErrorBoundary] Error in section [${this.props.sectionName || "unknown"}]:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[340px] p-6 text-center bg-card/60 backdrop-blur-md border border-border/80 rounded-3xl shadow-sm space-y-4 my-4">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-foreground">
              Unable to load {this.props.sectionName || "Section"}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {this.state.error?.message || "An unexpected error occurred while rendering this module."}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Section</span>
            </button>
            {this.props.onGoHome && (
              <button
                onClick={this.props.onGoHome}
                className="px-4 py-2 text-xs font-bold bg-surface border border-border text-foreground rounded-xl flex items-center gap-1.5 hover:bg-muted transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Back to Today</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
