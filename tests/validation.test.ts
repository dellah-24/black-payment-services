/**
 * Validation Schemas Unit Tests
 * Tests for Zod validation schemas
 */

import { describe, it, expect } from '@jest/globals';
import {
  ChainKeySchema,
  EthereumAddressSchema,
  TronAddressSchema,
  AmountSchema,
  PasswordSchema,
  MnemonicSchema,
  PrivateKeySchema,
  TransferSchema,
  WalletImportSchema,
  WalletCreateSchema,
} from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('ChainKeySchema', () => {
    it('should validate ethereum chain', () => {
      const result = ChainKeySchema.safeParse('ethereum');
      expect(result.success).toBe(true);
    });

    it('should validate tron chain', () => {
      const result = ChainKeySchema.safeParse('tron');
      expect(result.success).toBe(true);
    });

    it('should validate bsc chain', () => {
      const result = ChainKeySchema.safeParse('bsc');
      expect(result.success).toBe(true);
    });

    it('should invalidate unknown chain', () => {
      const result = ChainKeySchema.safeParse('unknown');
      expect(result.success).toBe(false);
    });
  });

  describe('EthereumAddressSchema', () => {
    it('should validate valid EVM address', () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB21';
      const result = EthereumAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should invalidate address without 0x prefix', () => {
      const noPrefix = '742d35Cc6634C0532925a3b844Bc9e7595f3fB21';
      const result = EthereumAddressSchema.safeParse(noPrefix);
      expect(result.success).toBe(false);
    });

    it('should invalidate address with wrong length', () => {
      const shortAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB2';
      const result = EthereumAddressSchema.safeParse(shortAddress);
      expect(result.success).toBe(false);
    });

    it('should invalidate address with non-hex chars', () => {
      const nonHex = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fG21';
      const result = EthereumAddressSchema.safeParse(nonHex);
      expect(result.success).toBe(false);
    });
  });

  describe('TronAddressSchema', () => {
    it('should validate valid TRON address', () => {
      const validAddress = 'TJRabPrcZyX9dLD4V7W2qQa7q4UqZmG4Xy';
      const result = TronAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should invalidate TRON address without T prefix', () => {
      const noPrefix = 'AJRabPrcZyX9dLD4V7W2qQa7q4UqZmG4Xy';
      const result = TronAddressSchema.safeParse(noPrefix);
      expect(result.success).toBe(false);
    });

    it('should invalidate TRON address with wrong length', () => {
      const shortAddress = 'TJRabPrcZyX9dLD4V7W2qQa7';
      const result = TronAddressSchema.safeParse(shortAddress);
      expect(result.success).toBe(false);
    });
  });

  describe('AmountSchema', () => {
    it('should validate positive number string', () => {
      const result = AmountSchema.safeParse('100.50');
      expect(result.success).toBe(true);
    });

    it('should validate integer string', () => {
      const result = AmountSchema.safeParse('1000');
      expect(result.success).toBe(true);
    });

    it('should validate small positive number', () => {
      const result = AmountSchema.safeParse('0.01');
      expect(result.success).toBe(true);
    });

    it('should invalidate zero', () => {
      const result = AmountSchema.safeParse('0');
      expect(result.success).toBe(false);
    });

    it('should invalidate negative number', () => {
      const result = AmountSchema.safeParse('-100');
      expect(result.success).toBe(false);
    });

    it('should invalidate non-numeric string', () => {
      const result = AmountSchema.safeParse('abc');
      expect(result.success).toBe(false);
    });
  });

  describe('PasswordSchema', () => {
    it('should validate strong password (12+ chars, mixed, number, special)', () => {
      const strongPassword = 'SecurePass123!';
      const result = PasswordSchema.safeParse(strongPassword);
      expect(result.success).toBe(true);
    });

    it('should invalidate weak password (too short)', () => {
      const weakPassword = 'Short1!';
      const result = PasswordSchema.safeParse(weakPassword);
      expect(result.success).toBe(false);
    });

    it('should invalidate password without lowercase', () => {
      const noLowercase = 'UPPERCASE123!';
      const result = PasswordSchema.safeParse(noLowercase);
      expect(result.success).toBe(false);
    });

    it('should invalidate password without uppercase', () => {
      const noUppercase = 'lowercase123!';
      const result = PasswordSchema.safeParse(noUppercase);
      expect(result.success).toBe(false);
    });

    it('should invalidate password without number', () => {
      const noNumber = 'NoNumbers!';
      const result = PasswordSchema.safeParse(noNumber);
      expect(result.success).toBe(false);
    });

    it('should invalidate password without special char', () => {
      const noSpecial = 'NoSpecial123';
      const result = PasswordSchema.safeParse(noSpecial);
      expect(result.success).toBe(false);
    });
  });

  describe('MnemonicSchema', () => {
    it('should validate 12-word mnemonic', () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const result = MnemonicSchema.safeParse(mnemonic);
      expect(result.success).toBe(true);
    });

    it('should validate 24-word mnemonic', () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon';
      const result = MnemonicSchema.safeParse(mnemonic);
      expect(result.success).toBe(true);
    });

    it('should invalidate wrong word count', () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon';
      const result = MnemonicSchema.safeParse(mnemonic);
      expect(result.success).toBe(false);
    });

    it('should trim whitespace before validation', () => {
      const mnemonic = '  abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about  ';
      const result = MnemonicSchema.safeParse(mnemonic);
      expect(result.success).toBe(true);
    });
  });

  describe('PrivateKeySchema', () => {
    it('should validate valid private key (64 hex chars with 0x)', () => {
      const key = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB2112345678901234567890123456789012345678901234567890123456789012345678901234';
      const result = PrivateKeySchema.safeParse(key);
      expect(result.success).toBe(true);
    });

    it('should invalidate key without 0x prefix', () => {
      const key = '742d35Cc6634C0532925a3b844Bc9e7595f3fB2112345678901234567890123456789012345678901234567890123456789012345678901234';
      const result = PrivateKeySchema.safeParse(key);
      expect(result.success).toBe(false);
    });

    it('should invalidate key with wrong length', () => {
      const key = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB21';
      const result = PrivateKeySchema.safeParse(key);
      expect(result.success).toBe(false);
    });
  });

  describe('TransferSchema', () => {
    it('should validate valid transfer params', () => {
      const params = {
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB21',
        amount: '100',
        chain: 'ethereum' as const,
      };
      const result = TransferSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should invalidate transfer with invalid address', () => {
      const params = {
        to: 'invalid',
        amount: '100',
        chain: 'ethereum' as const,
      };
      const result = TransferSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should invalidate transfer with negative amount', () => {
      const params = {
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB21',
        amount: '-100',
        chain: 'ethereum' as const,
      };
      const result = TransferSchema.safeParse(params);
      expect(result.success).toBe(false);
    });
  });

  describe('WalletImportSchema', () => {
    it('should validate valid import params', () => {
      const params = {
        secret: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        password: 'SecurePass123!',
      };
      const result = WalletImportSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should invalidate import with empty secret', () => {
      const params = {
        secret: '',
        password: 'SecurePass123!',
      };
      const result = WalletImportSchema.safeParse(params);
      expect(result.success).toBe(false);
    });
  });

  describe('WalletCreateSchema', () => {
    it('should validate matching passwords', () => {
      const params = {
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      };
      const result = WalletCreateSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should invalidate non-matching passwords', () => {
      const params = {
        password: 'SecurePass123!',
        confirmPassword: 'DifferentPass123!',
      };
      const result = WalletCreateSchema.safeParse(params);
      expect(result.success).toBe(false);
    });
  });
});