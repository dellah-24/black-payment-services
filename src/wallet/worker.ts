import { HotWallet } from './HotWallet';
import { LocalSigner, RemoteSigner } from './signer';
import { appendAudit } from './audit';
import { WalletChain } from './types';
import { logger } from '@/lib/logger';

// jobs/db may export claimNextPending; fall back to fetchNextPending
let jobDb: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  jobDb = require('./jobs/db');
} catch (e) {
  jobDb = null;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createSignersFromEnv(): Promise<Record<WalletChain, any>> {
  // Example env vars:
  // HOT_SIGNER_ETHEREUM=privateKey or HOT_SIGNER_ETHEREUM_ENDPOINT=https://signer
  const signers: Record<string, any> = {};
  const env = process.env;
  const possibleChains = Object.values(WalletChain);
  for (const c of possibleChains) {
    const keyVar = `HOT_SIGNER_${c.toUpperCase()}`;
    const endpointVar = `HOT_SIGNER_${c.toUpperCase()}_ENDPOINT`;
    if (env[keyVar]) {
      const pk = env[keyVar]!;
      const wallet = new (await import('ethers')).Wallet(pk);
      signers[c] = new LocalSigner(wallet);
    } else if (env[endpointVar]) {
      signers[c] = new RemoteSigner(env[endpointVar]!);
    }
  }
  return signers as Record<WalletChain, any>;
}

async function main() {
  // try to load job DB
  let jobDbAvailable = true;
  try {
    await import('./jobs/db');
  } catch (e) {
    jobDbAvailable = false;
  }

  const signers = await createSignersFromEnv();

  // Basic config from env
  const chains = (process.env.HOT_WALLET_CHAINS || 'ethereum').split(',').map((s) => s.trim()) as WalletChain[];
  const config = {
    maxDailyVolume: BigInt(process.env.HOT_MAX_DAILY_VOLUME || '1000000000'),
    replenishmentThreshold: BigInt(process.env.HOT_REPLENISH_THRESHOLD || '100000000'),
    whitelistEnabled: process.env.HOT_WHITELIST_ENABLED === 'true',
  } as any;

  const hot = new HotWallet(signers, chains, config, process.env.NODE_ENV !== 'production');

  const POLL_INTERVAL = Number(process.env.WORKER_POLL_INTERVAL_MS || 5000);

  while (true) {
    try {
      let job: any = null;
      if (jobDb && jobDb.claimNextPending) {
        job = jobDb.claimNextPending();
      } else if (jobDb && jobDb.fetchNextPending) {
        job = jobDb.fetchNextPending();
        if (job && jobDb.markProcessing) jobDb.markProcessing(job.id);
      }

      if (!job) {
        await sleep(POLL_INTERVAL);
        continue;
      }

      const { id, params } = job;
      try {
        appendAudit({ type: 'worker_processing', id, params });
        await hot.sendUSDT(params, id);
        if (jobDb && jobDb.markDone) jobDb.markDone(id);
        appendAudit({ type: 'worker_done', id });
      } catch (err) {
        if (jobDb && jobDb.incrementAttempts) jobDb.incrementAttempts(id);
        if (jobDb && jobDb.markFailed) jobDb.markFailed(id, String(err));
        appendAudit({ type: 'worker_failed', id, error: String(err) });
      }
    } catch (e) {
      logger.error('Worker error', e as Error);
      await sleep(1000);
    }
  }
}

main().catch((e) => {
  logger.error('Worker crashed', e as Error);
  process.exit(1);
});
