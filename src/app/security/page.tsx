'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { kycService } from '@/kyc';
import { logger } from '@/lib/logger';

export default function SecurityPage() {
  const { user } = useWalletAuth();
  const [kycStatus, setKycStatus] = useState<'pending' | 'verified' | 'rejected' | 'not_started'>('not_started');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKYCSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await kycService.submitKYC(user.id, {
        fullName: formData.get('fullName') as string,
        dateOfBirth: formData.get('dateOfBirth') as string,
        address: formData.get('address') as string,
        documentType: formData.get('documentType') as string,
        documentNumber: formData.get('documentNumber') as string,
      });

      setKycStatus('pending');
    } catch (error) {
      const message = (error as Error).message;
      setError(message);
      logger.error('KYC submission failed', error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Security</h1>
            <p className="text-gray-400">Manage your account security and verification</p>
          </header>

          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4">KYC Verification</h2>
              <p className="text-gray-400 mb-6">
                Complete KYC verification to unlock all features and higher limits.
              </p>

              {kycStatus === 'verified' ? (
                <div className="bg-green-900/50 border border-green-500 rounded-lg p-4">
                  <p className="text-green-200">✓ Your identity has been verified</p>
                </div>
              ) : kycStatus === 'pending' ? (
                <div className="bg-yellow-900/50 border border-yellow-500 rounded-lg p-4">
                  <p className="text-yellow-200">⏳ Your verification is being processed</p>
                </div>
              ) : kycStatus === 'rejected' ? (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
                  <p className="text-red-200">✗ Your verification was rejected. Please try again.</p>
                </div>
              ) : (
                <form onSubmit={handleKYCSubmit} className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Full Name</label>
                    <input
                      type="text"
                      name="fullName"
                      required
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      required
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">Address</label>
                    <input
                      type="text"
                      name="address"
                      required
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">Document Type</label>
                    <select
                      name="documentType"
                      required
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select document type</option>
                      <option value="passport">Passport</option>
                      <option value="drivers_license">Driver's License</option>
                      <option value="national_id">National ID</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">Document Number</label>
                    <input
                      type="text"
                      name="documentNumber"
                      required
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg">
                      <p className="text-red-200">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Verification'}
                  </button>
                </form>
              )}
            </div>

            <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4">Security Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <h3 className="text-white font-semibold">Two-Factor Authentication</h3>
                    <p className="text-gray-400 text-sm">Add an extra layer of security</p>
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                    Enable
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <h3 className="text-white font-semibold">Change Password</h3>
                    <p className="text-gray-400 text-sm">Update your password regularly</p>
                  </div>
                  <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                    Change
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <h3 className="text-white font-semibold">Active Sessions</h3>
                    <p className="text-gray-400 text-sm">Manage your active sessions</p>
                  </div>
                  <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
