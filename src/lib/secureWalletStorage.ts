/**
 * Secure Wallet Storage - Supabase Backend
 * Uses AES-GCM encryption for secure cloud storage
 * 
 * Security Improvements:
 * - PBKDF2 for session key derivation (not btoa)
 * - Salt stored alongside ciphertext in DB
 * - No insecure fallback methods
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { logger } from './logger';

// Re-export from supabaseClient to avoid multiple GoTrueClient instances
export { supabase };

/**
 * Derive AES key from password using PBKDF2 with stored salt
 */
async function deriveKeyWithSalt(password: string, saltBase64: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  
  // Decode salt from base64
  const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
  
  // Import the password
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive a 256-bit AES key
  return crypto.subtle.deriveKey(
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
}

/**
 * Generate a random salt (16 bytes) as base64
 */
function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...Array.from(salt)));
}

/**
 * Encrypt data using AES-GCM with PBKDF2 key derivation
 */
async function encryptWithKey(data: string, password: string): Promise<{
  ciphertext: string;
  iv: string;
  salt: string;
}> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Generate unique salt for this encryption
  const salt = generateSalt();
  
  // Derive key using PBKDF2
  const cryptoKey = await deriveKeyWithSalt(password, salt);
  
  // Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    dataBuffer
  );
  
  return {
    ciphertext: btoa(String.fromCharCode(...Array.from(new Uint8Array(encryptedBuffer)))),
    iv: btoa(String.fromCharCode(...Array.from(iv))),
    salt
  };
}

/**
 * Decrypt data using AES-GCM with PBKDF2 key derivation
 */
async function decryptWithKey(
  ciphertext: string,
  iv: string,
  salt: string,
  password: string
): Promise<string> {
  const encoder = new TextEncoder();
  
  // Decode base64
  const ciphertextBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  
  // Derive key using PBKDF2 with stored salt
  const cryptoKey = await deriveKeyWithSalt(password, salt);
  
  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    cryptoKey,
    ciphertextBytes
  );
  
  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Generate a secure session key using PBKDF2
 * Uses random salt which is stored for later decryption
 */
export async function generateSessionKey(password: string): Promise<{
  key: string;
  salt: string;
}> {
  // Generate random salt
  const salt = generateSalt();
  
  // Derive key using PBKDF2
  const cryptoKey = await deriveKeyWithSalt(password, salt);
  
  // Export the key for storage
  const exportedKey = await crypto.subtle.exportKey('raw', cryptoKey);
  const keyBase64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(exportedKey))));
  
  return {
    key: keyBase64,
    salt
  };
}

/**
 * Secure Wallet Storage Manager
 */
export class SecureWalletStorage {
  private encryptionKey: string | null = null;
  private currentSalt: string | null = null;
  
  constructor() {
    // No auto-generation of weak keys
  }
  
  /**
   * Set encryption key using PBKDF2 (not btoa)
   */
  async setEncryptionPassword(password: string): Promise<void> {
    // Generate a new salt for session
    this.currentSalt = generateSalt();
    
    // Derive proper key using PBKDF2
    const cryptoKey = await deriveKeyWithSalt(password, this.currentSalt);
    
    // Export for storage
    const exportedKey = await crypto.subtle.exportKey('raw', cryptoKey);
    this.encryptionKey = btoa(String.fromCharCode(...Array.from(new Uint8Array(exportedKey))));
  }
  
  /**
   * Set the current active account (for session management)
   */
  setCurrentAccount(address: string): void {
    // Session is managed via Supabase Auth, not here
    logger.info('Current account set', { address });
  }

  /**
   * Get the current active account (from memory)
   */
  getCurrentAccount(): string | null {
    // We get this from profile now, not localStorage
    return null;
  }
  
  /**
   * Store encrypted wallet in Supabase with salt
   */
  async storeWallet(
    walletAddress: string,
    privateKey: string,
    mnemonic?: string,
    userPassword?: string
  ): Promise<boolean> {
    try {
      if (!userPassword && !this.encryptionKey) {
        logger.error('No encryption password provided');
        return false;
      }
      
      // Use provided password or stored encryption key
      const password = userPassword || this.encryptionKey!;
      
      // Encrypt private key with PBKDF2
      const encryptedPK = await encryptWithKey(privateKey, password);
      
      // Encrypt mnemonic if provided
      let encryptedMnemonic: string | null = null;
      let mnemonicIV = '';
      let mnemonicSalt = '';
      
      if (mnemonic) {
        const encMnemonic = await encryptWithKey(mnemonic, password);
        encryptedMnemonic = encMnemonic.ciphertext;
        mnemonicIV = encMnemonic.iv;
        mnemonicSalt = encMnemonic.salt;
      }
      
      // Store in Supabase with salt
      try {
        const { error } = await supabase
          .from('encrypted_wallets')
          .upsert({
            wallet_address: walletAddress.toLowerCase(),
            encrypted_private_key: encryptedPK.ciphertext,
            encrypted_mnemonic: encryptedMnemonic,
            encryption_iv: encryptedPK.iv,
            encryption_salt: encryptedPK.salt,  // Store salt in DB
            mnemonic_salt: mnemonicSalt,        // Store mnemonic salt in DB
            mnemonic_iv: mnemonicIV,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'wallet_address' });
        
        if (error) {
          logger.warn('Wallet storage warning', { error: error.message });
        }
      } catch (e) {
        logger.warn('Wallet storage error', e);
      }
      
      return true;
    } catch (error) {
      logger.error('Encryption error', error as Error);
      return false;
    }
  }
  
  /**
   * Retrieve wallet from Supabase using password with salt
   */
  async retrieveWallet(
    walletAddress: string,
    userPassword?: string
  ): Promise<{ privateKey: string; mnemonic?: string } | null> {
    try {
      // Use provided password
      if (!userPassword) {
        logger.info('No password provided - user needs to provide password to decrypt wallet');
        return null;
      }
      
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('encrypted_wallets')
        .select('encrypted_private_key, encrypted_mnemonic, encryption_iv, encryption_salt, mnemonic_salt, mnemonic_iv')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();
      
      if (error || !data) {
        logger.info('Wallet not found in cloud storage');
        return null;
      }
      
      // Check if salt exists
      if (!data.encryption_salt) {
        logger.error('No salt found - wallet may be encrypted with legacy method');
        return null;
      }
      
      // Decrypt private key using PBKDF2 with stored salt
      const privateKey = await decryptWithKey(
        data.encrypted_private_key,
        data.encryption_iv,
        data.encryption_salt,
        userPassword
      );
      
      // Decrypt mnemonic if exists
      let mnemonic: string | undefined;
      if (data.encrypted_mnemonic && data.mnemonic_salt && data.mnemonic_iv) {
        mnemonic = await decryptWithKey(
          data.encrypted_mnemonic,
          data.mnemonic_iv,
          data.mnemonic_salt,
          userPassword
        );
      }
      
      // Store the key for session
      this.encryptionKey = userPassword;
      this.currentSalt = data.encryption_salt;
      
      return { privateKey, mnemonic };
    } catch (error) {
      logger.error('Decryption error', error as Error);
      return null;
    }
  }
   
  /**
   * Check if wallet exists in cloud
   */
  async walletExists(walletAddress: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('encrypted_wallets')
      .select('wallet_address')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();
   
    return !error && !!data;
  }
   
  /**
   * Delete wallet from cloud
   */
  async deleteWallet(walletAddress: string): Promise<boolean> {
    const { error } = await supabase
      .from('encrypted_wallets')
      .delete()
      .eq('wallet_address', walletAddress.toLowerCase());
   
    if (error) {
      logger.error('Failed to delete wallet', error as Error);
      return false;
    }
   
    return true;
  }

  /**
   * Check if user has a stored session (always false now - use Supabase Auth)
   */
  hasSession(): boolean {
    return false;
  }
   
  /**
   * Clear session (no-op now - Supabase Auth handles session)
   */
  clearSession(): void {
    this.encryptionKey = null;
    this.currentSalt = null;
  }
}

// Export singleton instance
export const walletStorage = new SecureWalletStorage();
