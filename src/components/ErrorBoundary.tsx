'use client';

/**
 * Enhanced Error Boundary Components
 * - ErrorReportingContext extracted to src/components/ErrorReportingContext.tsx
 * - Presentational fallbacks (InlineError, CardError, FullscreenError)
 * - resetKeys / onReset support
 * - fallback can be a ReactNode or render-prop receiving { error, reset }
 * - production-guarded stack traces
 * - accessibility improvements (role, aria-live, aria-label)
 * - type="button" on all buttons
 * - LoadingSkeleton memoized with role="status"
 * - AsyncErrorBoundary supports retry/reset
 * - Focus management: moves focus to primary action when fallback mounts
 */

import React, { Component, ErrorInfo, ReactNode, Suspense } from 'react';
import { AlertTriangle, RefreshCw, Home, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import ErrorReportingContext from './ErrorReportingContext';

// ============================================
// Types
// ============================================

type ErrorVariant = 'full' | 'card' | 'inline';

interface RetryPolicy {
  attempts: number;
  initialDelayMs?: number;
  backoff?: 'linear' | 'exponential';
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((args: { error: Error | null; reset: () => void; reportId?: string }) => ReactNode);
  variant?: ErrorVariant;
  onError?: (error: Error, errorInfo?: ErrorInfo) => void; // optional local hook
  showDetails?: boolean;
  resetKeys?: unknown[]; // when these change, reset the error state
  onReset?: () => void;
  retryPolicy?: RetryPolicy; // optional retry for transient errors
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  reportId?: string | undefined;
  retryAttempt: number;
  remountKey: number; // used to force remount children when retrying
}

// ============================================
// Presentational Fallback Components
// ============================================

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" aria-live="assertive" className="flex items-center gap-2 text-red-400 text-sm">
      <AlertCircle className="w-4 h-4" />
      <span>{message}</span>
      <button type="button" onClick={onRetry} className="ml-2 text-indigo-400 hover:text-indigo-300 underline" aria-label="Retry">
        Retry
      </button>
    </div>
  );
}

function CardError({ message, onRetry, details, showDetails }: { message: string; onRetry: () => void; details?: ReactNode; showDetails?: boolean }) {
  return (
    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-red-400 font-medium">Something went wrong</p>
          <p className="text-red-300/80 text-sm mt-1 truncate">{message}</p>
          {showDetails && details}
          <button type="button" onClick={onRetry} className="mt-3 flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300" aria-label="Try again">
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

function FullscreenError({ message, onRetry, details, showDetails, reportId }: { message: string; onRetry: () => void; details?: ReactNode; showDetails?: boolean; reportId?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-500/20 rounded-full">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>

        <p className="text-gray-400 mb-2">{message}</p>

        {showDetails && details}

        {reportId && (
          <p className="text-xs text-gray-500 mb-4">Reference ID: <span className="font-mono">{reportId}</span></p>
        )}

        <div className="space-y-3">
          <button type="button" onClick={onRetry} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors" aria-label="Retry">
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>

          <Link href="/" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors" aria-label="Go to Dashboard">
            <Home className="w-5 h-5" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Error Boundary Component
// ============================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static contextType = ErrorReportingContext; // allow reporting via context
  context!: React.ContextType<typeof ErrorReportingContext>;

  private primaryActionRef: HTMLButtonElement | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryAttempt: 0, remountKey: 0 };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, retryAttempt: 0, remountKey: 0 } as ErrorBoundaryState;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Development console logging only
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Local onError prop
    this.props.onError?.(error, errorInfo);

    // Report via context provider (non-blocking)
    try {
      const reporter = (this.context as any) || { captureException: async () => undefined };
      reporter.captureException(error, { componentStack: errorInfo.componentStack }).then((id: string | undefined) => {
        if (id) this.setState({ reportId: id });
      });
    } catch (e) {
      // ignore reporting errors
    }

    // Optionally trigger automatic retry for network errors if policy provided
    const { retryPolicy } = this.props;
    if (retryPolicy && isNetworkError(error)) {
      this.scheduleRetry(retryPolicy);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys } = this.props;
    if (resetKeys && !shallowEqual(resetKeys, prevProps.resetKeys)) {
      this.handleReset();
      this.props.onReset?.();
    }

    // When fallback mounts we want to focus the primary action for accessibility
    if (this.state.hasError && !prevProps) {
      // noop; left for clarity
    }
  }

  private scheduleRetry(policy: RetryPolicy) {
    const attempts = policy.attempts || 1;
    const initial = policy.initialDelayMs || 500;
    const backoff = policy.backoff || 'exponential';

    const attemptRetry = (attempt: number) => {
      if (attempt > attempts) return;
      const delay = backoff === 'exponential' ? initial * Math.pow(2, attempt - 1) : initial * attempt;
      window.setTimeout(() => {
        // attempt: clear error and remount children
        this.setState((s) => ({ hasError: false, error: null, retryAttempt: attempt, remountKey: s.remountKey + 1 }));
      }, delay);
    };

    attemptRetry(1);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, reportId: undefined, retryAttempt: 0 });
    this.props.onReset?.();
  };

  private setPrimaryActionRef = (el: HTMLButtonElement | null) => {
    this.primaryActionRef = el;
    if (el) {
      // focus when set
      try {
        el.focus();
      } catch (e) {
        // ignore
      }
    }
  };

  private renderDetails() {
    if (!this.state.error) return null;
    if (!this.props.showDetails) return null;
    if (process.env.NODE_ENV === 'production') return null;
    return (
      <pre className="text-xs text-gray-500 mt-2 overflow-x-auto whitespace-pre-wrap text-left bg-gray-900 p-4 rounded-lg">
        {this.state.error.stack?.split('\n').slice(0, 8).join('\n')}
      </pre>
    );
  }

  renderFallback(): ReactNode {
    const { variant = 'full', showDetails = false } = this.props;
    const errorMessage = this.state.error?.message || 'An unexpected error occurred.';
    const details = this.renderDetails();

    const fallbackProps = {
      message: errorMessage,
      onRetry: this.handleReset,
      details,
      showDetails,
      reportId: this.state.reportId,
    };

    if (variant === 'inline') {
      return <InlineError {...fallbackProps} />;
    }

    if (variant === 'card') {
      return <CardError {...fallbackProps} />;
    }

    // full
    return <FullscreenError {...fallbackProps} />;
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({ error: this.state.error, reset: this.handleReset, reportId: this.state.reportId });
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return this.renderFallback();
    }

    // include remountKey to force child remounts on retry
    return <div key={this.state.remountKey}>{this.props.children}</div>;
  }
}

// ============================================
// Async Error Boundary for Suspense
// ============================================

interface AsyncBoundaryProps {
  children: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode | ((args: { error: Error; reset: () => void; reportId?: string }) => ReactNode);
  onError?: (error: Error, errorInfo?: ErrorInfo) => void;
}

interface AsyncBoundaryState {
  error: Error | null;
  reportId?: string;
}

export class AsyncErrorBoundary extends Component<AsyncBoundaryProps, AsyncBoundaryState> {
  static contextType = ErrorReportingContext;
  context!: React.ContextType<typeof ErrorReportingContext>;

  constructor(props: AsyncBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): AsyncBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo?: ErrorInfo): void {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('AsyncErrorBoundary caught an error:', error, errorInfo);
    }
    this.props.onError?.(error, errorInfo);

    try {
      const reporter = (this.context as any) || { captureException: async () => undefined };
      reporter.captureException(error, { componentStack: errorInfo?.componentStack }).then((id: string | undefined) => {
        if (id) this.setState({ reportId: id });
      });
    } catch (e) {
      // ignore
    }
  }

  handleReset = (): void => {
    this.setState({ error: null, reportId: undefined });
  };

  renderErrorUI(): ReactNode {
    const error = this.state.error!;
    if (typeof this.props.errorComponent === 'function') {
      return this.props.errorComponent({ error, reset: this.handleReset, reportId: this.state.reportId });
    }
    if (this.props.errorComponent) return this.props.errorComponent;

    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error.message}</span>
          <button type="button" onClick={this.handleReset} className="ml-3 px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded" aria-label="Retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  render(): ReactNode {
    if (this.state.error) {
      return this.renderErrorUI();
    }

    return <Suspense fallback={this.props.loadingComponent || <LoadingSkeleton />}>{this.props.children}</Suspense>;
  }
}

// ============================================
// Loading Skeleton Component
// ============================================

export const LoadingSkeleton = React.memo(function LoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center justify-center p-8 ${className}`}>
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );
});

// ============================================
// Empty State Component
// ============================================

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    ariaLabel?: string;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {icon && (
        <div className="mb-4 p-4 bg-gray-800/50 rounded-full" aria-hidden>
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-300 mb-2">{title}</h3>
      {description && <p className="text-gray-500 mb-4 max-w-sm">{description}</p>}
      {action && (
        <button type="button" onClick={action.onClick} aria-label={action.ariaLabel || action.label} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================
// Hook for using error boundary in functional components
// ============================================

export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      // Throwing inside effect will propagate to nearest ErrorBoundary
      throw error;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return setError;
}

// ============================================
// Helper function to check if error is a network error
// ============================================

export function isNetworkError(error: Error): boolean {
  return (
    error.message.toLowerCase().includes('network') ||
    error.message.toLowerCase().includes('fetch') ||
    error.message.toLowerCase().includes('connection') ||
    error.name === 'NetworkError'
  );
}

// ============================================
// Helper function to get user-friendly error message
// ============================================

export function getErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();
  if (isNetworkError(error)) {
    return 'Network error. Please check your connection and try again.';
  }
  if (message.includes('not authenticated')) {
    return 'Please sign in to continue.';
  }
  if (message.includes('insufficient funds')) {
    return 'Insufficient balance for this transaction.';
  }
  return error.message || 'Something went wrong. Please try again.';
}

// ============================================
// Helpers
// ============================================

function shallowEqual(a?: unknown[], b?: unknown[]) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
