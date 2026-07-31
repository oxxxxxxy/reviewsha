import type { ReactNode } from 'react';
import { Component } from 'react';
import { createErrorTimestamp, type FrontendErrorBody } from '@reviewsha/config';

export interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
  readonly onError?: (error: FrontendErrorBody) => void;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error): void {
    this.props.onError?.({
      message: error.message,
      source: 'error-boundary',
      timestamp: createErrorTimestamp(),
    });
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <h1>Something went wrong</h1>;
    }

    return this.props.children;
  }
}
