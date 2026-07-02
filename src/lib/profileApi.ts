import { createClient } from '@supabase/supabase-js';
import { getEnv, isPlaceholder, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface UserProfile {
  id: string;
  userId: string;
  username: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is required');
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    username: data.username,
    name: data.username,
    email: data.email,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    kycStatus: data.kyc_status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is required');
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('profiles')
    .update({
      username: updates.username,
      bio: updates.bio,
      avatar_url: updates.avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update profile', error);
    throw new Error('Failed to update profile');
  }

  return {
    id: data.id,
    userId: data.user_id,
    username: data.username,
    name: data.username,
    email: data.email,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    kycStatus: data.kyc_status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getPublicProfile(userId: string): Promise<UserProfile | null> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is required');
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, username, avatar_url, bio, kyc_status, created_at')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    username: data.username,
    name: data.username,
    email: '',
    avatarUrl: data.avatar_url,
    bio: data.bio,
    kycStatus: data.kyc_status,
    createdAt: data.created_at,
    updatedAt: data.created_at,
  };
}

export async function updateSettings(userId: string, settings: { notifications?: any }): Promise<void> {
  // Placeholder for settings update logic
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is required');
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      notifications: settings.notifications,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    logger.error('Failed to update settings', error);
    throw new Error('Failed to update settings');
  }
}

// Export all functions as a service object for convenience
export const profileApi = {
  getProfile,
  updateProfile,
  getPublicProfile,
  updateSettings,
};
