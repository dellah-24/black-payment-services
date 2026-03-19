/**
 * Secure Wallet Storage - Supabase Backend
 * Uses AES-GCM encryption for secure cloud storage
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Initialize Supabase client
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({} as SupabaseClient);

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
   * Store encrypted wallet in Supabase
   */
  async storeWallet(walletAddress: string, privateKey: string, mnemonic?: string): Promise<boolean> {
    try {
      // Encrypt private key
      const encryptedPK = await encrypt(privateKey, this.encryptionKey);
      
      // Encrypt mnemonic if provided
      let encryptedMnemonic: string | null = null;
      let mnemonicIV = '';
      if (mnemonic) {
        const encMnemonic = await encrypt(mnemonic, this.encryptionKey);
        encryptedMnemonic = encMnemonic.ciphertext;
        mnemonicIV = encMnemonic.iv;
      }
      
      // Store in Supabase
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
        console.error('Failed to store wallet in Supabase:', error);
        return false;
      }
      
      // Store session key in localStorage (not the private key!)
      localStorage.setItem('bp_session_key', this.encryptionKey);
      localStorage.setItem('bp_account', walletAddress);
      
      return true;
    } catch (error) {
      console.error('Encryption error:', error);
      return false;
    }
  }
  
  /**
   * Retrieve wallet from Supabase
   */
  async retrieveWallet(walletAddress: string): Promise<{ privateKey: string; mnemonic?: string } | null> {
    try {
      // Get session key from localStorage
      const sessionKey = localStorage.getItem('bp_session_key');
      if (!sessionKey) {
        console.error('No session key found');
        return null;
      }
      
      this.encryptionKey = sessionKey;
      
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
    // If Supabase is not configured, just clear local storage
    if (!isSupabaseConfigured) {
      localStorage.removeItem('bp_session_key');
      localStorage.removeItem('bp_account');
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
    
    // Clear local storage
    localStorage.removeItem('bp_session_key');
    localStorage.removeItem('bp_account');
    
    return true;
  }
  
  /**
   * Check if user has a stored session
   */
  hasSession(): boolean {
    return !!localStorage.getItem('bp_session_key') && !!localStorage.getItem('bp_account');
  }
  
  /**
   * Get current account from localStorage
   */
  getCurrentAccount(): string | null {
    return localStorage.getItem('bp_account');
  }
  
  /**
   * Clear session
   */
  clearSession(): void {
    localStorage.removeItem('bp_session_key');
    localStorage.removeItem('bp_account');
  }
}

// Export singleton instance
export const walletStorage = new SecureWalletStorage();
