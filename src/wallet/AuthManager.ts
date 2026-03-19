/**
 * Authentication Module
 * Handles PIN, biometric authentication, and session management
 */

import { secureStorage, StorageKey } from './SecureStorage';
import { sha256, generateEncryptionKey } from './crypto';

export type AuthMethod = 'pin' | 'biometric' | 'wallet';

/**
 * Auth state
 */
export interface AuthState {
  isAuthenticated: boolean;
  authMethod: AuthMethod | null;
  sessionExpiry: number | null;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  autoLockMinutes: number;
  maxFailedAttempts: number;
  lockoutDuration: number; // in milliseconds
}

/**
 * Authentication events
 */
export type AuthEventType = 
  | 'login' 
  | 'logout' 
  | 'lock' 
  | 'pin_set' 
  | 'pin_changed'
  | 'biometric_enabled'
  | 'biometric_disabled'
  | 'failed_attempt'
  | 'locked_out';

export interface AuthEvent {
  type: AuthEventType;
  timestamp: number;
  data?: Record<string, unknown>;
}

/**
 * Authentication Manager
 */
export class AuthManager {
  private static instance: AuthManager;
  private failedAttempts: number = 0;
  private lockoutUntil: number = 0;
  private sessionExpiry: number = 0;
  private authMethod: AuthMethod | null = null;
  private eventListeners: ((event: AuthEvent) => void)[] = [];
  private autoLockTimer: ReturnType<typeof setTimeout> | null = null;
  
  private config: AuthConfig = {
    autoLockMinutes: 5,
    maxFailedAttempts: 5,
    lockoutDuration: 300000, // 5 minutes
  };

  private constructor() {
    // Restore session if valid
    this.restoreSession();
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Configure auth manager
   */
  configure(config: Partial<AuthConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: AuthEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: AuthEvent) => void): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }

  /**
   * Emit auth event
   */
  private emit(type: AuthEventType, data?: Record<string, unknown>): void {
    const event: AuthEvent = { type, timestamp: Date.now(), data };
    this.eventListeners.forEach(listener => listener(event));
  }

  /**
   * Check if PIN is set
   */
  hasPin(): boolean {
    return secureStorage.hasPin();
  }

  /**
   * Set up PIN
   */
  async setupPin(pin: string): Promise<boolean> {
    if (pin.length < 4 || pin.length > 6) {
      throw new Error('PIN must be 4-6 digits');
    }
    
    if (!/^\d+$/.test(pin)) {
      throw new Error('PIN must contain only digits');
    }

    await secureStorage.setPin(pin);
    this.emit('pin_set');
    return true;
  }

  /**
   * Verify PIN
   */
  async verifyPin(pin: string): Promise<boolean> {
    // Check if locked out
    if (Date.now() < this.lockoutUntil) {
      const remaining = Math.ceil((this.lockoutUntil - Date.now()) / 1000);
      throw new Error(`Too many failed attempts. Try again in ${remaining} seconds.`);
    }

    const isValid = await secureStorage.verifyPin(pin);

    if (isValid) {
      this.failedAttempts = 0;
      this.authMethod = 'pin';
      this.startSession();
      this.emit('login', { method: 'pin' });
      return true;
    } else {
      this.failedAttempts++;
      this.emit('failed_attempt', { attempts: this.failedAttempts });
      
      if (this.failedAttempts >= this.config.maxFailedAttempts) {
        this.lockoutUntil = Date.now() + this.config.lockoutDuration;
        this.emit('locked_out', { duration: this.config.lockoutDuration });
        throw new Error('Too many failed attempts. Account locked for 5 minutes.');
      }
      
      throw new Error(`Invalid PIN. ${this.config.maxFailedAttempts - this.failedAttempts} attempts remaining.`);
    }
  }

  /**
   * Change PIN
   */
  async changePin(currentPin: string, newPin: string): Promise<boolean> {
    const isValid = await this.verifyPin(currentPin);
    if (!isValid) {
      throw new Error('Current PIN is incorrect');
    }

    await this.setupPin(newPin);
    this.emit('pin_changed');
    return true;
  }

  /**
   * Enable biometric authentication
   */
  enableBiometric(): boolean {
    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      throw new Error('Biometric authentication not supported');
    }

    secureStorage.setBiometricEnabled(true);
    this.emit('biometric_enabled');
    return true;
  }

  /**
   * Disable biometric authentication
   */
  disableBiometric(): void {
    secureStorage.setBiometricEnabled(false);
    this.emit('biometric_disabled');
  }

  /**
   * Check if biometric is enabled
   */
  isBiometricEnabled(): boolean {
    return secureStorage.isBiometricEnabled();
  }

  /**
   * Authenticate with biometrics (WebAuthn)
   */
  async authenticateWithBiometric(): Promise<boolean> {
    if (!secureStorage.isBiometricEnabled()) {
      throw new Error('Biometric authentication not enabled');
    }

    // For WebAuthn, we need a server to store the credential
    // This is a simplified client-side version
    try {
      // Check if biometric is available
      const isAvailable = await this.checkBiometricAvailability();
      if (!isAvailable) {
        throw new Error('Biometric not available');
      }

      this.authMethod = 'biometric';
      this.startSession();
      this.emit('login', { method: 'biometric' });
      return true;
    } catch (error) {
      throw new Error('Biometric authentication failed');
    }
  }

  /**
   * Check if biometric is available
   */
  async checkBiometricAvailability(): Promise<boolean> {
    if (!window.PublicKeyCredential) {
      return false;
    }

    try {
      const available = await navigator.credentials.get({ publicKey: {
        challenge: new Uint8Array(32),
        timeout: 60000,
        userVerification: 'preferred'
      }} as any);
      return !!available;
    } catch {
      // Fallback: check if device supports biometric
      return 'credentials' in navigator;
    }
  }

  /**
   * Login with wallet (existing wallet)
   */
  loginWithWallet(): void {
    this.authMethod = 'wallet';
    this.startSession();
    this.emit('login', { method: 'wallet' });
  }

  /**
   * Start a new session
   */
  private startSession(): void {
    const expiryMs = this.config.autoLockMinutes * 60 * 1000;
    this.sessionExpiry = Date.now() + expiryMs;
    this.resetAutoLockTimer();
    this.persistSession();
  }

  /**
   * Reset auto-lock timer
   */
  resetAutoLockTimer(): void {
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
    }

    const expiryMs = this.config.autoLockMinutes * 60 * 1000;
    this.sessionExpiry = Date.now() + expiryMs;
    
    this.autoLockTimer = setTimeout(() => {
      this.lock();
    }, expiryMs);
  }

  /**
   * Persist session to storage
   */
  private persistSession(): void {
    const sessionData = {
      authMethod: this.authMethod,
      sessionExpiry: this.sessionExpiry,
    };
    localStorage.setItem('bp_session', JSON.stringify(sessionData));
  }

  /**
   * Restore session from storage
   */
  private restoreSession(): void {
    try {
      const sessionData = localStorage.getItem('bp_session');
      if (sessionData) {
        const { authMethod, sessionExpiry } = JSON.parse(sessionData);
        
        if (sessionExpiry && Date.now() < sessionExpiry) {
          this.authMethod = authMethod;
          this.sessionExpiry = sessionExpiry;
          this.resetAutoLockTimer();
        } else {
          // Session expired, clear it
          localStorage.removeItem('bp_session');
        }
      }
    } catch {
      // Invalid session data, clear it
      localStorage.removeItem('bp_session');
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.sessionExpiry && Date.now() < this.sessionExpiry);
  }

  /**
   * Get current auth method
   */
  getAuthMethod(): AuthMethod | null {
    return this.authMethod;
  }

  /**
   * Lock the wallet
   */
  lock(): void {
    this.authMethod = null;
    this.sessionExpiry = 0;
    
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
      this.autoLockTimer = null;
    }

    localStorage.removeItem('bp_session');
    this.emit('lock');
  }

  /**
   * Logout completely
   */
  logout(): void {
    this.lock();
    this.emit('logout');
  }

  /**
   * Get remaining session time in seconds
   */
  getRemainingSessionTime(): number {
    if (!this.sessionExpiry) return 0;
    return Math.max(0, Math.floor((this.sessionExpiry - Date.now()) / 1000));
  }

  /**
   * Extend session (on user activity)
   */
  extendSession(): void {
    if (this.isAuthenticated()) {
      this.resetAutoLockTimer();
      this.persistSession();
    }
  }

  /**
   * Get failed attempts count
   */
  getFailedAttempts(): number {
    return this.failedAttempts;
  }

  /**
   * Check if locked out
   */
  isLockedOut(): boolean {
    return Date.now() < this.lockoutUntil;
  }

  /**
   * Get lockout remaining time
   */
  getLockoutRemaining(): number {
    if (!this.isLockedOut()) return 0;
    return Math.ceil((this.lockoutUntil - Date.now()) / 1000);
  }
}

export const authManager = AuthManager.getInstance();
