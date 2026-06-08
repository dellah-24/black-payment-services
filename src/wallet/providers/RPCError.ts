/**
 * Standardized RPC Error
 * Inspired by Trust Wallet's error handling pattern
 */

export class RPCError extends Error {
  public readonly code: number;
  public readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'RPCError';
    this.code = code;
    this.data = data;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RPCError);
    }
  }

  static fromError(error: unknown): RPCError {
    if (error instanceof RPCError) {
      return error;
    }

    if (error instanceof Error) {
      return new RPCError(-32603, error.message);
    }

    return new RPCError(-32603, 'Internal error');
  }

  static invalidParams(message = 'Invalid params'): RPCError {
    return new RPCError(-32602, message);
  }

  static methodNotFound(method: string): RPCError {
    return new RPCError(-32601, `Method not found: ${method}`);
  }

  static internalError(message = 'Internal error'): RPCError {
    return new RPCError(-32603, message);
  }

  static parseError(message = 'Parse error'): RPCError {
    return new RPCError(-32700, message);
  }

  static userRejectedRequest(message = 'User rejected request'): RPCError {
    return new RPCError(4001, message);
  }

  static unauthorized(message = 'Unauthorized'): RPCError {
    return new RPCError(4100, message);
  }

  static unsupportedMethod(method: string): RPCError {
    return new RPCError(4200, `Method not supported: ${method}`);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }
}
