import React, { createContext, useContext } from 'react';

export type ErrorReporter = {
  captureException: (error: Error, meta?: Record<string, unknown>) => Promise<string | undefined>;
  addBreadcrumb?: (crumb: { message: string; data?: Record<string, unknown> }) => void;
};

const noopReporter: ErrorReporter = {
  captureException: async () => undefined,
  addBreadcrumb: () => undefined,
};

const ErrorReportingContext = createContext<ErrorReporter>(noopReporter);

export const ErrorReportingProvider = ({ reporter, children }: { reporter?: ErrorReporter; children: React.ReactNode }) => {
  const value = reporter || noopReporter;
  return <ErrorReportingContext.Provider value={value}>{children}</ErrorReportingContext.Provider>;
};

export const useErrorReporter = () => useContext(ErrorReportingContext);

export default ErrorReportingContext;
