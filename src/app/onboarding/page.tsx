'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { CustodialChain, CUSTODIAL_MVP_CHAINS } from '@/lib/custodyPolicy';
import { getChainConfig } from '@/config/chains';
import { custodialService } from '@/lib/custodialService';
import { logger } from '@/lib/logger';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useWalletAuth();
  const [step, setStep] = useState(1);
  const [selectedChain, setSelectedChain] = useState<CustodialChain>(CUSTODIAL_MVP_CHAINS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChainSelect = (chain: CustodialChain) => {
    setSelectedChain(chain);
  };

  const handleCreateWallet = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const chainConfig = getChainConfig(selectedChain);
      const wallet = await custodialService.ensureCustodialAddress({ userId: user.id, chain: selectedChain });

      setStep(2);
    } catch (error) {
      const message = (error as Error).message;
      setError(message);
      logger.error('Wallet creation failed', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    router.push('/');
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 shadow-xl w-full max-w-md">
          {step === 1 && (
            <>
              <h1 className="text-3xl font-bold text-white mb-2 text-center">
                Choose Your Network
              </h1>
              <p className="text-gray-400 text-center mb-8">
                Select the blockchain network for your wallet
              </p>

              <div className="space-y-3 mb-8">
                {CUSTODIAL_MVP_CHAINS.map((chain) => {
                  const config = getChainConfig(chain);
                  return (
                    <button
                      key={chain}
                      onClick={() => handleChainSelect(chain)}
                      className={`w-full p-4 rounded-xl border-2 transition-colors ${
                        selectedChain === chain
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-semibold">{config.name}</h3>
                          <p className="text-gray-400 text-sm">{config.symbol}</p>
                        </div>
                        {selectedChain === chain && (
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
                  <p className="text-red-200">{error}</p>
                </div>
              )}

              <button
                onClick={handleCreateWallet}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
              >
                {isLoading ? 'Creating Wallet...' : 'Create Wallet'}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Wallet Created!</h1>
                <p className="text-gray-400">Your {getChainConfig(selectedChain).name} wallet is ready</p>
              </div>

              <div className="bg-gray-700 rounded-xl p-6 mb-8">
                <h3 className="text-white font-semibold mb-4">What's Next?</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span>Deposit USDT to your wallet address</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span>Send and receive payments</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span>Swap tokens and earn yield</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleComplete}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
