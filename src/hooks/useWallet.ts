'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { walletStorage } from '@/lib/secureWalletStorage';

/**
 * Wallet data structure
 */
export interface WalletData {
  address: string;
  privateKey?: string;
  mnemonic?: string;
}

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Load wallet from Supabase on mount
  useEffect(() => {
    const restoreSession = async () => {
      if (walletStorage.hasSession()) {
        const savedAccount = walletStorage.getCurrentAccount();
        if (savedAccount) {
          // Try to retrieve wallet from Supabase
          const data = await walletStorage.retrieveWallet(savedAccount);
          if (data) {
            setAccount(savedAccount);
            setWalletData({
              address: savedAccount,
              privateKey: data.privateKey,
              mnemonic: data.mnemonic,
            });
          } else {
            // Session invalid, clear it
            walletStorage.clearSession();
          }
        }
      }
    };
    
    restoreSession();
  }, []);

  /**
   * Create a new wallet
   */
  const createWallet = useCallback(async (): Promise<WalletData | null> => {
    setIsConnecting(true);
    try {
      // Generate random wallet
      const wallet = ethers.Wallet.createRandom();
      
      // Get mnemonic phrase
      const mnemonicPhrase = (wallet as any).mnemonic?.phrase || '';
      
      // Store encrypted in Supabase
      const stored = await walletStorage.storeWallet(
        wallet.address,
        wallet.privateKey,
        mnemonicPhrase || undefined
      );
      
      if (!stored) {
        console.error('Failed to store wallet in Supabase');
        return null;
      }

      const data: WalletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: mnemonicPhrase,
      };

      setAccount(wallet.address);
      setWalletData(data);
      
      return data;
    } catch (err) {
      console.error('Failed to create wallet:', err);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Import an existing wallet from private key
   */
  const importWallet = useCallback(async (privateKey: string): Promise<WalletData | null> => {
    setIsConnecting(true);
    try {
      const wallet = new ethers.Wallet(privateKey);
      
      // Store encrypted in Supabase
      const stored = await walletStorage.storeWallet(
        wallet.address,
        wallet.privateKey,
        undefined
      );
      
      if (!stored) {
        console.error('Failed to store wallet in Supabase');
        return null;
      }

      const data: WalletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
      };

      setAccount(wallet.address);
      setWalletData(data);
      
      return data;
    } catch (err) {
      console.error('Failed to import wallet:', err);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Import wallet from mnemonic
   */
  const importFromMnemonic = useCallback(async (mnemonic: string): Promise<WalletData | null> => {
    setIsConnecting(true);
    try {
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      
      // Store encrypted in Supabase
      const stored = await walletStorage.storeWallet(
        wallet.address,
        wallet.privateKey,
        mnemonic
      );
      
      if (!stored) {
        console.error('Failed to store wallet in Supabase');
        return null;
      }

      const data: WalletData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: mnemonic,
      };

      setAccount(wallet.address);
      setWalletData(data);
      
      return data;
    } catch (err) {
      console.error('Failed to import wallet from mnemonic:', err);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Get signer for transactions
   */
  const getSigner = useCallback((): ethers.Signer | null => {
    if (!walletData?.privateKey) return null;
    return new ethers.Wallet(walletData.privateKey);
  }, [walletData]);

  /**
   * Disconnect wallet (clear from Supabase)
   */
  const disconnectWallet = useCallback(async () => {
    if (account) {
      await walletStorage.deleteWallet(account);
    }
    setAccount(null);
    setWalletData(null);
  }, [account]);

  return {
    account,
    walletData,
    isConnecting,
    createWallet,
    importWallet,
    importFromMnemonic,
    getSigner,
    disconnectWallet,
    isConnected: !!account,
  };
}
