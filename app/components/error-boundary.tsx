"use client";
import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-700">
          <h2 className="font-medium text-red-800 dark:text-red-200 mb-2">Something went wrong.</h2>
          <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap">
            {this.state.error?.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
