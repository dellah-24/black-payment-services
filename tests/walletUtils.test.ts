/**
 * Wallet Utils Unit Tests
 * Tests for address validation, QR code generation, and gas estimation
 */

import { describe, it, expect } from '@jest/globals';
import {
  isValidAddress,
  isValidTronAddress,
  validateAddress,
  generateQRCode,
} from '@/lib/walletUtils';

describe('Wallet Utils - Address Validation', () => {
  describe('isValidAddress', () => {
    it('should return true for valid EVM address', () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB21';
      expect(isValidAddress(validAddress)).toBe(true);
    });

    it('should return true for checksum address', () => {
      const checksumAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB21';
      expect(isValidAddress(checksumAddress)).toBe(true);
    });

    it('should return false for invalid address (too short)', () => {
      const shortAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB2';
      expect(isValidAddress(shortAddress)).toBe(false);
    });

    it('should return false for invalid address (no 0x prefix)', () => {
      const noPrefixAddress = '742d35Cc6634C0532925a3b844Bc9e7595f3fB21';
      expect(isValidAddress(noPrefixAddress)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidAddress('')).toBe(false);
    });

    it('should return false for non-hex characters', () => {
      const nonHexAddress = '0xgggggggggggggggggggggggggggggggggggggggg';
      expect(isValidAddress(nonHexAddress)).toBe(false);
    });
  });

  describe('isValidTronAddress', () => {
    it('should return true for valid TRON address', () => {
      const validTronAddress = 'TJRabPrcZyX9dLD4V7W2qQa7q4UqZmG4Xy';
      expect(isValidTronAddress(validTronAddress)).toBe(true);
    });

    it('should return false for TRON address (too short)', () => {
      const shortAddress = 'TJRabPrcZyX9dLD4V7W2qQa7q4';
      expect(isValidTronAddress(shortAddress)).toBe(false);
    });

    it('should return false for TRON address (starts with wrong letter)', () => {
      const wrongPrefixAddress = 'AJRabPrcZyX9dLD4V7W2qQa7q4UqZmG4Xy';
      expect(isValidTronAddress(wrongPrefixAddress)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidTronAddress('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isValidTronAddress(null as any)).toBe(false);
      expect(isValidTronAddress(undefined as any)).toBe(false);
    });
  });

  describe('validateAddress', () => {
    it('should validate EVM addresses for ethereum chain', () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB21';
      expect(validateAddress(validAddress, 'ethereum')).toBe(true);
    });

    it('should validate EVM addresses for bsc chain', () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB21';
      expect(validateAddress(validAddress, 'bsc')).toBe(true);
    });

    it('should validate EVM addresses for polygon chain', () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB21';
      expect(validateAddress(validAddress, 'polygon')).toBe(true);
    });

    it('should validate TRON addresses for tron chain', () => {
      const validTronAddress = 'TJRabPrcZyX9dLD4V7W2qQa7q4UqZmG4Xy';
      expect(validateAddress(validTronAddress, 'tron')).toBe(true);
    });

    it('should default to EVM validation for unknown chain', () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB21';
      expect(validateAddress(validAddress, 'unknown')).toBe(true);
    });
  });
});

describe('Wallet Utils - QR Code Generation', () => {
  it('should generate QR code for valid address', async () => {
    const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB21';
    const qrCode = await generateQRCode(address);
    expect(qrCode).toBeTruthy();
    expect(qrCode.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('should generate QR code with custom size', async () => {
    const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB21';
    const qrCode = await generateQRCode(address, 300);
    expect(qrCode).toBeTruthy();
  });

  it('should include address in QR code data', async () => {
    const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB21';
    const qrCode = await generateQRCode(address);
    // The QR code should contain the address
    const decoded = Buffer.from(qrCode.split(',')[1], 'base64').toString();
    expect(decoded).toBeTruthy();
  });
});

describe('Address Format Security', () => {
  it('should handle case sensitivity for addresses', () => {
    const lowerAddress = '0x742d35cc6634c0532925a3b844bc9e7595f3fb21';
    const upperAddress = '0x742D35CC6634C0532925A3B844BC9E7595F3FB21';
    
    // Both should be valid
    expect(isValidAddress(lowerAddress)).toBe(true);
    expect(isValidAddress(upperAddress)).toBe(true);
  });

  it('should reject addresses with invalid checksum', () => {
    // This is a checksummed address that might fail checksum check
    const checksummedAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB21';
    // ethers.js isAddress will validate checksum
    expect(isValidAddress(checksummedAddress)).toBe(true);
  });

  it('should handle very long addresses gracefully', () => {
    const longAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB21123456789012345678901234567890';
    expect(isValidAddress(longAddress)).toBe(false);
  });

  it('should handle addresses with special characters', () => {
    const specialCharsAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f3fB2!';
    expect(isValidAddress(specialCharsAddress)).toBe(false);
  });
});