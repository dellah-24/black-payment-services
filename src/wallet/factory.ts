/**
 * BlackPayments Wallet - Factory Functions
 * 
 * Helper functions to create and configure BlackPayments Wallet instances
 */

import { ethers, Wallet, Mnemonic, HDNodeWallet } from 'ethers';
import { BlackPaymentsWallet } from './BlackPaymentsWallet';
import { WalletChain } from './types';
import { getSupportedChains } from './chains';

/**
 * Generate a random mnemonic phrase
 */
export function generateMnemonic(wordCount: 12 | 24 = 12): string {
  const wallet = Wallet.createRandom();
  return wallet.mnemonic?.phrase || '';
}

/**
 * Validate a mnemonic phrase
 */
export function validateMnemonic(mnemonic: string): boolean {
  try {
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      return false;
    }
    // Try to derive an address to validate
    Mnemonic.fromPhrase(mnemonic);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a private key
 */
export function validatePrivateKey(privateKey: string): boolean {
  try {
    new Wallet(privateKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a new BlackPayments Wallet with a randomly generated mnemonic
 */
export async function createWallet(
  chains: WalletChain[] = [WalletChain.ETHEREUM, WalletChain.POLYGON, WalletChain.BSC],
  options: {
    isTestnet?: boolean;
    customRpcUrls?: Partial<Record<WalletChain, string>>;
  } = {}
): Promise<BlackPaymentsWallet> {
  const { isTestnet = false, customRpcUrls } = options;
  
  // Generate a new mnemonic
  const mnemonic = generateMnemonic(12);
  
  // Convert customRpcUrls to Record if provided
  const rpcUrls = customRpcUrls as Record<WalletChain, string> | undefined;
  
  // Create the wallet
  const wallet = new BlackPaymentsWallet(
    mnemonic,
    chains,
    isTestnet,
    rpcUrls
  );
  
  // Initialize and get addresses
  await wallet.initialize();
  
  return wallet;
}

/**
 * Create a BlackPayments Wallet with an existing mnemonic
 */
export async function createWalletWithExistingSeed(
  mnemonic: string,
  chains: WalletChain[] = [WalletChain.ETHEREUM, WalletChain.POLYGON, WalletChain.BSC],
  options: {
    isTestnet?: boolean;
    customRpcUrls?: Partial<Record<WalletChain, string>>;
  } = {}
): Promise<BlackPaymentsWallet> {
  const { isTestnet = false, customRpcUrls } = options;
  
  // Validate the mnemonic
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic. Must be 12 or 24 words.');
  }
  
  // Convert customRpcUrls to Record if provided
  const rpcUrls = customRpcUrls as Record<WalletChain, string> | undefined;
  
  // Create the wallet
  const wallet = new BlackPaymentsWallet(
    mnemonic,
    chains,
    isTestnet,
    rpcUrls
  );
  
  // Initialize and get addresses
  await wallet.initialize();
  
  return wallet;
}

/**
 * Create a BlackPayments Wallet with an existing private key
 */
export async function createWalletWithPrivateKey(
  privateKey: string,
  chains: WalletChain[] = [WalletChain.ETHEREUM, WalletChain.POLYGON, WalletChain.BSC],
  options: {
    isTestnet?: boolean;
    customRpcUrls?: Partial<Record<WalletChain, string>>;
  } = {}
): Promise<BlackPaymentsWallet> {
  const { isTestnet = false, customRpcUrls } = options;
  
  // Validate the private key
  if (!validatePrivateKey(privateKey)) {
    throw new Error('Invalid private key. Must be a valid Ethereum private key (64 hex chars with 0x prefix).');
  }
  
  // Convert customRpcUrls to Record if provided
  const rpcUrls = customRpcUrls as Record<WalletChain, string> | undefined;
  
  // Create the wallet
  const wallet = new BlackPaymentsWallet(
    privateKey,
    chains,
    isTestnet,
    rpcUrls
  );
  
  // Initialize and get addresses
  await wallet.initialize();
  
  return wallet;
}

/**
 * Create a wallet with all supported chains
 */
export async function createFullWallet(
  options: {
    isTestnet?: boolean;
    customRpcUrls?: Partial<Record<WalletChain, string>>;
  } = {}
): Promise<BlackPaymentsWallet> {
  const chains = getSupportedChains();
  return createWallet(chains, options);
}

/**
 * Create a test wallet (uses testnet)
 */
export async function createTestWallet(
  chains: WalletChain[] = [WalletChain.ETHEREUM, WalletChain.POLYGON],
  options: {
    customRpcUrls?: Partial<Record<WalletChain, string>>;
  } = {}
): Promise<BlackPaymentsWallet> {
  return createWallet(chains, { ...options, isTestnet: true });
}

/**
 * Get address from mnemonic without creating wallet
 */
export function getAddressFromMnemonic(
  mnemonic: string,
  chain: WalletChain = WalletChain.ETHEREUM
): string {
  // Chain parameter is kept for future use when we support different derivation paths
  const hdWallet = HDNodeWallet.fromPhrase(mnemonic);
  return hdWallet.address;
}
