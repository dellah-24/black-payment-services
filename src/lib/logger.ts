/**
 * Logger Service - Centralized logging with different levels
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
  error?: Error;
}

class Logger {
  private isDevelopment = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  /**
   * Format log message
   */
  private formatMessage(level: LogLevel, message: string, data?: unknown, error?: Error): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      error,
    };
  }

  /**
   * Output log to console (development) or external service (production)
   */
  private output(entry: LogEntry): void {
    if (this.isDevelopment) {
      this.writeEntry(entry);
      return;
    }

    // In production, buffer logs until an external logging sink is wired.
    this.logBuffer.push(entry);

    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  private writeEntry(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.error || entry.data || '');
        break;
    }
  }

  /**
   * Flush log buffer to external service.
   */
  private flush(): void {
    if (this.logBuffer.length === 0) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    // Hook up Sentry, LogRocket, or a custom /api/logs endpoint here.
    // Avoid calling output() from flush() because production output() re-buffers
    // logs and would recursively flush the same entries.
    logsToSend.forEach((entry) => {
      if (this.isDevelopment) {
        this.writeEntry(entry);
      }
    });
  }

  /**
   * Debug level logging
   */
  debug(message: string, data?: unknown): void {
    const entry = this.formatMessage(LogLevel.DEBUG, message, data);
    this.output(entry);
  }

  /**
   * Info level logging
   */
  info(message: string, data?: unknown): void {
    const entry = this.formatMessage(LogLevel.INFO, message, data);
    this.output(entry);
  }

  /**
   * Warning level logging
   */
  warn(message: string, data?: unknown): void {
    const entry = this.formatMessage(LogLevel.WARN, message, data);
    this.output(entry);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, data?: unknown): void {
    const entry = this.formatMessage(LogLevel.ERROR, message, data, error);
    this.output(entry);
  }

  /**
   * Log API call
   */
  apiCall(method: string, url: string, duration: number, status: number): void {
    this.info(`API ${method} ${url}`, { duration, status });
  }

  /**
   * Log wallet operation
   */
  walletOperation(operation: string, address: string, chain?: string): void {
    this.info(`Wallet ${operation}`, { address, chain });
  }

  /**
   * Log security event
   */
  securityEvent(event: string, details?: unknown): void {
    this.warn(`Security: ${event}`, details);
  }

  /**
   * Log performance metric
   */
  performance(metric: string, value: number, unit: string = 'ms'): void {
    this.debug(`Performance: ${metric}`, { value, unit });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logDebug = (message: string, data?: unknown) => logger.debug(message, data);
export const logInfo = (message: string, data?: unknown) => logger.info(message, data);
export const logWarn = (message: string, data?: unknown) => logger.warn(message, data);
export const logError = (message: string, error?: Error, data?: unknown) => logger.error(message, error, data);
