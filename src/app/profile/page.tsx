'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { profileApi } from '@/lib/profileApi';
import { logger } from '@/lib/logger';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

export default function ProfilePage() {
  const { user } = useWalletAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const data = await profileApi.getProfile(user.id);
        setProfile(data);
        setName(data.name);
      } catch (error) {
        logger.error('Failed to load profile', error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      await profileApi.updateProfile(user.id, { name });
      setProfile((prev) => prev ? { ...prev, name } : null);
      setIsEditing(false);
      setError(null);
    } catch (error) {
      const message = (error as Error).message;
      setError(message);
      logger.error('Failed to update profile', error as Error);
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

  if (!profile) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Profile Not Found</h1>
            <p className="text-gray-400">Unable to load your profile.</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
            <p className="text-gray-400">Manage your account settings</p>
          </header>

          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
              <div className="flex items-center mb-8">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-6">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
                  <p className="text-gray-400">{profile.email}</p>
                  <span
                    className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                      profile.kycStatus === 'verified'
                        ? 'bg-green-900 text-green-300'
                        : profile.kycStatus === 'pending'
                        ? 'bg-yellow-900 text-yellow-300'
                        : 'bg-red-900 text-red-300'
                    }`}
                  >
                    {profile.kycStatus.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 mb-2">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-white bg-gray-700 rounded-lg px-4 py-3">{profile.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Email</label>
                  <p className="text-white bg-gray-700 rounded-lg px-4 py-3">{profile.email}</p>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Member Since</label>
                  <p className="text-white bg-gray-700 rounded-lg px-4 py-3">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg">
                    <p className="text-red-200">{error}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setName(profile.name);
                        }}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
