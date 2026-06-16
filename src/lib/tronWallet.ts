import { getTronWeb } from '@/lib/blockchainNodes';
import { type ChainKey } from '@/config/chains';
import { logger } from '@/lib/logger';
import type { TronWeb } from 'tronweb';

export const TRON_USDT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
export const TRON_USDT_DECIMALS = 6;
export const DEFAULT_TRON_USDT_FEE_LIMIT = 14_900_000;
export const DEFAULT_TRON_USDT_FEE_TRX = '14.9';

export const TRON_USDT_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];

export interface TronBalance {
  raw: string;
  formatted: string;
  decimals: number;
}

export interface TronSendUSDTParams {
  fromAddress: string;
  privateKey: string;
  to: string;
  amount: string;
  feeLimit?: number;
  rpcUrl?: string;
}

export interface TronTransactionResult {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  from: string;
  to: string;
  value: bigint;
  feeLimit: number;
  timestamp: string;
}

export function createTronWeb(privateKey?: string, rpcUrl?: string, chainKey: ChainKey = 'tron'): TronWeb {
  if (chainKey !== 'tron') {
    throw new Error('createTronWeb only supports the tron chain');
  }

  return getTronWeb(privateKey, { rpcUrl });
}

export function getTronAddressFromPrivateKey(privateKey: string): string {
  const tronweb = createTronWeb(privateKey);
  const address = tronweb.address.fromPrivateKey(privateKey);
  if (!address) {
    throw new Error('Unable to derive TRON address from private key');
  }
  return address;
}

export function formatTronTokenAmount(rawAmount: string | number | bigint, decimals = TRON_USDT_DECIMALS): string {
  const value = BigInt(String(rawAmount));
  const unit = 10n ** BigInt(decimals);
  const whole = value / unit;
  const fraction = value % unit;

  if (fraction === 0n) return whole.toString();

  return `${whole}.${fraction.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
}

export function parseUSDTAmountToBase(amount: string): bigint {
  const sanitized = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(sanitized)) {
    throw new Error('Invalid USDT amount');
  }

  const [wholePart, fractionPart = ''] = sanitized.split('.');
  const paddedFraction = fractionPart.padEnd(TRON_USDT_DECIMALS, '0').slice(0, TRON_USDT_DECIMALS);

  return BigInt(wholePart || '0') * 1_000_000n + BigInt(paddedFraction);
}

export async function getTronUSDTBalance(address: string, rpcUrl?: string): Promise<TronBalance> {
  try {
    const tronweb = createTronWeb(undefined, rpcUrl);
    const contract = tronweb.contract(TRON_USDT_ABI, TRON_USDT_ADDRESS);
    const raw = await contract.balanceOf(address).call();
    const rawString = raw?.toString?.() ?? String(raw);

    return {
      raw: rawString,
      formatted: formatTronTokenAmount(rawString),
      decimals: TRON_USDT_DECIMALS,
    };
  } catch (error) {
    logger.error('Failed to fetch TRC-20 USDT balance', error as Error);
    throw error;
  }
}

export async function getTronTRXBalance(address: string, rpcUrl?: string): Promise<TronBalance> {
  try {
    const tronweb = createTronWeb(undefined, rpcUrl);
    const rawSun = await tronweb.trx.getBalance(address);
    return {
      raw: String(rawSun),
      formatted: formatTronTokenAmount(String(rawSun), 6),
      decimals: 6,
    };
  } catch (error) {
    logger.error('Failed to fetch TRX balance', error as Error);
    throw error;
  }
}

export async function sendTronUSDT(params: TronSendUSDTParams): Promise<TronTransactionResult> {
  try {
    const tronweb = createTronWeb(params.privateKey, params.rpcUrl);
    const from = tronweb.address.fromPrivateKey(params.privateKey);

    if (!from) {
      throw new Error('Unable to derive TRON sender address');
    }

    if (from.toLowerCase() !== params.fromAddress.toLowerCase()) {
      throw new Error('Private key does not match the custodial wallet address');
    }

    const value = parseUSDTAmountToBase(params.amount);
    const feeLimit = params.feeLimit ?? DEFAULT_TRON_USDT_FEE_LIMIT;
    const contract = tronweb.contract(TRON_USDT_ABI, TRON_USDT_ADDRESS);

    const hash = await contract.transfer(params.to, value.toString()).send(
      {
        from,
        feeLimit,
        shouldPollResponse: false,
      },
      params.privateKey
    );

    const status = await getTronTransactionStatus(hash, params.rpcUrl);

    return {
      hash,
      status,
      from,
      to: params.to,
      value,
      feeLimit,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to send TRC-20 USDT', error as Error);
    throw error;
  }
}

export async function getTronTransactionStatus(
  hash: string,
  rpcUrl?: string
): Promise<'pending' | 'confirmed' | 'failed'> {
  try {
    const tronweb = createTronWeb(undefined, rpcUrl);
    const info = await tronweb.trx.getTransactionInfo(hash);
    const result = info?.receipt?.result ?? info?.result;

    if (result === 'SUCCESS') return 'confirmed';
    if (result === 'FAILED') return 'failed';

    return 'pending';
  } catch {
    return 'pending';
  }
}

export function getTronExplorerTxUrl(hash: string): string {
  return `https://tronscan.org/#/transaction/${hash}`;
}

export function getTronExplorerAddressUrl(address: string): string {
  return `https://tronscan.org/#/address/${address}`;
}

export function getExplorerTxUrl(chain: ChainKey, hash: string): string {
  if (chain === 'tron') return getTronExplorerTxUrl(hash);

  throw new Error('TRON explorer helper only supports tron');
}
