'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { WalletBalance } from '@/components/WalletBalance';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { ChainKey, getChainConfig, SUPPORTED_CHAINS } from '@/config/chains';
import { paymentService, PaymentRequest } from '@/lib/paymentService';
import { logger } from '@/lib/logger';

interface PaymentRequestWithMerchant extends PaymentRequest {
  merchant?: {
    id: string;
    name: string;
  };
}

export default function PayPage() {
  const params = useParams();
  const { user } = useWalletAuth();
  const [payment, setPayment] = useState<PaymentRequestWithMerchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainKey>(SUPPORTED_CHAINS[0] as ChainKey);

  useEffect(() => {
    const loadPayment = async () => {
      if (!params['id']) return;

      try {
        const paymentData = await paymentService.getPaymentRequest(params['id'] as string);
        setPayment(paymentData);
        if (paymentData) {
          setSelectedChain(paymentData.chain as ChainKey);
        }
      } catch (error) {
        logger.error('Failed to load payment request', error as Error);
        setError('Payment request not found');
      } finally {
        setIsLoading(false);
      }
    };

    loadPayment();
   }, [params['id']]);

  const handlePay = async () => {
    if (!user || !payment) return;

    setIsPaying(true);
    setError(null);

    try {
      await paymentService.payRequest(payment.id, user.id, selectedChain);
      setPayment({ ...payment, status: 'paid' });
    } catch (error) {
      const message = (error as Error).message;
      setError(message);
      logger.error('Payment failed', error as Error);
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </AuthGuard>
    );
  }

  if (!payment) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Payment Not Found</h1>
            <p className="text-gray-400">{error || 'This payment request does not exist or has expired.'}</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (payment.status === 'paid') {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
            <p className="text-gray-400">You have successfully paid {payment.amount} {payment.currency}</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (payment.status === 'expired') {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Payment Expired</h1>
            <p className="text-gray-400">This payment request has expired.</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Payment Request</h1>
                <p className="text-gray-400">From {payment.merchant?.name || 'Unknown Merchant'}</p>
              </div>

              {payment.description && (
                <div className="bg-gray-700 rounded-xl p-4 mb-6">
                  <p className="text-gray-300">{payment.description}</p>
                </div>
              )}

              <div className="bg-gray-700 rounded-xl p-6 mb-6">
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Amount Due</p>
                  <p className="text-4xl font-bold text-white mb-4">
                    {payment.amount} {payment.currency}
                  </p>
                  <p className="text-gray-400 text-sm">
                     Network: {getChainConfig(payment.chain as ChainKey).name}
                   </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-gray-300 mb-2">Pay with Network</label>
                <select
                   value={selectedChain}
                   onChange={(e) => setSelectedChain(e.target.value as ChainKey)}
                   className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                 >
                  {SUPPORTED_CHAINS.map((chain) => (
                    <option key={chain} value={chain}>
                      {getChainConfig(chain).name}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
                  <p className="text-red-200">{error}</p>
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={isPaying}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
              >
                {isPaying ? 'Processing...' : `Pay ${payment.amount} ${payment.currency}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
