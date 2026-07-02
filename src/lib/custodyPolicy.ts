import { z } from 'zod';
import { ChainKey } from '@/config/chains';
import { getEnv, isLocalhostUrl, isPlaceholder, isProduction } from '@/lib/env';
import { WalletChain } from '@/wallet/types';
import { validateAddress } from '@/lib/walletUtils';

export const CUSTODIAL_TOKEN = 'USDT' as const;
export const CUSTODIAL_TOKEN_DECIMALS = 6 as const;

export const CUSTODIAL_MVP_CHAINS = ['tron', 'ethereum', 'bsc'] as const satisfies readonly ChainKey[];
export type CustodialChain = (typeof CUSTODIAL_MVP_CHAINS)[number];

export type CustodyKeyManagerMode = 'hsm' | 'http-hsm';

export const CUSTODIAL_CHAIN_LABELS: Record<CustodialChain, string> = {
  tron: 'TRON / TRC-20',
  ethereum: 'Ethereum / ERC-20',
  bsc: 'BNB Chain / BEP-20',
};

export const CUSTODIAL_USDT_ADDRESSES: Record<CustodialChain, string> = {
  tron: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  bsc: '0x55d398326f99059fF775485246999027B3197955',
};

export const CUSTODIAL_EXPLORER_URLS: Record<CustodialChain, { tx: (hash: string) => string; address: (address: string) => string }> = {
  tron: {
    tx: (hash) => `https://tronscan.org/#/transaction/${hash}`,
    address: (address) => `https://tronscan.org/#/address/${address}`,
  },
  ethereum: {
    tx: (hash) => `https://etherscan.io/tx/${hash}`,
    address: (address) => `https://etherscan.io/address/${address}`,
  },
  bsc: {
    tx: (hash) => `https://bscscan.com/tx/${hash}`,
    address: (address) => `https://bscscan.com/address/${address}`,
  },
};

export interface CustodyReadinessCheck {
  name: string;
  ok: boolean;
  message: string;
}

export interface CustodyReadiness {
  ok: boolean;
  mode: CustodyKeyManagerMode;
  checks: CustodyReadinessCheck[];
}

export const custodialWithdrawalSchema = z
  .object({
    chain: z.enum(CUSTODIAL_MVP_CHAINS),
    token: z.literal(CUSTODIAL_TOKEN).default(CUSTODIAL_TOKEN),
    to: z.string().min(1, 'Recipient address is required'),
    amount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a positive decimal string'),
    idempotencyKey: z.string().min(1, 'Idempotency key is required').max(128),
    memo: z.string().max(1000).optional(),
  })
  .refine((value) => value.amount !== '0' && !/^0+(\.0+)?$/.test(value.amount), {
    message: 'Amount must be greater than zero',
    path: ['amount'],
  });

export type CustodialWithdrawalRequest = z.infer<typeof custodialWithdrawalSchema>;

export function getRuntimeEnv(name: string): string | undefined {
  return typeof process !== 'undefined' ? getEnv(name) : undefined;
}

export function getCustodyKeyManagerMode(): CustodyKeyManagerMode {
  const configured = getRuntimeEnv('CUSTODIAL_KEY_MANAGER_MODE')?.trim().toLowerCase();

  if (configured === 'hsm' || configured === 'http-hsm') {
    return configured;
  }

  if (getRuntimeEnv('CUSTODIAL_HSM_BASE_URL') || getRuntimeEnv('CUSTODIAL_HSM_TOKEN')) {
    return 'http-hsm';
  }

  // Production requires HSM - local HD is not allowed
  if (isProduction()) {
    return 'http-hsm';
  }

  return 'http-hsm';
}

export function assertCustodyReady(options: { requireSupabaseServiceRole?: boolean } = {}): CustodyReadiness {
  const mode = getCustodyKeyManagerMode();
  const checks: CustodyReadinessCheck[] = [];

  const addCheck = (name: string, ok: boolean, message: string) => {
    checks.push({ name, ok, message });
    if (!ok) {
      throw new Error(message);
    }
  };

  const production = isProduction();

  // Production requires HSM/http-hsm mode
  if (mode === 'http-hsm') {
    const hsmBaseUrl = getRuntimeEnv('CUSTODIAL_HSM_BASE_URL');
    if (!hsmBaseUrl) {
      addCheck('HTTP HSM endpoint', false, 'CUSTODIAL_HSM_BASE_URL is required when CUSTODIAL_KEY_MANAGER_MODE=http-hsm.');
    } else {
      const isPublicHttps = /^https:\/\//i.test(hsmBaseUrl) && !isLocalhostUrl(hsmBaseUrl);
      addCheck('HTTP HSM endpoint', production ? isPublicHttps : /^https?:\/\//i.test(hsmBaseUrl), production ? 'CUSTODIAL_HSM_BASE_URL must be a public production HTTPS endpoint.' : 'CUSTODIAL_HSM_BASE_URL must be an http(s) URL.');
    }
    const hsmToken = getRuntimeEnv('CUSTODIAL_HSM_TOKEN');
    if (isPlaceholder(hsmToken)) {
      addCheck('HTTP HSM token', false, 'CUSTODIAL_HSM_TOKEN is required for production HTTP HSM custody.');
    } else {
      addCheck('HTTP HSM token', true, 'HTTP HSM token is configured.');
    }
  }

  if (options.requireSupabaseServiceRole) {
    const serviceRoleKey = getRuntimeEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (isPlaceholder(serviceRoleKey)) {
      addCheck('Supabase service role', false, 'SUPABASE_SERVICE_ROLE_KEY is required for custodial ledger writes.');
    } else {
      addCheck('Supabase service role', true, 'Supabase service role key is configured.');
    }
  }

  return { ok: true, mode, checks };
}

export function getCustodyReadiness(): CustodyReadiness {
  try {
    return assertCustodyReady();
  } catch (error) {
    const mode = getCustodyKeyManagerMode();
    return {
      ok: false,
      mode,
      checks: [
        {
          name: 'custody readiness',
          ok: false,
          message: error instanceof Error ? error.message : 'Unknown custody readiness error',
        },
      ],
    };
  }
}

export function normalizeCustodialChain(chain: string): CustodialChain {
  const normalized = chain.toLowerCase();
  if (normalized === 'tron' || normalized === 'trc20' || normalized === 'trc-20') return 'tron';
  if (normalized === 'ethereum' || normalized === 'erc20' || normalized === 'erc-20') return 'ethereum';
  if (normalized === 'bsc' || normalized === 'bnb' || normalized === 'bep20' || normalized === 'bep-20') return 'bsc';
  throw new Error(`Unsupported custodial chain: ${chain}`);
}

export function isCustodialChain(chain: string): chain is CustodialChain {
  try {
    normalizeCustodialChain(chain);
    return true;
  } catch {
    return false;
  }
}

export function validateCustodialAddress(chain: CustodialChain, address: string): boolean {
  return validateAddress(address, chain);
}

export function parseCustodialUSDTAmount(amount: string, decimals = CUSTODIAL_TOKEN_DECIMALS): bigint {
  const sanitized = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(sanitized) || /^0+(\.0+)?$/.test(sanitized)) {
    throw new Error('Invalid USDT amount');
  }

  const [wholePart, fractionPart = ''] = sanitized.split('.');
  const paddedFraction = fractionPart.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(wholePart || '0') * 10n ** BigInt(decimals) + BigInt(paddedFraction);
}

export function formatCustodialUSDTAmount(baseUnits: bigint, decimals = CUSTODIAL_TOKEN_DECIMALS): string {
  const unit = 10n ** BigInt(decimals);
  const whole = baseUnits / unit;
  const fraction = baseUnits % unit;

  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
}

export function getCustodialExplorerTxUrl(chain: CustodialChain, hash: string): string {
  return CUSTODIAL_EXPLORER_URLS[chain].tx(hash);
}

export function getCustodialExplorerAddressUrl(chain: CustodialChain, address: string): string {
  return CUSTODIAL_EXPLORER_URLS[chain].address(address);
}

export function toWalletChain(chain: CustodialChain): WalletChain {
  switch (chain) {
    case 'tron':
      return WalletChain.TRON;
    case 'ethereum':
      return WalletChain.ETHEREUM;
    case 'bsc':
      return WalletChain.BSC;
    default:
      return WalletChain.ETHEREUM;
  }
}
