import { getEnv, isPlaceholder, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEthereumAddress(address: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!address) {
    errors.push('Address is required');
    return { isValid: false, errors, warnings };
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    errors.push('Invalid Ethereum address format');
  }

  if (address === '0x0000000000000000000000000000000000000000') {
    errors.push('Cannot use zero address');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateTronAddress(address: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!address) {
    errors.push('Address is required');
    return { isValid: false, errors, warnings };
  }

  if (!/^T[a-zA-Z0-9]{33}$/.test(address)) {
    errors.push('Invalid TRON address format');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateAmount(amount: string, decimals: number = 6): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!amount) {
    errors.push('Amount is required');
    return { isValid: false, errors, warnings };
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    errors.push('Amount must be a number');
    return { isValid: false, errors, warnings };
  }

  if (numAmount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  if (numAmount > 1e12) {
    warnings.push('Amount is very large, please verify');
  }

  const parts = amount.split('.');
  if (parts[1] && parts[1].length > decimals) {
    warnings.push(`Amount has more than ${decimals} decimal places`);
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors, warnings };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors, warnings };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (password.length < 12) {
    warnings.push('Password should be at least 12 characters for better security');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    warnings.push('Password should contain at least one special character');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateUrl(url: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!url) {
    errors.push('URL is required');
    return { isValid: false, errors, warnings };
  }

  try {
    new URL(url);
  } catch {
    errors.push('Invalid URL format');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateChain(chain: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const supportedChains = [
    'ethereum',
    'polygon',
    'bsc',
    'arbitrum',
    'optimism',
    'avalanche',
    'celo',
    'linea',
    'base',
    'tron',
    'solana',
    'bitcoin',
    'cosmos',
    'ton',
    'aptos',
  ];

  if (!chain) {
    errors.push('Chain is required');
    return { isValid: false, errors, warnings };
  }

  if (!supportedChains.includes(chain.toLowerCase())) {
    errors.push(`Unsupported chain: ${chain}`);
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateTransactionHash(txHash: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!txHash) {
    errors.push('Transaction hash is required');
    return { isValid: false, errors, warnings };
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    errors.push('Invalid transaction hash format');
  }

  return { isValid: errors.length === 0, errors, warnings };
}
