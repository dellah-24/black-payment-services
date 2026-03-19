/**
 * Secure Storage Module
 * Provides encrypted storage for sensitive wallet data
 */

import { encrypt, decrypt } from './crypto';

/**
 * Storage keys enum
 */
export enum StorageKey {
  ENCRYPTED_WALLET = 'bp_encrypted_wallet',
  PIN_HASH = 'bp_pin_hash',
  BIOMETRIC_ENABLED = 'bp_biometric',
  ADDRESS_BOOK = 'bp_address_book',
  SETTINGS = 'bp_settings',
  LANGUAGE = 'bp_language',
  ENCRYPTION_IV = 'bp_iv',
}

/**
 * Secure storage configuration
 */
export interface SecureStorageConfig {
  encryptionKey: string;
}

/**
 * Address book entry
 */
export interface AddressBookEntry {
  id: string;
  address: string;
  label: string;
  chain: string;
  createdAt: number;
  isFavorite: boolean;
}

/**
 * App settings
 */
export interface AppSettings {
  theme: 'dark' | 'light';
  notifications: boolean;
  autoLock: number; // minutes
  currency: string;
  language: string;
}

/**
 * Secure Storage class
 * Handles encrypted storage of sensitive data
 */
export class SecureStorage {
  private static instance: SecureStorage;
  private encryptionKey: string | null = null;
  private isUnlocked: boolean = false;

  private constructor() {}

  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  /**
   * Initialize the secure storage with an encryption key
   */
  initialize(encryptionKey: string): void {
    this.encryptionKey = encryptionKey;
  }

  /**
   * Check if storage is unlocked
   */
  getUnlocked(): boolean {
    return this.isUnlocked;
  }

  /**
   * Unlock the storage with PIN or biometric
   */
  unlock(): void {
    this.isUnlocked = true;
  }

  /**
   * Lock the storage
   */
  lock(): void {
    this.isUnlocked = false;
  }

  /**
   * Store encrypted wallet data
   */
  async storeWallet(walletData: {
    privateKey: string;
    mnemonic?: string;
    addresses: Record<string, string>;
  }): Promise<void> {
    if (!this.encryptionKey) {
      throw new Error('SecureStorage not initialized');
    }

    const encrypted = await encrypt(JSON.stringify(walletData), this.encryptionKey);
    localStorage.setItem(StorageKey.ENCRYPTED_WALLET, encrypted);
  }

  /**
   * Retrieve decrypted wallet data
   */
  async retrieveWallet(): Promise<{
    privateKey: string;
    mnemonic?: string;
    addresses: Record<string, string>;
  } | null> {
    if (!this.encryptionKey) {
      throw new Error('SecureStorage not initialized');
    }

    const encrypted = localStorage.getItem(StorageKey.ENCRYPTED_WALLET);
    if (!encrypted) return null;

    try {
      const decrypted = await decrypt(encrypted, this.encryptionKey);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  /**
   * Store PIN hash
   */
  async setPin(pin: string): Promise<void> {
    const hash = await this.hashPin(pin);
    localStorage.setItem(StorageKey.PIN_HASH, hash);
  }

  /**
   * Verify PIN
   */
  async verifyPin(pin: string): Promise<boolean> {
    const storedHash = localStorage.getItem(StorageKey.PIN_HASH);
    if (!storedHash) return false;

    const inputHash = await this.hashPin(pin);
    return storedHash === inputHash;
  }

  /**
   * Check if PIN is set
   */
  hasPin(): boolean {
    return !!localStorage.getItem(StorageKey.PIN_HASH);
  }

  /**
   * Hash PIN using SHA-256
   */
  private async hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'blackpayments_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Enable/disable biometric authentication
   */
  setBiometricEnabled(enabled: boolean): void {
    localStorage.setItem(StorageKey.BIOMETRIC_ENABLED, enabled.toString());
  }

  /**
   * Check if biometric is enabled
   */
  isBiometricEnabled(): boolean {
    return localStorage.getItem(StorageKey.BIOMETRIC_ENABLED) === 'true';
  }

  /**
   * Store address book
   */
  async setAddressBook(entries: AddressBookEntry[]): Promise<void> {
    if (!this.encryptionKey) {
      throw new Error('SecureStorage not initialized');
    }

    const encrypted = await encrypt(JSON.stringify(entries), this.encryptionKey);
    localStorage.setItem(StorageKey.ADDRESS_BOOK, encrypted);
  }

  /**
   * Get address book
   */
  async getAddressBook(): Promise<AddressBookEntry[]> {
    if (!this.encryptionKey) {
      return [];
    }

    const encrypted = localStorage.getItem(StorageKey.ADDRESS_BOOK);
    if (!encrypted) return [];

    try {
      const decrypted = await decrypt(encrypted, this.encryptionKey);
      return JSON.parse(decrypted);
    } catch {
      return [];
    }
  }

  /**
   * Add entry to address book
   */
  async addToAddressBook(entry: Omit<AddressBookEntry, 'id' | 'createdAt'>): Promise<void> {
    const entries = await this.getAddressBook();
    entries.push({
      ...entry,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    });
    await this.setAddressBook(entries);
  }

  /**
   * Remove entry from address book
   */
  async removeFromAddressBook(id: string): Promise<void> {
    const entries = (await this.getAddressBook()).filter(e => e.id !== id);
    await this.setAddressBook(entries);
  }

  /**
   * Store app settings
   */
  async setSettings(settings: AppSettings): Promise<void> {
    const encrypted = await encrypt(JSON.stringify(settings), this.encryptionKey || 'default');
    localStorage.setItem(StorageKey.SETTINGS, encrypted);
  }

  /**
   * Get app settings
   */
  async getSettings(): Promise<AppSettings | null> {
    const encrypted = localStorage.getItem(StorageKey.SETTINGS);
    if (!encrypted) return null;

    try {
      const decrypted = await decrypt(encrypted, this.encryptionKey || 'default');
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  /**
   * Set language preference
   */
  setLanguage(language: string): void {
    localStorage.setItem(StorageKey.LANGUAGE, language);
  }

  /**
   * Get language preference
   */
  getLanguage(): string {
    return localStorage.getItem(StorageKey.LANGUAGE) || 'en';
  }

  /**
   * Clear all secure storage
   */
  clearAll(): void {
    localStorage.removeItem(StorageKey.ENCRYPTED_WALLET);
    localStorage.removeItem(StorageKey.PIN_HASH);
    localStorage.removeItem(StorageKey.BIOMETRIC_ENABLED);
    localStorage.removeItem(StorageKey.ADDRESS_BOOK);
    localStorage.removeItem(StorageKey.SETTINGS);
    localStorage.removeItem(StorageKey.ENCRYPTION_IV);
    this.isUnlocked = false;
    this.encryptionKey = null;
  }

  /**
   * Check if wallet exists
   */
  hasWallet(): boolean {
    return !!localStorage.getItem(StorageKey.ENCRYPTED_WALLET);
  }
}

export const secureStorage = SecureStorage.getInstance();
