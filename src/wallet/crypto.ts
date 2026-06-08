import { ethers } from 'ethers';

/**
 * Crypto Module
 * Provides encryption/decryption utilities using AES-256-GCM
 */

/**
 * Encrypt data using AES-256-GCM
 */
export async function encrypt(plaintext: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Generate a random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  try {
    // Derive key from password using PBKDF2
    const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Generate unique salt per encryption for security
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    const cryptoKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );

    // Combine salt, IV, and encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    // Never fall back to insecure encryption
    throw new Error('Encryption failed. Please ensure your browser supports Web Crypto API.');
  }
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decrypt(ciphertext: string, key: string): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    
    // Extract salt (16 bytes), IV (12 bytes), and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);
    
    const encoder = new TextEncoder();
    
    const baseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(key),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const cryptoKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    // Never fall back to insecure decryption
    throw new Error('Decryption failed. Please check your password and try again.');
  }
}

/**
 * Generate a secure random encryption key
 */
export function generateEncryptionKey(): string {
  const array = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a string using SHA-256
 */
export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a mnemonic phrase using standard BIP39
 * Uses ethers.js for proper BIP39 compliance
 */
export async function generateMnemonic(wordCount: 12 | 24 = 12): Promise<string> {
  // Use ethers.js for BIP39 compliant mnemonic generation
  const entropy = wordCount === 24 ? 32 : 16;
  const wallet = ethers.Wallet.createRandom();
  return wallet.mnemonic?.phrase || '';
}

/**
 * Generate mnemonic from entropy (for testing)
 */
export function generateMnemonicSync(wordCount: 12 | 24 = 12): string {
  // This creates a wallet and discards it to get a valid mnemonic
  // In production, use the async version
  const entropy = wordCount === 24 ? 32 : 16;
  const randomBytes = new Uint8Array(entropy);
  crypto.getRandomValues(randomBytes);
  
  // Use ethers Mnemonic class for proper BIP39 wordlist
  const mnemonic = ethers.Mnemonic.fromEntropy(randomBytes);
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic.phrase);
  return wallet.mnemonic?.phrase || '';
}

/**
 * Validate a mnemonic phrase
 */
export function validateMnemonic(mnemonic: string): boolean {
  const words = mnemonic.trim().split(/\s+/);
  return words.length === 12 || words.length === 24;
}
