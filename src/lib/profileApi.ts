import { createClient } from '@supabase/supabase-js';
import { getEnv, isPlaceholder, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface UserProfile {
  id: string;
  userId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

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
    email: data.email,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    kycStatus: data.kyc_status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

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
    email: data.email,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    kycStatus: data.kyc_status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getPublicProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

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
    email: '',
    avatarUrl: data.avatar_url,
    bio: data.bio,
    kycStatus: data.kyc_status,
    createdAt: data.created_at,
    updatedAt: data.created_at,
  };
}
