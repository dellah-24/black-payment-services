import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('bitcoinjs-lib', () => ({
  crypto: {
    hash256: vi.fn(() => Buffer.alloc(32)),
  },
}));

import { checkBalance } from './balance-checkers';

const originalFetch = global.fetch;
const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('cron balance checkers', () => {
  it('uses eth_call balanceOf for USDC_POL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        result: '0x00000000000000000000000000000000000000000000000000000000030291a0', // 50.5 USDC (6 decimals)
        id: 1,
      }),
    });

    const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28';
    const balance = await checkBalance(address, 'USDC_POL');

    expect(balance).toBe(50.5);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.method).toBe('eth_call');
    expect(body.params[0].to).toBe('0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359');
    expect(body.params[0].data).toMatch(/^0x70a08231/);
  });

  it('keeps native POL checks on eth_getBalance', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        result: '0xde0b6b3a7640000', // 1 POL
        id: 1,
      }),
    });

    const balance = await checkBalance('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28', 'POL');

    expect(balance).toBe(1);
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.method).toBe('eth_getBalance');
  });
});
