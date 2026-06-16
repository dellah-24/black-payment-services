import { HDNodeWallet, JsonRpcProvider, Mnemonic, Wallet } from 'ethers';
import { TronWeb } from 'tronweb';
import { ChainKey, CHAINS } from '@/config/chains';
import { WalletChain } from '@/wallet/types';

export type HDWalletChainKey = Exclude<ChainKey, 'solana'> | 'bitcoin';

export interface HDBIP44Options {
  chain: HDWalletChainKey | WalletChain;
  accountIndex?: number;
  change?: number;
  addressIndex?: number;
}

export interface DerivedHDKey {
  chain: HDWalletChainKey | WalletChain;
  path: string;
  privateKey: string;
  address: string;
  publicKey: string;
  coinType: number;
}

export const COIN_TYPES: Record<string, number> = {
  ethereum: 60,
  polygon: 60,
  bsc: 60,
  arbitrum: 60,
  optimism: 60,
  avalanche: 60,
  celo: 60,
  linea: 60,
  base: 60,
  tron: 195,
  bitcoin: 0,
  litecoin: 2,
  dogecoin: 3,
  dash: 5,
};

const EVM_CHAINS = new Set<HDWalletChainKey>([
  'ethereum',
  'polygon',
  'bsc',
  'arbitrum',
  'optimism',
  'avalanche',
  'celo',
  'linea',
  'base',
]);

export function normalizeChainKey(chain: HDWalletChainKey | WalletChain): HDWalletChainKey {
  const key = String(chain).toLowerCase();
  if (key === WalletChain.POLYGON) return 'polygon';
  if (key === WalletChain.BSC) return 'bsc';
  if (key === WalletChain.ARBITRUM) return 'arbitrum';
  if (key === WalletChain.OPTIMISM) return 'optimism';
  if (key === WalletChain.AVALANCHE) return 'avalanche';
  if (key === WalletChain.CELO) return 'celo';
  if (key === WalletChain.LINEA) return 'linea';
  if (key === WalletChain.BASE) return 'base';
  if (key === WalletChain.TRON) return 'tron';
  if (key === WalletChain.BITCOIN) return 'bitcoin';
  if (key === 'tron' || key === 'ethereum' || key === 'bsc' || key === 'polygon' || key === 'arbitrum' || key === 'optimism' || key === 'avalanche' || key === 'celo' || key === 'linea' || key === 'base') {
    return key;
  }

  throw new Error(`Unsupported HD wallet chain: ${chain}`);
}

export function getCoinType(chain: HDWalletChainKey | WalletChain): number {
  const normalized = normalizeChainKey(chain);
  return COIN_TYPES[normalized] ?? 60;
}

export function getBIP44Path(options: HDBIP44Options): string {
  const chain = normalizeChainKey(options.chain);
  const coinType = getCoinType(chain);
  const account = options.accountIndex ?? 0;
  const change = options.change ?? 0;
  const addressIndex = options.addressIndex ?? 0;

  assertNonNegativeIndex(account, 'accountIndex');
  assertNonNegativeIndex(change, 'change');
  assertNonNegativeIndex(addressIndex, 'addressIndex');

  return `m/44'/${coinType}'/0'/${change}/${addressIndex}`;
}

export function getDepositPath(chain: HDWalletChainKey | WalletChain, accountIndex = 0): string {
  return getBIP44Path({ chain, accountIndex, change: 0, addressIndex: 0 });
}

export function isMnemonic(value: string): boolean {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.length === 12 || words.length === 24;
}

export function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().replace(/\s+/g, ' ');
}

export function validateMnemonic(mnemonic: string): boolean {
  try {
    Mnemonic.fromPhrase(normalizeMnemonic(mnemonic));
    return true;
  } catch {
    return false;
  }
}

export function generateMnemonic(_wordCount: 12 | 24 = 24): string {
  return Wallet.createRandom().mnemonic?.phrase || '';
}

export function deriveHDPrivateKey(mnemonic: string, chain: HDWalletChainKey | WalletChain, accountIndex = 0): string {
  const normalizedMnemonic = normalizeMnemonic(mnemonic);
  if (!validateMnemonic(normalizedMnemonic)) {
    throw new Error('Invalid BIP-39 mnemonic');
  }

  const path = getBIP44Path({ chain, accountIndex });
  return HDNodeWallet.fromPhrase(normalizedMnemonic, undefined, path).privateKey;
}

export function deriveHDKey(mnemonic: string, chain: HDWalletChainKey | WalletChain, accountIndex = 0): DerivedHDKey {
  const normalizedChain = normalizeChainKey(chain);
  const path = getBIP44Path({ chain: normalizedChain, accountIndex });
  const hdWallet = HDNodeWallet.fromPhrase(normalizeMnemonic(mnemonic), undefined, path);

  if (normalizedChain === 'tron') {
    const tronweb = new TronWeb({
      fullNode: CHAINS.tron.rpcUrls[0],
      solidityNode: CHAINS.tron.rpcUrls[0],
      eventServer: CHAINS.tron.rpcUrls[0],
    });
    const tronAddress = tronweb.address.fromPrivateKey(hdWallet.privateKey);
    if (!tronAddress) {
      throw new Error('Unable to derive TRON address from HD private key');
    }

    return {
      chain: normalizedChain,
      path,
      privateKey: hdWallet.privateKey,
      address: tronAddress,
      publicKey: hdWallet.publicKey,
      coinType: getCoinType(normalizedChain),
    };
  }

  return {
    chain: normalizedChain,
    path,
    privateKey: hdWallet.privateKey,
    address: hdWallet.address,
    publicKey: hdWallet.publicKey,
    coinType: getCoinType(normalizedChain),
  };
}

export function deriveEVMWallet(mnemonic: string, chain: HDWalletChainKey, accountIndex = 0, rpcUrl?: string): Wallet {
  const normalizedChain = normalizeChainKey(chain);
  if (!EVM_CHAINS.has(normalizedChain)) {
    throw new Error(`Chain ${chain} is not an EVM HD wallet chain`);
  }

  const hdWallet = HDNodeWallet.fromPhrase(normalizeMnemonic(mnemonic), undefined, getBIP44Path({ chain: normalizedChain, accountIndex }));
  return rpcUrl ? new Wallet(hdWallet.privateKey, new JsonRpcProvider(rpcUrl)) : new Wallet(hdWallet.privateKey);
}

export function deriveTronPrivateKey(mnemonic: string, accountIndex = 0): string {
  return deriveHDPrivateKey(mnemonic, 'tron', accountIndex);
}

function assertNonNegativeIndex(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
}
