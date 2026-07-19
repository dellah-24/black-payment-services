/**
 * Bitcoin Cash address utilities
 *
 * Provides conversion from CashAddr format to legacy Base58 format used by
 * some APIs. This implementation mirrors existing project logic to avoid
 * behavioral changes; checksum validation can be added later.
 */

import * as bitcoin from 'bitcoinjs-lib';

const CASHADDR_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

/**
 * Convert CashAddr to legacy Bitcoin address format
 * CashAddr format: bitcoincash:qp... -> Legacy format: 1... or 3...
 */
export function cashAddrToLegacy(cashAddr: string): string {
  // Remove prefix if present
  let address = cashAddr.toLowerCase();
  if (address.startsWith('bitcoincash:')) {
    address = address.substring(12);
  }

  // Decode base32
  const data: number[] = [];
  for (const char of address) {
    const index = CASHADDR_CHARSET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid CashAddr character: ${char}`);
    }
    data.push(index);
  }

  // Remove checksum (last 8 characters = 40 bits)
  const payload = data.slice(0, -8);

  // Convert from 5-bit to 8-bit
  let acc = 0;
  let bits = 0;
  const result: number[] = [];

  for (const value of payload) {
    acc = (acc << 5) | value;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      result.push((acc >> bits) & 0xff);
    }
  }

  // First byte is version, rest is hash160
  const version = result[0];
  const hash160 = result.slice(1, 21);

  // Convert to legacy address
  // Version 0 = P2PKH (starts with 1)
  // Version 8 = P2SH (starts with 3)
  const legacyVersion = version === 0 ? 0x00 : 0x05;

  // Build legacy address: version + hash160 + checksum
  const payload2 = Buffer.concat([
    Buffer.from([legacyVersion]),
    Buffer.from(hash160),
  ]);

  // Double SHA256 for checksum
  const checksum = bitcoin.crypto.hash256(payload2).subarray(0, 4);
  const addressBytes = Buffer.concat([payload2, checksum]);

  // Base58 encode
  const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const digits = [0];
  for (let i = 0; i < addressBytes.length; i++) {
    let carry = addressBytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  let legacyAddress = '';
  // Leading zeros
  for (let i = 0; i < addressBytes.length && addressBytes[i] === 0; i++) {
    legacyAddress += BASE58_ALPHABET[0];
  }
  // Convert digits to string
  for (let i = digits.length - 1; i >= 0; i--) {
    legacyAddress += BASE58_ALPHABET[digits[i]];
  }

  return legacyAddress;
}
