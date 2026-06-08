// Stub module for optional job DB integration
export function claimNextPending(): any {
  return null;
}

export function fetchNextPending(): any {
  return null;
}

export function markProcessing(id: string): void {
  // no-op
}

export function markDone(id: string): void {
  // no-op
}

export function markFailed(id: string, error: string): void {
  // no-op
}

export function incrementAttempts(id: string): void {
  // no-op
}
