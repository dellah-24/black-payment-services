import { RPCError } from '../src/wallet/providers/RPCError';
import { ProviderRegistry, ChainType } from '../src/wallet/providers/ProviderRegistry';
import { Web3Provider } from '../src/wallet/providers/Web3Provider';

describe('RPCError', () => {
  it('should create an RPCError with code and message', () => {
    const error = new RPCError(-32603, 'Internal error');
    expect(error.code).toBe(-32603);
    expect(error.message).toBe('Internal error');
    expect(error.name).toBe('RPCError');
  });

  it('should create error from unknown error', () => {
    const error = RPCError.fromError(new Error('test error'));
    expect(error.code).toBe(-32603);
    expect(error.message).toBe('test error');
  });

  it('should create error from RPCError', () => {
    const original = new RPCError(4001, 'User rejected');
    const error = RPCError.fromError(original);
    expect(error.code).toBe(4001);
    expect(error.message).toBe('User rejected');
  });

  it('should create error from non-Error value', () => {
    const error = RPCError.fromError('string error');
    expect(error.code).toBe(-32603);
    expect(error.message).toBe('Internal error');
  });

  it('should create invalid params error', () => {
    const error = RPCError.invalidParams('Invalid address');
    expect(error.code).toBe(-32602);
    expect(error.message).toBe('Invalid address');
  });

  it('should create method not found error', () => {
    const error = RPCError.methodNotFound('eth_sendTransaction');
    expect(error.code).toBe(-32601);
    expect(error.message).toBe('Method not found: eth_sendTransaction');
  });

  it('should create user rejected error', () => {
    const error = RPCError.userRejectedRequest();
    expect(error.code).toBe(4001);
    expect(error.message).toBe('User rejected request');
  });

  it('should create unauthorized error', () => {
    const error = RPCError.unauthorized();
    expect(error.code).toBe(4100);
    expect(error.message).toBe('Unauthorized');
  });

  it('should create unsupported method error', () => {
    const error = RPCError.unsupportedMethod('custom_method');
    expect(error.code).toBe(4200);
    expect(error.message).toBe('Method not supported: custom_method');
  });

  it('should serialize to JSON', () => {
    const error = new RPCError(-32603, 'Test', { detail: 'info' });
    const json = error.toJSON();
    expect(json.code).toBe(-32603);
    expect(json.message).toBe('Test');
    expect(json.data).toEqual({ detail: 'info' });
  });
});

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  it('should register an ethereum provider', () => {
    const provider = registry.register({
      chain: 'ethereum',
      rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/test',
      chainId: '0x1',
    });

    expect(provider).toBeDefined();
    expect(registry.has('ethereum')).toBe(true);
    expect(registry.get('ethereum')).toBe(provider);
  });

  it('should register multiple providers', () => {
    registry.register({ chain: 'ethereum', rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/test' });
    registry.register({ chain: 'solana', rpcUrl: 'https://api.mainnet-beta.solana.com' });
    registry.register({ chain: 'bitcoin', rpcUrl: 'https://blockstream.info/api' });

    expect(registry.getRegisteredChains()).toEqual(['ethereum', 'solana', 'bitcoin']);
  });

  it('should throw for unsupported chain', () => {
    expect(() => {
      registry.register({ chain: 'unsupported' as ChainType, rpcUrl: 'https://example.com' });
    }).toThrow('Unsupported chain: unsupported');
  });

  it('should set and get address', () => {
    registry.register({ chain: 'ethereum', rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/test' });
    registry.setAddress('ethereum', '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');

    expect(registry.getAddress('ethereum')).toBe('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
  });

  it('should set and get chainId', () => {
    registry.register({ chain: 'ethereum', rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/test' });
    registry.setChainId('ethereum', '0x1');

    expect(registry.getChainId('ethereum')).toBe('0x1');
  });

  it('should unregister a provider', () => {
    registry.register({ chain: 'ethereum', rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/test' });
    expect(registry.has('ethereum')).toBe(true);

    const result = registry.unregister('ethereum');
    expect(result).toBe(true);
    expect(registry.has('ethereum')).toBe(false);
  });

  it('should clear all providers', () => {
    registry.register({ chain: 'ethereum', rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/test' });
    registry.register({ chain: 'solana', rpcUrl: 'https://api.mainnet-beta.solana.com' });

    registry.clear();
    expect(registry.getRegisteredChains()).toEqual([]);
  });

  it('should throw when requesting from unregistered chain', async () => {
    await expect(
      registry.request('ethereum', { method: 'eth_chainId' })
    ).rejects.toThrow('No provider registered for chain: ethereum');
  });
});

describe('Web3Provider', () => {
  let registry: ProviderRegistry;
  let web3Provider: Web3Provider;

  beforeEach(() => {
    registry = new ProviderRegistry();
    registry.register({ chain: 'ethereum', rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/test', chainId: '0x1' });
    web3Provider = new Web3Provider({
      registry,
      defaultChain: 'ethereum',
    });
  });

  it('should create a web3 provider', () => {
    expect(web3Provider).toBeDefined();
    expect(web3Provider.getDefaultChain()).toBe('ethereum');
    expect(web3Provider.getCurrentChain()).toBe('ethereum');
  });

  it('should get supported chains', () => {
    const chains = web3Provider.getSupportedChains();
    expect(chains).toEqual(['ethereum']);
  });

  it('should check if chain is supported', () => {
    expect(web3Provider.isChainSupported('ethereum')).toBe(true);
    expect(web3Provider.isChainSupported('solana')).toBe(false);
  });

  it('should switch chains', async () => {
    registry.register({ chain: 'solana', rpcUrl: 'https://api.mainnet-beta.solana.com', chainId: 'mainnet-beta' });
    
    await web3Provider.switchChain('solana');
    expect(web3Provider.getCurrentChain()).toBe('solana');
  });

  it('should throw when switching to unsupported chain', async () => {
    await expect(web3Provider.switchChain('unsupported' as ChainType)).rejects.toThrow();
  });

  it('should get and set address', () => {
    web3Provider.setAddress('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
    expect(web3Provider.getAddress()).toBe('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
  });

  it('should get and set chainId', () => {
    web3Provider.setChainId('0x1');
    expect(web3Provider.getChainId()).toBe('0x1');
  });

  it('should get provider for chain', () => {
    const provider = web3Provider.getProvider('ethereum');
    expect(provider).toBeDefined();
  });
});
