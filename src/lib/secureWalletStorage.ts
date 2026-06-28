import { getEnv, isPlaceholder, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface EncryptedWallet {
  encryptedData: string;
  iv: string;
  salt: string;
  version: string;
}

export class SecureWalletStorage {
  private storageKey: string;

  constructor() {
    this.storageKey = 'blackpayments_wallet';
  }

  async encrypt(data: string, password: string): Promise<EncryptedWallet> {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const passwordBuffer = encoder.encode(password);

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
      );

      const encryptedArray = new Uint8Array(encryptedBuffer);
      const encryptedData = Array.from(encryptedArray, (byte) => byte.toString(16).padStart(2, '0')).join('');

      return {
        encryptedData,
        iv: Array.from(iv, (byte) => byte.toString(16).padStart(2, '0')).join(''),
        salt: Array.from(salt, (byte) => byte.toString(16).padStart(2, '0')).join(''),
        version: '1.0',
      };
    } catch (error) {
      logger.error('Encryption failed', error as Error);
      throw new Error('Failed to encrypt wallet data');
    }
  }

  async decrypt(encryptedWallet: EncryptedWallet, password: string): Promise<string> {
    try {
      const encryptedData = new Uint8Array(
        encryptedWallet.encryptedData.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
      );
      const iv = new Uint8Array(encryptedWallet.iv.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));
      const salt = new Uint8Array(encryptedWallet.salt.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));

      const passwordBuffer = new TextEncoder().encode(password);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedData
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      logger.error('Decryption failed', error as Error);
      throw new Error('Failed to decrypt wallet data');
    }
  }

  async saveWallet(encryptedWallet: EncryptedWallet): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(encryptedWallet));
      }
    } catch (error) {
      logger.error('Failed to save wallet', error as Error);
      throw new Error('Failed to save wallet');
    }
  }

  async loadWallet(): Promise<EncryptedWallet | null> {
    try {
      if (typeof window !== 'undefined') {
        const data = localStorage.getItem(this.storageKey);
        if (data) {
          return JSON.parse(data) as EncryptedWallet;
        }
      }
      return null;
    } catch (error) {
      logger.error('Failed to load wallet', error as Error);
      return null;
    }
  }

  async deleteWallet(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.storageKey);
      }
    } catch (error) {
      logger.error('Failed to delete wallet', error as Error);
      throw new Error('Failed to delete wallet');
    }
  }

  hasWallet(): boolean {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.storageKey) !== null;
    }
    return false;
  }
}

export const secureWalletStorage = new SecureWalletStorage();
