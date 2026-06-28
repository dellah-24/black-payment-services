import { ethers, JsonRpcProvider, Wallet } from 'ethers';
import { TronWeb } from 'tronweb';
import { CHAINS, ChainKey, getChainConfig } from '@/config/chains';
import { getEnv, isLocalhostUrl, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';
import { WalletChain } from '@/wallet/types';

export type EVMChainKey = Exclude<ChainKey, 'tron' | 'solana'>;

export const EVM_USDT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

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
];

export interface TronNodeUrls {
  fullNode: string;
  solidityNode: string;
  eventServer: string;
}

export interface BlockchainNodeHealth {
  chain: ChainKey;
  ok: boolean;
  blockNumber?: number | string;
  error?: string;
  checkedAt: string;
}

export function toWalletChain(chain: ChainKey | WalletChain): WalletChain {
  const key = String(chain).toLowerCase();
  if (key === 'ethereum') return WalletChain.ETHEREUM;
  if (key === 'bsc') return WalletChain.BSC;
  if (key === 'polygon') return WalletChain.POLYGON;
  if (key === 'arbitrum') return WalletChain.ARBITRUM;
  if (key === 'optimism') return WalletChain.OPTIMISM;
  if (key === 'avalanche') return WalletChain.AVALANCHE;
  if (key === 'celo') return WalletChain.CELO;
  if (key === 'linea') return WalletChain.LINEA;
  if (key === 'base') return WalletChain.BASE;
  if (key === 'tron') return WalletChain.TRON;
  if (key === 'solana') return WalletChain.SOLANA;
  throw new Error(`Unsupported chain: ${chain}`);
}

export function getRuntimeEnv(name: string): string | undefined {
  return typeof process !== 'undefined' ? getEnv(name) : undefined;
}

function assertProductionRpcUrl(name: string, value: string | undefined): void {
  if (!isProduction()) return;
  if (!value) {
    throw new Error(`${name} is required in production. Configure a dedicated RPC endpoint for ${name.replace('_RPC_URL', '').replace('NEXT_PUBLIC_', '').toLowerCase()}.`);
  }
  if (isLocalhostUrl(value)) {
    throw new Error(`${name} must point to a production RPC endpoint, not localhost.`);
  }
}

export function getEnvRpcUrl(chain: ChainKey): string | undefined {
  const envName = `${chain.toUpperCase()}_RPC_URL`;
  const publicEnvName = `NEXT_PUBLIC_${chain.toUpperCase()}_RPC`;
  return getRuntimeEnv(envName) || getRuntimeEnv(publicEnvName);
}

export function getEVMChainKey(chain: ChainKey | WalletChain): EVMChainKey {
  const key = String(chain).toLowerCase() as ChainKey;
  if (key === 'tron' || key === 'solana') {
    throw new Error(`${chain} is not an EVM chain`);
  }
  return key as EVMChainKey;
}

export function getEVMProvider(chain: ChainKey | WalletChain, customRpcUrl?: string): JsonRpcProvider {
  const chainKey = getEVMChainKey(chain);
  const envName = `${chainKey.toUpperCase()}_RPC_URL`;
  const publicEnvName = `NEXT_PUBLIC_${chainKey.toUpperCase()}_RPC`;
  const rpcUrl = customRpcUrl || getEnvRpcUrl(chainKey);
  assertProductionRpcUrl(customRpcUrl ? 'customRpcUrl' : envName, rpcUrl);
  if (!rpcUrl) {
    if (isProduction()) {
      throw new Error(`${envName} or ${publicEnvName} is required in production.`);
    }
    return new JsonRpcProvider(getChainConfig(chainKey).rpcUrls[0]);
  }
  return new JsonRpcProvider(rpcUrl);
}

export function getEVMWallet(chain: ChainKey | WalletChain, privateKey: string, customRpcUrl?: string): Wallet {
  return new Wallet(privateKey, getEVMProvider(chain, customRpcUrl));
}

export function getTronEnvUrls(): TronNodeUrls {
  const fallback = getChainConfig('tron').rpcUrls[0];
  const fullNodeValue = getRuntimeEnv('TRON_FULL_NODE') || getRuntimeEnv('TRON_RPC_URL') || getRuntimeEnv('NEXT_PUBLIC_TRON_RPC');
  assertProductionRpcUrl('TRON_FULL_NODE', fullNodeValue);
  const fullNode = normalizeTronNodeUrl(fullNodeValue || fallback);
  const solidityNodeValue = getRuntimeEnv('TRON_SOLIDITY_NODE') || fullNode;
  assertProductionRpcUrl('TRON_SOLIDITY_NODE', solidityNodeValue);
  const eventServerValue = getRuntimeEnv('TRON_EVENT_SERVER') || fullNode;
  assertProductionRpcUrl('TRON_EVENT_SERVER', eventServerValue);
  const solidityNode = normalizeTronNodeUrl(solidityNodeValue);
  const eventServer = normalizeTronNodeUrl(eventServerValue);

  return { fullNode, solidityNode, eventServer };
}

export function normalizeTronNodeUrl(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

export function getTronWeb(privateKey?: string, options?: { rpcUrl?: string; fullNode?: string; solidityNode?: string; eventServer?: string }): TronWeb {
  const urls = getTronEnvUrls();
  const rpcUrl = options?.rpcUrl ? normalizeTronNodeUrl(options.rpcUrl) : undefined;
  const tronweb = new TronWeb({
    fullNode: options?.fullNode ? normalizeTronNodeUrl(options.fullNode) : rpcUrl || urls.fullNode,
    solidityNode: options?.solidityNode ? normalizeTronNodeUrl(options.solidityNode) : rpcUrl || urls.solidityNode,
    eventServer: options?.eventServer ? normalizeTronNodeUrl(options.eventServer) : rpcUrl || urls.eventServer,
  });

  if (privateKey) {
    tronweb.setPrivateKey(privateKey);
    const address = tronweb.address.fromPrivateKey(privateKey);
    if (address) {
      tronweb.defaultAddress = {
        base58: address,
        hex: tronweb.address.toHex(address),
      };
    }
  }

  return tronweb;
}

export async function readEVMBlockNumber(chain: ChainKey | WalletChain, customRpcUrl?: string): Promise<number> {
  const provider = getEVMProvider(chain, customRpcUrl);
  return Number(await provider.getBlockNumber());
}

export async function readEVMUSDTBalance(chain: ChainKey | WalletChain, address: string): Promise<bigint> {
  const chainKey = getEVMChainKey(chain);
  const config = getChainConfig(chainKey);
  const provider = getEVMProvider(chainKey);
  const contract = new ethers.Contract(config.usdtAddress, EVM_USDT_ABI, provider);
  return BigInt(await contract.balanceOf(address));
}

export async function writeEVMUSDTTransfer(params: {
  chain: ChainKey | WalletChain;
  privateKey: string;
  to: string;
  amount: bigint;
  customRpcUrl?: string;
}): Promise<string> {
  const wallet = getEVMWallet(params.chain, params.privateKey, params.customRpcUrl);
  const chainKey = getEVMChainKey(params.chain);
  const config = getChainConfig(chainKey);
  const contract = new ethers.Contract(config.usdtAddress, EVM_USDT_ABI, wallet);
  const tx = await contract.transfer(params.to, params.amount);
  const receipt = await tx.wait();
  return receipt?.hash || tx.hash;
}

export async function readTronBlockNumber(): Promise<number> {
  const tronweb = getTronWeb();
  const block = await tronweb.trx.getCurrentBlock();
  return Number(block?.block_header?.raw_data?.number ?? block?.blockID?.slice(0, 16) ?? 0);
}

export async function readTronUSDTBalance(address: string): Promise<bigint> {
  const tronweb = getTronWeb();
  const contract = tronweb.contract(TRON_USDT_ABI, CHAINS.tron.usdtAddress);
  const raw = await contract.balanceOf(address).call();
  return BigInt(raw?.toString?.() ?? String(raw));
}

export async function writeTronUSDTTransfer(params: {
  privateKey: string;
  to: string;
  amount: bigint;
  feeLimit?: number;
  rpcUrl?: string;
}): Promise<string> {
  const tronweb = getTronWeb(params.privateKey, { rpcUrl: params.rpcUrl });
  const from = tronweb.address.fromPrivateKey(params.privateKey);
  if (!from) {
    throw new Error('Unable to derive TRON sender address');
  }

  const contract = tronweb.contract(TRON_USDT_ABI, CHAINS.tron.usdtAddress);
  const txHash = await contract.transfer(params.to, params.amount.toString()).send(
    {
      from,
      feeLimit: params.feeLimit ?? 14_900_000,
      shouldPollResponse: false,
    },
    params.privateKey
  );
  return String(txHash);
}

export async function checkNodeHealth(chain: ChainKey | WalletChain): Promise<BlockchainNodeHealth> {
  const chainKey = String(chain).toLowerCase() as ChainKey;
  try {
    if (chainKey === 'tron') {
      const blockNumber = await readTronBlockNumber();
      return { chain: 'tron', ok: true, blockNumber, checkedAt: new Date().toISOString() };
    }

    if (chainKey === 'solana') {
      return { chain: 'solana', ok: false, error: 'Solana node health is not implemented in this MVP layer', checkedAt: new Date().toISOString() };
    }

    const blockNumber = await readEVMBlockNumber(chainKey);
    return { chain: chainKey, ok: true, blockNumber, checkedAt: new Date().toISOString() };
  } catch (error) {
    logger.error(`Blockchain node health check failed for ${chainKey}`, error as Error);
    return { chain: chainKey, ok: false, error: error instanceof Error ? error.message : 'Unknown node error', checkedAt: new Date().toISOString() };
  }
}
