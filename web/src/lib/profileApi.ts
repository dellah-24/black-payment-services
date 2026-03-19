'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize Supabase client - check both env vars exist
const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({} as SupabaseClient);

export interface ProfileDetails {
  id?: string;
  wallet_address?: string;
  username?: string;
  avatar_url?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  country?: string;
  nationality?: string;
  state?: string;
  city?: string;
  address_line1?: string;
  address_line2?: string;
  postal_code?: string;
  kyc_level?: number;
  kyc_status?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const profileApi = {
  /**
   * Get or create profile for wallet address
   */
  async getOrCreate(walletAddress: string): Promise<ProfileDetails> {
    if (!isSupabaseConfigured) {
      // Return mock data when Supabase is not configured
      return {
        wallet_address: walletAddress.toLowerCase(),
        kyc_level: 0,
        kyc_status: 'none',
      };
    }

    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (!profile && !error) {
      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({ wallet_address: walletAddress.toLowerCase() })
        .select()
        .single();

      if (createError) throw createError;
      profile = newProfile;

      // Create reputation entry
      await supabase
        .from('user_reputation')
        .insert({ user_id: profile.id });
    }

    if (error) throw error;
    return profile!;
  },

  /**
   * Get profile by wallet address
   */
  async getByAddress(walletAddress: string): Promise<ProfileDetails | null> {
    if (!isSupabaseConfigured) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Update profile with personal details
   */
  async update(
    walletAddress: string,
    updates: Partial<ProfileDetails>
  ): Promise<ProfileDetails> {
    if (!isSupabaseConfigured) {
      // Simulate update when Supabase is not configured
      console.warn('Supabase not configured - profile update simulated');
      return {
        ...updates,
        wallet_address: walletAddress.toLowerCase(),
      } as ProfileDetails;
    }

    const profile = await this.getOrCreate(walletAddress);

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Check if profile is complete (has required fields for KYC)
   */
  async isProfileComplete(walletAddress: string): Promise<boolean> {
    const profile = await this.getByAddress(walletAddress);
    if (!profile) return false;

    return !!(
      profile.first_name &&
      profile.last_name &&
      profile.email &&
      profile.date_of_birth &&
      profile.country &&
      profile.address_line1 &&
      profile.city &&
      profile.postal_code
    );
  },

  /**
   * Get profile completion percentage
   */
  async getCompletionPercentage(walletAddress: string): Promise<number> {
    const profile = await this.getByAddress(walletAddress);
    if (!profile) return 0;

    const fields = [
      profile.username,
      profile.first_name,
      profile.last_name,
      profile.email,
      profile.phone,
      profile.date_of_birth,
      profile.country,
      profile.nationality,
      profile.state,
      profile.city,
      profile.address_line1,
      profile.postal_code,
    ];

    const filledCount = fields.filter(Boolean).length;
    return Math.round((filledCount / fields.length) * 100);
  },
};

// Country list for the dropdown
export const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'PT', name: 'Portugal' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Peru' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'Egypt' },
  { code: 'GH', name: 'Ghana' },
  { code: 'UG', name: 'Uganda' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'IN', name: 'India' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'PL', name: 'Poland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NZ', name: 'New Zealand' },
];
