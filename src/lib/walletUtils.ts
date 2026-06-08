/**
 * Wallet Utilities - Advanced features for the wallet
 * Includes: QR Code generation, Gas estimation, Transaction simulation, Address book
 */

import { logger } from '@/lib/logger';
import { ethers } from 'ethers';
import QRCodeLib from 'qrcode';

// ============================================
// QR Code Generation
// ============================================

/**
 * Generate QR code as data URL using qrcode library
 */
export async function generateQRCode(address: string, size: number = 200): Promise<string> {
  try {
    // Generate QR code as data URL
    const dataUrl = await QRCodeLib.toDataURL(address, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch (error) {
    logger.error('QR code generation failed', error as Error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Validate an EVM address
 */
export function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Validate a TRON address
 */
export function isValidTronAddress(address: string): boolean {
  if (!address) return false;
  // TRON addresses start with T and are 34 characters
  return /^T[a-zA-Z0-9]{33}$/.test(address);
}

/**
 * Validate any cryptocurrency address based on chain
 */
export function validateAddress(address: string, chain: string): boolean {
  switch (chain.toLowerCase()) {
    case 'tron':
      return isValidTronAddress(address);
    case 'ethereum':
    case 'bsc':
    case 'polygon':
    case 'arbitrum':
    case 'optimism':
    case 'avalanche':
    case 'celo':
    case 'linea':
    case 'base':
      return isValidAddress(address);
    default:
      return isValidAddress(address);
  }
}

// ============================================
// Gas Fee Estimation
// ============================================

export type GasSpeed = 'slow' | 'standard' | 'fast';

export interface GasEstimate {
  slow: string;
  standard: string;
  fast: string;
  slowGwei: string;
  standardGwei: string;
  fastGwei: string;
}

const CHAIN_RPC: Record<string, string> = {
  ethereum: 'https://cloudflare-eth.com',
  bsc: 'https://bsc-dataseed1.binance.org',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
};

/**
 * Estimate gas fees for EVM chains with different speed options
 */
export async function estimateGasFees(chain: string): Promise<GasEstimate> {
  try {
    if (chain === 'tron' || chain === 'solana') {
      // TRON and Solana have different fee models
      return {
        slow: '0.001',
        standard: '0.002',
        fast: '0.005',
        slowGwei: '1',
        standardGwei: '2',
        fastGwei: '5',
      };
    }

    const rpcUrl = CHAIN_RPC[chain];
    if (!rpcUrl) {
      return getDefaultGasEstimate();
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const feeData = await provider.getFeeData();
    
    const baseGasPrice = feeData.gasPrice || BigInt(0);
    
    // Apply multipliers for different speeds
    const slowPrice = baseGasPrice * BigInt(80) / BigInt(100); // 0.8x
    const standardPrice = baseGasPrice; // 1x
    const fastPrice = baseGasPrice * BigInt(125) / BigInt(100); // 1.25x
    
    // Estimate gas limit for USDT transfer
    const gasLimit = BigInt(65000); // Standard USDT transfer
    
    const slowTotal = slowPrice * gasLimit;
    const standardTotal = standardPrice * gasLimit;
    const fastTotal = fastPrice * gasLimit;
    
    return {
      slow: ethers.formatEther(slowTotal),
      standard: ethers.formatEther(standardTotal),
      fast: ethers.formatEther(fastTotal),
      slowGwei: ethers.formatUnits(slowPrice, 'gwei'),
      standardGwei: ethers.formatUnits(standardPrice, 'gwei'),
      fastGwei: ethers.formatUnits(fastPrice, 'gwei'),
    };
  } catch (error) {
    logger.error('Error estimating gas fees', error as Error);
    return getDefaultGasEstimate();
  }
}

function getDefaultGasEstimate(): GasEstimate {
  return {
    slow: '0.001',
    standard: '0.003',
    fast: '0.008',
    slowGwei: '10',
    standardGwei: '30',
    fastGwei: '80',
  };
}

// ============================================
// Transaction Simulation
// ============================================

export interface SimulationResult {
  success: boolean;
  message: string;
  details?: {
    tokenBalance: string;
    nativeBalance: string;
    requiredNative: string;
    willSucceed: boolean;
  };
}

/**
 * Simulate a transaction before sending
 * Checks balance and estimates if transaction will succeed
 */
export async function simulateTransaction(
  chain: string,
  senderAddress: string,
  recipientAddress: string,
  amount: string,
  estimatedFee: string
): Promise<SimulationResult> {
  try {
    if (chain === 'tron' || chain === 'solana') {
      return {
        success: true,
        message: 'Transaction simulation not available for this chain',
      };
    }

    const rpcUrl = CHAIN_RPC[chain];
    if (!rpcUrl) {
      return {
        success: false,
        message: 'Unsupported chain',
      };
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Check sender's USDT balance
    const USDT_ABI = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];
    
    const chainConfig = getChainConfig(chain);
    const usdtContract = new ethers.Contract(chainConfig.usdtAddress, USDT_ABI, provider);
    
    const [usdtBalance, decimals] = await Promise.all([
      usdtContract.balanceOf(senderAddress),
      usdtContract.decimals(),
    ]);
    
    const amountInWei = ethers.parseUnits(amount, Number(decimals));
    const feeInWei = ethers.parseEther(estimatedFee);
    
    // Get native balance for gas
    const nativeBalance = await provider.getBalance(senderAddress);
    
    const willSucceed = usdtBalance >= amountInWei && nativeBalance >= feeInWei;
    
    return {
      success: willSucceed,
      message: willSucceed 
        ? 'Transaction looks good!' 
        : 'Insufficient balance for this transaction',
      details: {
        tokenBalance: ethers.formatUnits(usdtBalance, Number(decimals)),
        nativeBalance: ethers.formatEther(nativeBalance),
        requiredNative: estimatedFee,
        willSucceed,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Simulation failed',
    };
  }
}

function getChainConfig(chain: string) {
  const configs: Record<string, { usdtAddress: string }> = {
    ethereum: { usdtAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
    bsc: { usdtAddress: '0x55d398326f99059fF775485246999027B3197955' },
    arbitrum: { usdtAddress: '0xFd086bC7CD5C481DCC93C85BD42c402bDe6B9614' },
  };
  return configs[chain] || configs.ethereum;
}

// ============================================
// Address Book
// ============================================

export interface AddressBookEntry {
  id: string;
  name: string;
  address: string;
  chain: string;
  createdAt: string;
}

/**
 * Get address book from localStorage
 */
export function getAddressBook(): AddressBookEntry[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('addressBook');
  return data ? JSON.parse(data) : [];
}

/**
 * Save address to address book
 */
export function saveAddress(entry: Omit<AddressBookEntry, 'id' | 'createdAt'>): AddressBookEntry {
  const addressBook = getAddressBook();
  const newEntry: AddressBookEntry = {
    ...entry,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  addressBook.push(newEntry);
  localStorage.setItem('addressBook', JSON.stringify(addressBook));
  return newEntry;
}

/**
 * Remove address from address book
 */
export function removeAddress(id: string): void {
  const addressBook = getAddressBook();
  const filtered = addressBook.filter((entry) => entry.id !== id);
  localStorage.setItem('addressBook', JSON.stringify(filtered));
}

/**
 * Check if address exists in address book
 */
export function findAddressByName(name: string): AddressBookEntry | undefined {
  const addressBook = getAddressBook();
  return addressBook.find((entry) => 
    entry.name.toLowerCase().includes(name.toLowerCase())
  );
}

// ============================================
// Max Amount Calculation
// ============================================

/**
 * Calculate maximum sendable amount considering balance and fees
 */
export async function calculateMaxAmount(
  chain: string,
  address: string,
  tokenBalance: string,
  estimatedFee: string
): Promise<string> {
  try {
    if (chain === 'tron' || chain === 'solana') {
      // For TRON, minimum balance is ~1 TRX
      const minTronBalance = 1;
      return (parseFloat(tokenBalance) - minTronBalance).toString();
    }

    const rpcUrl = CHAIN_RPC[chain];
    if (!rpcUrl) return '0';

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const nativeBalance = await provider.getBalance(address);
    const feeInWei = ethers.parseEther(estimatedFee);
    
    // Available balance = native balance - fee
    const availableNative = nativeBalance > feeInWei 
      ? nativeBalance - feeInWei 
      : BigInt(0);
    
    return Math.max(0, parseFloat(ethers.formatEther(availableNative))).toString();
  } catch {
    return '0';
  }
}

// ============================================
// Transaction Status Tracking
// ============================================

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface TransactionRecord {
  id: string;
  hash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  chain: string;
  status: TransactionStatus;
  timestamp: string;
  explorerUrl: string;
  type: 'send' | 'receive';
}

/**
 * Get transaction status from blockchain
 */
export async function getTransactionStatus(
  chain: string,
  hash: string
): Promise<TransactionStatus> {
  try {
    if (chain === 'tron') {
      // TRON uses different API
      return 'confirmed'; // Simplified for now
    }

    const rpcUrl = CHAIN_RPC[chain];
    if (!rpcUrl) return 'pending';

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const receipt = await provider.getTransactionReceipt(hash);
    
    if (!receipt) return 'pending';
    return receipt.status === 1 ? 'confirmed' : 'failed';
  } catch {
    return 'pending';
  }
}

/**
 * Save transaction to local history
 */
export function saveTransaction(tx: Omit<TransactionRecord, 'id' | 'timestamp'>): TransactionRecord {
  const history = getTransactionHistory();
  const record: TransactionRecord = {
    ...tx,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
  };
  history.unshift(record);
  localStorage.setItem('transactionHistory', JSON.stringify(history.slice(0, 100))); // Keep last 100
  return record;
}

/**
 * Get transaction history from localStorage
 */
export function getTransactionHistory(): TransactionRecord[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('transactionHistory');
  return data ? JSON.parse(data) : [];
}

// ============================================
// Auto-Lock Timer
// ============================================

const AUTO_LOCK_KEY = 'walletAutoLockTimeout';
const LAST_ACTIVITY_KEY = 'walletLastActivity';

/**
 * Get auto-lock timeout in minutes (0 = disabled)
 */
export function getAutoLockTimeout(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(AUTO_LOCK_KEY) || '0', 10);
}

/**
 * Set auto-lock timeout in minutes
 */
export function setAutoLockTimeout(minutes: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTO_LOCK_KEY, minutes.toString());
  updateLastActivity();
}

/**
 * Update last activity timestamp
 */
export function updateLastActivity(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

/**
 * Check if wallet should be locked
 */
export function shouldAutoLock(): boolean {
  const timeout = getAutoLockTimeout();
  if (timeout === 0) return false;
  
  const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
  const elapsed = Date.now() - lastActivity;
  
  return elapsed > timeout * 60 * 1000;
}

/**
 * Initialize auto-lock check
 */
export function initAutoLock(onLock: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const checkInterval = setInterval(() => {
    if (shouldAutoLock()) {
      onLock();
    }
  }, 30000); // Check every 30 seconds
  
  // Update activity on user interaction
  const handleActivity = () => updateLastActivity();
  window.addEventListener('click', handleActivity);
  window.addEventListener('keydown', handleActivity);
  
  return () => {
    clearInterval(checkInterval);
    window.removeEventListener('click', handleActivity);
    window.removeEventListener('keydown', handleActivity);
  };
}

// ============================================
// Input Validation Utilities
// ============================================

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate transaction amount
 */
export function validateAmount(
  amount: string,
  balance: string,
  minAmount: string = '0',
  maxDecimals: number = 8
): ValidationResult {
  // Check if it's a valid number
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return { isValid: false, error: 'Amount must be a positive number' };
  }
  
  // Check decimal places
  const parts = amount.split('.');
  if (parts.length > 1 && parts[1].length > maxDecimals) {
    return { isValid: false, error: `Maximum ${maxDecimals} decimal places allowed` };
  }
  
  // Check minimum
  if (numAmount < parseFloat(minAmount)) {
    return { isValid: false, error: `Minimum amount is ${minAmount}` };
  }
  
  // Check balance
  if (numAmount > parseFloat(balance)) {
    return { isValid: false, error: 'Insufficient balance' };
  }
  
  return { isValid: true };
}

/**
 * Validate address is not the same as sender
 */
export function validateRecipientAddress(
  recipientAddress: string,
  senderAddress: string
): ValidationResult {
  if (!recipientAddress) {
    return { isValid: false, error: 'Recipient address is required' };
  }
  
  if (recipientAddress.toLowerCase() === senderAddress.toLowerCase()) {
    return { isValid: false, error: 'Cannot send to the same wallet address' };
  }
  
  return { isValid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  return { isValid: true };
}

/**
 * Validate mnemonic phrase
 */
export function validateMnemonic(mnemonic: string): ValidationResult {
  if (!mnemonic) {
    return { isValid: false, error: 'Mnemonic is required' };
  }
  
  const words = mnemonic.trim().split(/\s+/);
  
  if (words.length !== 12 && words.length !== 24) {
    return { isValid: false, error: 'Mnemonic must be 12 or 24 words' };
  }
  
  return { isValid: true };
}
