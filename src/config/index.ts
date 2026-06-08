/**
 * Centralized Configuration Exports
 * Provides unified access to all configuration modules
 */

// Re-export chain configuration
export type { ChainKey, ChainConfig } from './chains';
export {
  CHAINS,
  getChainConfig,
  getSupportedChains,
  getChainById,
  getPrimaryRpcUrl,
  getRpcUrls,
} from './chains';

export { default } from './chains';