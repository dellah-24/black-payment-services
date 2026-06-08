/**
 * Unit tests for faucet service
 */

import { getFaucetInfo, getSupportedTestnetChains, requestTestnetUSDT } from '@/lib/faucet';

describe('Faucet Service', () => {
  describe('getFaucetInfo', () => {
    test('should return faucet info for Ethereum', () => {
      const info = getFaucetInfo('ethereum');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('Ethereum Sepolia');
    });

    test('should return faucet info for BSC', () => {
      const info = getFaucetInfo('bsc');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('BNB Chain Testnet');
    });

    test('should return faucet info for Solana', () => {
      const info = getFaucetInfo('solana');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('Solana Devnet');
    });
  });

  describe('getSupportedTestnetChains', () => {
    test('should return list of supported testnet chains', () => {
      const chains = getSupportedTestnetChains();
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThan(0);
    });

    test('should include chain metadata', () => {
      const chains = getSupportedTestnetChains();
      chains.forEach(({ chain, name, faucet }) => {
        expect(chain).toBeDefined();
        expect(name).toBeDefined();
        expect(faucet).toHaveProperty('url');
      });
    });
  });

  describe('requestTestnetUSDT', () => {
    test('should accept any address in demo mode', async () => {
      // In demo mode, the function accepts any address
      const result = await requestTestnetUSDT('ethereum', 'invalid');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });

    test('should accept valid Ethereum address', async () => {
      const validAddress = '0x' + 'a'.repeat(40);
      const result = await requestTestnetUSDT('ethereum', validAddress);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });
  });
});