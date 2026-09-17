"use client";

import * as React from "react";
import { logError } from "@/lib/error-log";
import { Button } from "@/components/ui/button";

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  private handleError?: (event: ErrorEvent) => void;
  private handleRejection?: (event: PromiseRejectionEvent) => void;
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    void logError(error, "react-boundary");
  }

  componentDidMount() {
    this.handleError = (event: ErrorEvent) => void logError(event.error ?? event.message, "window-error");
    this.handleRejection = (event: PromiseRejectionEvent) => void logError(event.reason, "unhandled-rejection");
    window.addEventListener("error", this.handleError);
    window.addEventListener("unhandledrejection", this.handleRejection);
  }

  componentWillUnmount() {
    if (this.handleError) window.removeEventListener("error", this.handleError);
    if (this.handleRejection) window.removeEventListener("unhandledrejection", this.handleRejection);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">We recorded this error. Try reloading the page.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Reload page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
