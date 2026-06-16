/**
 * Authentication Guard Component
 * Ensures users are logged in before accessing protected routes
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { profileApi } from '@/lib/profileApi';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowNoSession?: boolean; // If true, shows login prompt instead of redirect
}

export function AuthGuard({ children, allowNoSession = false }: AuthGuardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check Supabase session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (allowNoSession) {
            setIsLoading(false);
            return;
          }
          // Redirect to auth
          router.push('/auth');
          return;
        }

        // Check if user has a profile with wallet
        const profile = await profileApi.getByUserId(session.user.id);
        
        if (profile && profile.wallet_address) {
          setIsAuthenticated(true);
          setHasProfile(true);
        } else {
          // User logged in but no profile/wallet - redirect to onboarding to create/link wallet
          if (!allowNoSession) {
            router.push('/onboarding');
            return;
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (!allowNoSession) {
          router.push('/auth');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, allowNoSession]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !allowNoSession) {
    return null; // Will redirect
  }

  return <>{children}</>;
}

/**
 * Hook for checking authentication status
 */
export function useAuthCheck() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return { isLoading, isAuthenticated, checkAuth };
}