/**
 * Wallet Service - Centralized API layer for wallet operations
 */

import { ethers } from 'ethers';
import { ChainKey, CHAINS, getChainConfig } from '@/config/chains';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';

export interface BalanceResult {
  nativeBalance: string;
  usdtBalance: string;
  usdValue: string;
  priceChange: number;
}

export interface TransactionResult {
  hash: string;
  from: string;
  to: string;
  value: string;
  fee: string;
  status: 'pending' | 'confirmed' | 'failed';
}

class WalletService {
  private providers: Map<ChainKey, ethers.JsonRpcProvider> = new Map();

  /**
   * Get or create provider for a chain
   */
  private getProvider(chain: ChainKey): ethers.JsonRpcProvider {
    if (!this.providers.has(chain)) {
      const config = getChainConfig(chain);
      const provider = new ethers.JsonRpcProvider(config.rpcUrls[0]);
      this.providers.set(chain, provider);
    }
    return this.providers.get(chain)!;
  }

  /**
   * Get balance for an address on a specific chain
   */
  async getBalance(address: string, chain: ChainKey): Promise<BalanceResult> {
    try {
      const provider = this.getProvider(chain);
      const config = getChainConfig(chain);

      // Get native balance
      const nativeBalance = await provider.getBalance(address);
      const formattedNative = ethers.formatEther(nativeBalance);

      // Get USDT balance (simplified - in production, use proper ERC20 contract)
      let usdtBalance = '0';
      if (config.usdtAddress) {
        try {
          const usdtContract = new ethers.Contract(
            config.usdtAddress,
            ['function balanceOf(address) view returns (uint256)'],
            provider
          );
          const balance = await usdtContract.balanceOf(address);
          usdtBalance = ethers.formatUnits(balance, 6); // USDT has 6 decimals
        } catch (error) {
          logger.warn(`Failed to get USDT balance for ${chain}`, { error, chain });
        }
      }

      // Calculate USD value (simplified - in production, use price API)
      const usdValue = `$${(parseFloat(usdtBalance) * 1.0).toFixed(2)}`;
      const priceChange = 0; // In production, fetch from price API

      return {
        nativeBalance: formattedNative,
        usdtBalance,
        usdValue,
        priceChange,
      };
    } catch (error) {
      logger.error(`Error getting balance for ${chain}`, error as Error, { chain });
      throw error;
    }
  }

  /**
   * Get balances for all supported chains
   */
  async getAllBalances(address: string): Promise<Map<ChainKey, BalanceResult>> {
    const balances = new Map<ChainKey, BalanceResult>();
    const chains = Object.keys(CHAINS) as ChainKey[];

    await Promise.allSettled(
      chains.map(async (chain) => {
        try {
          const balance = await this.getBalance(address, chain);
          balances.set(chain, balance);
        } catch (error) {
          logger.warn(`Failed to get balance for ${chain}`, { error, chain });
        }
      })
    );

    return balances;
  }

  /**
   * Send USDT to an address
   */
  async sendUSDT(
    privateKey: string,
    to: string,
    amount: string,
    chain: ChainKey
  ): Promise<TransactionResult> {
    try {
      const provider = this.getProvider(chain);
      const config = getChainConfig(chain);
      const wallet = new ethers.Wallet(privateKey, provider);

      if (!config.usdtAddress) {
        throw new Error(`USDT not supported on ${chain}`);
      }

      const usdtContract = new ethers.Contract(
        config.usdtAddress,
        ['function transfer(address to, uint256 amount) returns (bool)'],
        wallet
      );

      const amountWei = ethers.parseUnits(amount, 6);
      const tx = await usdtContract.transfer(to, amountWei);
      const receipt = await tx.wait();

      return {
        hash: tx.hash,
        from: wallet.address,
        to,
        value: amount,
        fee: ethers.formatEther(receipt.gasUsed * receipt.gasPrice),
        status: receipt.status === 1 ? 'confirmed' : 'failed',
      };
    } catch (error) {
      logger.error('Error sending USDT', error as Error, { to, amount, chain });
      throw error;
    }
  }

  /**
   * Store wallet in Supabase
   */
  async storeWallet(
    address: string,
    encryptedPrivateKey: string,
    encryptedMnemonic: string | null,
    iv: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('encrypted_wallets')
        .upsert({
          wallet_address: address.toLowerCase(),
          encrypted_private_key: encryptedPrivateKey,
          encrypted_mnemonic: encryptedMnemonic,
          encryption_iv: iv,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'wallet_address' });

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Error storing wallet', error as Error, { address });
      return false;
    }
  }

  /**
   * Retrieve wallet from Supabase
   */
  async retrieveWallet(address: string): Promise<{
    encryptedPrivateKey: string;
    encryptedMnemonic: string | null;
    iv: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('encrypted_wallets')
        .select('encrypted_private_key, encrypted_mnemonic, encryption_iv')
        .eq('wallet_address', address.toLowerCase())
        .single();

      if (error || !data) return null;

      return {
        encryptedPrivateKey: data.encrypted_private_key,
        encryptedMnemonic: data.encrypted_mnemonic,
        iv: data.encryption_iv,
      };
    } catch (error) {
      logger.error('Error retrieving wallet', error as Error, { address });
      return null;
    }
  }

  /**
   * Delete wallet from Supabase
   */
  async deleteWallet(address: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('encrypted_wallets')
        .delete()
        .eq('wallet_address', address.toLowerCase());

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Error deleting wallet', error as Error, { address });
      return false;
    }
  }

  /**
   * Validate Ethereum address
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(
    txHash: string,
    chain: ChainKey
  ): Promise<'pending' | 'confirmed' | 'failed'> {
    try {
      const provider = this.getProvider(chain);
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) return 'pending';
      return receipt.status === 1 ? 'confirmed' : 'failed';
    } catch (error) {
      logger.error('Error getting transaction status', error as Error, { txHash, chain });
      return 'pending';
    }
  }
}

// Export singleton instance
export const walletService = new WalletService();
