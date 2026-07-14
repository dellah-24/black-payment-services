'use client';

import { useEffect, useState } from 'react';

export interface UseQRCodeResult {
  /** The dynamically imported qrcode module, or null if not loaded/failed */
  QRCodeLib: typeof import('qrcode') | null;
  /** True while the module is being loaded */
  loading: boolean;
  /** True if the dynamic import failed */
  error: boolean;
  /** Error message if import failed */
  errorMessage: string | null;
}

/**
 * Shared hook for dynamically importing the 'qrcode' module.
 *
 * Centralizes error handling and loading state so that:
 * - QR components show a loading indicator while the module loads
 * - QR components show an explicit error state if the import fails
 * - Import failures are logged for observability
 * - All consumers use the same import logic (no drift)
 */
export function useQRCode(): UseQRCodeResult {
  const [QRCodeLib, setQRCodeLib] = useState<typeof import('qrcode') | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadQRCode() {
      setLoading(true);
      setError(false);
      setErrorMessage(null);

      try {
        const mod = await import('qrcode');
        if (!cancelled) {
          setQRCodeLib(mod);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.error('[useQRCode] Failed to dynamically import qrcode module:', message);
          setQRCodeLib(null);
          setLoading(false);
          setError(true);
          setErrorMessage(message);
        }
      }
    }

    loadQRCode();

    return () => {
      cancelled = true;
    };
  }, []);

  return { QRCodeLib, loading, error, errorMessage };
}
