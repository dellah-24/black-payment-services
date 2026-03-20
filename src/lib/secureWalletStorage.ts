/**
 * Secure Wallet Storage - Supabase Backend
 * Uses AES-GCM encryption for secure cloud storage
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Re-export from supabaseClient to avoid multiple GoTrueClient instances
export { supabase };

/**
 * Derive a proper AES key from a password using PBKDF2
 */
async function deriveKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const salt = encoder.encode('blackpayments_wallet_v1');
  
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
 * Encrypt data using AES-GCM
 */
async function encrypt(data: string, key: string): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Derive a proper key
  const cryptoKey = await deriveKey(key);
  
  // Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    dataBuffer
  );
  
  return {
    ciphertext: btoa(String.fromCharCode(...Array.from(new Uint8Array(encryptedBuffer)))),
    iv: btoa(String.fromCharCode(...Array.from(iv)))
  };
}

/**
 * Decrypt data using AES-GCM
 */
async function decrypt(ciphertext: string, iv: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Decode base64
  const ciphertextBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  
  // Derive a proper key
  const cryptoKey = await deriveKey(key);
  
  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    cryptoKey,
    ciphertextBytes
  );
  
  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Secure Wallet Storage Manager
 */
export class SecureWalletStorage {
  private encryptionKey: string;
  
  constructor(userPassword?: string) {
    // Use a derived key from password or generate a session key
    this.encryptionKey = userPassword 
      ? btoa(userPassword + 'blackpayments_salt')
      : this.generateSessionKey();
  }
  
  private generateSessionKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...Array.from(array)));
  }

  /**
   * Set the current active account (for session management)
   */
  setCurrentAccount(address: string): void {
    // Store in memory only - don't use localStorage
    this.encryptionKey = this.encryptionKey || this.generateSessionKey();
  }

  /**
   * Get the current active account (from memory)
   */
  getCurrentAccount(): string | null {
    // We get this from profile now, not localStorage
    return null;
  }
  
  /**
   * Store encrypted wallet in Supabase
   */
  async storeWallet(walletAddress: string, privateKey: string, mnemonic?: string, userPassword?: string): Promise<boolean> {
    try {
      // Use provided password or generate a session key
      const encryptionKey = userPassword 
        ? btoa(userPassword + 'blackpayments_salt')
        : this.encryptionKey;
      
      // Encrypt private key
      const encryptedPK = await encrypt(privateKey, encryptionKey);
      
      // Encrypt mnemonic if provided
      let encryptedMnemonic: string | null = null;
      let mnemonicIV = '';
      if (mnemonic) {
        const encMnemonic = await encrypt(mnemonic, encryptionKey);
        encryptedMnemonic = encMnemonic.ciphertext;
        mnemonicIV = encMnemonic.iv;
      }
      
      // Store in Supabase only if configured
      if (isSupabaseConfigured && supabase?.from) {
        try {
          const { error } = await supabase
            .from('encrypted_wallets')
            .upsert({
              wallet_address: walletAddress.toLowerCase(),
              encrypted_private_key: encryptedPK.ciphertext,
              encrypted_mnemonic: encryptedMnemonic,
              encryption_iv: encryptedPK.iv,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'wallet_address' });
          
          if (error) {
            // Table might not exist - ignore error
            console.warn('Wallet storage warning:', error.message);
          }
        } catch (e) {
          // Ignore storage errors - wallet is still usable locally
          console.warn('Wallet storage error:', e);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Encryption error:', error);
      return false;
    }
  }
  
  /**
   * Retrieve wallet from Supabase using password
   */
  async retrieveWallet(walletAddress: string, userPassword?: string): Promise<{ privateKey: string; mnemonic?: string } | null> {
    try {
      // Check if Supabase is properly configured
      if (!isSupabaseConfigured || !supabase.from) {
        console.warn('Supabase not configured - cannot retrieve wallet from cloud');
        return null;
      }

      // Use provided password or check localStorage
      let encryptionKey = userPassword 
        ? btoa(userPassword + 'blackpayments_salt')
        : localStorage.getItem('bp_session_key');
      
      if (!encryptionKey) {
        console.error('No encryption key found - password required');
        return null;
      }
      
      this.encryptionKey = encryptionKey;
      
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('encrypted_wallets')
        .select('encrypted_private_key, encrypted_mnemonic, encryption_iv')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();
      
      if (error || !data) {
        console.error('Wallet not found in cloud');
        return null;
      }
      
      // Decrypt private key
      const privateKey = await decrypt(
        data.encrypted_private_key,
        data.encryption_iv,
        this.encryptionKey
      );
      
      // Decrypt mnemonic if exists
      let mnemonic: string | undefined;
      if (data.encrypted_mnemonic) {
        mnemonic = await decrypt(
          data.encrypted_mnemonic,
          data.encryption_iv,
          this.encryptionKey
        );
      }
      
      return { privateKey, mnemonic };
    } catch (error) {
      console.error('Decryption error:', error);
      // Return null to allow creating a new wallet
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
    // If Supabase is not configured
    if (!isSupabaseConfigured) {
      return true;
    }

    const { error } = await supabase
      .from('encrypted_wallets')
      .delete()
      .eq('wallet_address', walletAddress.toLowerCase());
    
    if (error) {
      console.error('Failed to delete wallet:', error);
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if user has a stored session (always false now - use Supabase Auth)
   */
  hasSession(): boolean {
    // Session is now managed by Supabase Auth
    return false;
  }
  
  /**
   * Get current account (now returns null - use profileApi.getByUserId)
   */
  getCurrentAccount(): string | null {
    return null;
  }
  
  /**
   * Clear session (no-op now - Supabase Auth handles session)
   */
  clearSession(): void {
    // Session is managed by Supabase Auth
  }
}

// Export singleton instance
export const walletStorage = new SecureWalletStorage();
