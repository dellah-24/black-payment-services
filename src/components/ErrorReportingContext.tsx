'use client';

import { createContext, useContext, ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface ErrorReportingContextValue {
  reportError: (error: Error, context?: Record<string, any>) => void;
}

const ErrorReportingContext = createContext<ErrorReportingContextValue | null>(null);

export function ErrorReportingProvider({ children }: { children: ReactNode }) {
  const reportError = (error: Error, context?: Record<string, any>) => {
    logger.error('Application error reported', error, context);
  };

  return (
    <ErrorReportingContext.Provider value={{ reportError }}>
      {children}
    </ErrorReportingContext.Provider>
  );
}

export function useErrorReporting() {
  const context = useContext(ErrorReportingContext);
  if (!context) {
    throw new Error('useErrorReporting must be used within an ErrorReportingProvider');
  }
  return context;
}
