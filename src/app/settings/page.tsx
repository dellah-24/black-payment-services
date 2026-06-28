'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { profileApi } from '@/lib/profileApi';
import { logger } from '@/lib/logger';

export default function SettingsPage() {
  const { user } = useWalletAuth();
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    transactions: true,
    marketing: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSaveSettings = async () => {
    if (!user) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await profileApi.updateSettings(user.id, { notifications });
      setSuccess('Settings saved successfully');
    } catch (error) {
      const message = (error as Error).message;
      setError(message);
      logger.error('Failed to save settings', error as Error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
            <p className="text-gray-400">Manage your preferences</p>
          </header>

          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-6">Notifications</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <h3 className="text-white font-semibold">Email Notifications</h3>
                    <p className="text-gray-400 text-sm">Receive email updates</p>
                  </div>
                  <button
                    onClick={() => handleNotificationChange('email')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifications.email ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notifications.email ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <h3 className="text-white font-semibold">Push Notifications</h3>
                    <p className="text-gray-400 text-sm">Receive push notifications</p>
                  </div>
                  <button
                    onClick={() => handleNotificationChange('push')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifications.push ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notifications.push ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <h3 className="text-white font-semibold">Transaction Alerts</h3>
                    <p className="text-gray-400 text-sm">Get notified about transactions</p>
                  </div>
                  <button
                    onClick={() => handleNotificationChange('transactions')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifications.transactions ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notifications.transactions ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <h3 className="text-white font-semibold">Marketing Emails</h3>
                    <p className="text-gray-400 text-sm">Receive marketing and promotional emails</p>
                  </div>
                  <button
                    onClick={() => handleNotificationChange('marketing')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifications.marketing ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notifications.marketing ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
                  <p className="text-red-200">{error}</p>
                </div>
              )}

              {success && (
                <div className="mt-6 p-4 bg-green-900/50 border border-green-500 rounded-lg">
                  <p className="text-green-200">{success}</p>
                </div>
              )}

              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-6">Preferences</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <h3 className="text-white font-semibold">Language</h3>
                    <p className="text-gray-400 text-sm">Select your preferred language</p>
                  </div>
                  <select className="bg-gray-600 border border-gray-500 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="pt">Portuguese</option>
                    <option value="ru">Russian</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <h3 className="text-white font-semibold">Currency Display</h3>
                    <p className="text-gray-400 text-sm">Default currency for display</p>
                  </div>
                  <select className="bg-gray-600 border border-gray-500 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
