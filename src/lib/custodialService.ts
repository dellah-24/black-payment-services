import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  assertCustodyReady,
  CUSTODIAL_TOKEN,
  CUSTODIAL_TOKEN_DECIMALS,
  CustodialChain,
  formatCustodialUSDTAmount,
  getCustodialExplorerTxUrl,
  getCustodyReadiness,
  isCustodialChain,
  parseCustodialUSDTAmount,
  toWalletChain,
  validateCustodialAddress,
} from '@/lib/custodyPolicy';
import { createCustodialKeyManagerFromEnv, type CustodialKeyManager } from '@/lib/custodialKeyManager';
import { getEnv, isPlaceholder, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';
import { IdempotencyStore, WithdrawalLock } from '@/lib/redis';
import { readEVMUSDTBalance } from '@/lib/blockchainNodes';
import { getTronTRXBalance, getTronUSDTBalance } from '@/lib/tronWallet';

export interface CustodialAddressRecord {
  id: string;
  user_id: string;
  chain: string;
  address: string;
  derivation_path: string;
  account_index: number;
  purpose: 'deposit' | 'withdrawal' | 'hot' | 'cold';
  status: 'active' | 'inactive' | 'revoked';
  created_at: string;
  updated_at: string;
}

export interface CustodialWithdrawalRecord {
  id: string;
  user_id: string;
  chain: string;
  token: string;
  amount: string;
  amount_base: string;
  to_address: string;
  from_address: string | null;
  tx_hash: string | null;
  status: 'pending' | 'processing' | 'confirmed' | 'failed' | 'cancelled';
  fee: string;
  idempotency_key: string;
  explorer_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustodialDepositRecord {
  id: string;
  user_id: string;
  custody_address_id: string | null;
  chain: string;
  token: string;
  amount: string;
  amount_base: string;
  tx_hash: string;
  from_address: string | null;
  to_address: string;
  block_number: number | null;
  status: 'detected' | 'confirmed' | 'failed';
  created_at: string;
}

export interface CustodialBalance {
  chain: CustodialChain;
  token: 'USDT' | 'TRX';
  address: string;
  balance: string;
  raw: string;
  decimals: number;
}

export interface CustodialWithdrawalInput {
  userId: string;
  chain: CustodialChain;
  to: string;
  amount: string;
  idempotencyKey: string;
  memo?: string;
}

export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const supabase = getCustodialSupabaseClient();
  const cookieHeader = request.headers.get('cookie');

  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    const { data } = await supabase.auth.getUser(authorization.slice('Bearer '.length));
    if (data?.user) {
      return data.user.id;
    }
  }

  if (cookieHeader) {
    const accessToken = getAccessTokenFromSupabaseCookie(cookieHeader) ?? request.cookies.get('access-token')?.value ?? null;
    if (accessToken) {
      const { data } = await supabase.auth.getUser(accessToken);
      if (data?.user) {
        return data.user.id;
      }
    }
  }

  return null;
}

function getAccessTokenFromSupabaseCookie(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|; )(sb-[a-z0-9-]+-auth-token)=([^;]+)/);
  if (!match) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeURIComponent(match[2])) as { access_token?: string };
    return payload.access_token ?? null;
  } catch {
    return null;
  }
}

export function createCustodialKeyManagerForRequest(): CustodialKeyManager {
  assertCustodyReady({ requireSupabaseServiceRole: true });
  return createCustodialKeyManagerFromEnv();
}

export async function ensureCustodialAddress(params: {
  keyManager?: CustodialKeyManager;
  userId: string;
  chain: CustodialChain;
  accountIndex?: number;
  purpose?: 'deposit' | 'withdrawal' | 'hot' | 'cold';
}): Promise<CustodialAddressRecord> {
  assertCustodyReady({ requireSupabaseServiceRole: true });

  const supabase = getCustodialSupabaseClient();
  const keyManager = params.keyManager ?? createCustodialKeyManagerForRequest();
  const accountIndex = params.accountIndex ?? 0;
  const purpose = params.purpose ?? 'deposit';

  const existing = await supabase
    .from('custody_addresses')
    .select('*')
    .eq('user_id', params.userId)
    .eq('chain', params.chain)
    .eq('purpose', purpose)
    .eq('account_index', accountIndex)
    .eq('status', 'active')
    .maybeSingle();

  if (existing.data) {
    return existing.data as CustodialAddressRecord;
  }

  const derived = await keyManager.deriveKey({
    userId: params.userId,
    chain: toWalletChain(params.chain),
    accountIndex,
    purpose,
  });

  const { data, error } = await supabase
    .from('custody_addresses')
    .insert({
      user_id: params.userId,
      chain: params.chain,
      address: derived.address,
      derivation_path: derived.path,
      account_index: accountIndex,
      purpose,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    const duplicate = await supabase
      .from('custody_addresses')
      .select('*')
      .eq('user_id', params.userId)
      .eq('chain', params.chain)
      .eq('purpose', purpose)
      .eq('account_index', accountIndex)
      .eq('status', 'active')
      .maybeSingle();

    if (duplicate.data) {
      return duplicate.data as CustodialAddressRecord;
    }

    throw error;
  }

  return data as CustodialAddressRecord;
}

export async function getCustodialAddresses(params: { userId: string; chain?: CustodialChain }): Promise<CustodialAddressRecord[]> {
  assertCustodyReady({ requireSupabaseServiceRole: true });

  const supabase = getCustodialSupabaseClient();
  let query = supabase.from('custody_addresses').select('*').eq('user_id', params.userId).eq('status', 'active').order('created_at', { ascending: false });

  if (params.chain) {
    query = query.eq('chain', params.chain);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as CustodialAddressRecord[];
}

export async function getCustodialBalances(params: { userId: string; chain?: CustodialChain }): Promise<CustodialBalance[]> {
  assertCustodyReady({ requireSupabaseServiceRole: true });

  const addresses = await getCustodialAddresses(params);
  const depositAddresses = addresses.filter((address) => address.purpose === 'deposit');
  const balances: CustodialBalance[] = [];

  for (const address of depositAddresses) {
    if (!isCustodialChain(address.chain)) continue;
    const chain = address.chain;

    if (chain === 'tron') {
      const usdt = await getTronUSDTBalance(address.address);
      const trx = await getTronTRXBalance(address.address);
      balances.push({ chain, token: 'USDT', address: address.address, balance: usdt.formatted, raw: usdt.raw, decimals: usdt.decimals });
      balances.push({ chain, token: 'TRX', address: address.address, balance: trx.formatted, raw: trx.raw, decimals: trx.decimals });
    } else {
      const raw = await readEVMUSDTBalance(chain, address.address);
      balances.push({
        chain,
        token: 'USDT',
        address: address.address,
        balance: formatCustodialUSDTAmount(raw, CUSTODIAL_TOKEN_DECIMALS),
        raw: raw.toString(),
        decimals: CUSTODIAL_TOKEN_DECIMALS,
      });
    }
  }

  return balances;
}

export async function submitCustodialWithdrawal(params: CustodialWithdrawalInput): Promise<CustodialWithdrawalRecord> {
  assertCustodyReady({ requireSupabaseServiceRole: true });

  if (!validateCustodialAddress(params.chain, params.to)) {
    throw new Error(`Invalid ${params.chain.toUpperCase()} recipient address`);
  }

  const amountBase = parseCustodialUSDTAmount(params.amount, CUSTODIAL_TOKEN_DECIMALS);
  const supabase = getCustodialSupabaseClient();
  const keyManager = createCustodialKeyManagerForRequest();
  const locks = new WithdrawalLock();
  const idempotency = new IdempotencyStore();

  if (!(await locks.tryAcquire(params.userId))) {
    throw new Error('Another withdrawal is already processing for this user');
  }

  try {
    const duplicate = await supabase
      .from('custodial_withdrawals')
      .select('*')
      .eq('user_id', params.userId)
      .eq('idempotency_key', params.idempotencyKey)
      .maybeSingle();

    if (duplicate.data) {
      return duplicate.data as CustodialWithdrawalRecord;
    }

    const withdrawalAddress = await ensureCustodialAddress({
      keyManager,
      userId: params.userId,
      chain: params.chain,
      accountIndex: 0,
      purpose: 'withdrawal',
    });

    const { data: inserted, error: insertError } = await supabase
      .from('custodial_withdrawals')
      .insert({
        user_id: params.userId,
        chain: params.chain,
        token: CUSTODIAL_TOKEN,
        amount: params.amount,
        amount_base: amountBase.toString(),
        to_address: params.to,
        from_address: withdrawalAddress.address,
        status: 'pending',
        fee: params.chain === 'tron' ? '14.9' : '0',
        idempotency_key: params.idempotencyKey,
        explorer_url: null,
        metadata: params.memo ? { memo: params.memo } : {},
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    await supabase.from('custodial_withdrawals').update({ status: 'processing' }).eq('id', inserted.id);

    const txHash = params.chain === 'tron'
      ? await keyManager.signAndBroadcastTronTransaction({
          userId: params.userId,
          accountIndex: 0,
          to: params.to,
          amount: amountBase,
          feeLimit: 14_900_000,
        })
      : await keyManager.signAndBroadcastEVMTransaction({
          userId: params.userId,
          chain: toWalletChain(params.chain),
          accountIndex: 0,
          to: params.to,
          value: amountBase,
        });

    const explorerUrl = getCustodialExplorerTxUrl(params.chain, txHash);
    const { data: updated, error: updateError } = await supabase
      .from('custodial_withdrawals')
      .update({
        status: 'confirmed',
        tx_hash: txHash,
        explorer_url: explorerUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inserted.id)
      .select()
      .single();

    await idempotency.set(params.idempotencyKey, { withdrawalId: inserted.id, txHash }, 24 * 60 * 60 * 1000);

    if (updateError) {
      throw updateError;
    }

    return updated as CustodialWithdrawalRecord;
  } catch (error) {
    logger.error('Custodial withdrawal failed', error as Error);
    await supabase
      .from('custodial_withdrawals')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('user_id', params.userId)
      .eq('idempotency_key', params.idempotencyKey);
    throw error;
  } finally {
    await locks.release(params.userId);
  }
}

export async function getCustodialWithdrawals(params: { userId: string; limit?: number }): Promise<CustodialWithdrawalRecord[]> {
  assertCustodyReady({ requireSupabaseServiceRole: true });

  const supabase = getCustodialSupabaseClient();
  const { data, error } = await supabase
    .from('custodial_withdrawals')
    .select('*')
    .eq('user_id', params.userId)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50);

  if (error) {
    throw error;
  }

  return (data ?? []) as CustodialWithdrawalRecord[];
}

export async function getCustodialDeposits(params: { userId: string; limit?: number }): Promise<CustodialDepositRecord[]> {
  assertCustodyReady({ requireSupabaseServiceRole: true });

  const supabase = getCustodialSupabaseClient();
  const { data, error } = await supabase
    .from('custodial_deposits')
    .select('*')
    .eq('user_id', params.userId)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50);

  if (error) {
    throw error;
  }

  return (data ?? []) as CustodialDepositRecord[];
}

export function getCustodialReadiness() {
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const redisUrl = getEnv('REDIS_REST_URL') || getEnv('UPSTASH_REDIS_REST_URL');
  const redisToken = getEnv('REDIS_REST_TOKEN') || getEnv('UPSTASH_REDIS_REST_TOKEN');
  return {
    ...getCustodyReadiness(),
    supabase: !isPlaceholder(serviceRoleKey),
    redis: !isPlaceholder(redisUrl) && !isPlaceholder(redisToken),
    production: isProduction(),
  };
}
