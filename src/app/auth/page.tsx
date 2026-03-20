'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User, 
  Wallet, 
  Mail,
  Phone,
  MapPin,
  Calendar,
  Flag,
  Building,
  ArrowLeft,
  Loader2,
  Save,
  CheckCircle,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Shield,
  Globe
} from 'lucide-react';
import { showToast } from '@/components/Toast';
import { walletStorage } from '@/lib/secureWalletStorage';
import { supabase, supabaseAuth } from '@/lib/supabaseClient';
import { profileApi, ProfileDetails, COUNTRIES } from '@/lib/profileApi';

type AuthMode = 'signin' | 'signup';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  
  // Auth form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Profile form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Step tracking for signup
  const [signupStep, setSignupStep] = useState<'credentials' | 'email_sent' | 'profile'>('credentials');
  // Store user from signUp response
  const [authUser, setAuthUser] = useState<any>(null);
  // Store email for resend functionality
  const [pendingEmail, setPendingEmail] = useState('');
  // Store password for wallet encryption
  const [walletPassword, setWalletPassword] = useState('');

  useEffect(() => {
    // Check if user is already logged in with Supabase
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Check if email is confirmed
          const hasConfirmedEmail = !!session.user?.email_confirmed_at;
          
          if (hasConfirmedEmail) {
            // Check if user has a profile with wallet
            try {
              const profile = await profileApi.getByUserId(session.user.id);
              if (profile && profile.wallet_address) {
                // User has wallet, redirect to home
                window.location.href = '/';
              } else {
                // Email confirmed but no wallet - go to profile step
                setAuthUser(session.user);
                setEmail(session.user.email || '');
                setSignupStep('profile');
              }
            } catch (profileError) {
              // Profile doesn't exist - go to profile step
              setAuthUser(session.user);
              setEmail(session.user.email || '');
              setSignupStep('profile');
            }
          } else {
            // Email not confirmed - show email sent step
            setAuthUser(session.user);
            setEmail(session.user.email || '');
            setPendingEmail(session.user.email || '');
            setSignupStep('email_sent');
          }
        }
      } catch (error) {
        console.log('Session check error:', error);
        // Continue to auth page
      }
    };
    checkSession();
  }, []);

  const handleConnectWallet = async () => {
    // Need password to encrypt wallet
    if (!walletPassword) {
      showToast('error', 'Please enter a wallet password');
      return;
    }
    
    setIsLoading(true);
    try {
      // For demo, we'll create a new wallet
      // In production, this would use WalletConnect or MetaMask
      const { ethers } = await import('ethers');
      const wallet = ethers.Wallet.createRandom();
      
      // Store wallet with password encryption
      await walletStorage.storeWallet(wallet.address, wallet.privateKey, wallet.mnemonic?.phrase || "", walletPassword);
      walletStorage.setCurrentAccount(wallet.address);
      
      setCurrentAccount(wallet.address);
      setWalletConnected(true);
      
      showToast('success', 'Wallet connected successfully!');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      showToast('error', 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      showToast('error', 'Please fill in all fields');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        showToast('error', 'Passwords do not match');
        return;
      }
      if (password.length < 8) {
        showToast('error', 'Password must be at least 8 characters');
        return;
      }
      
      // Create user with Supabase Auth
      setIsLoading(true);
      try {
        const { data, error } = await supabaseAuth.auth.signUp({
          email,
          password,
        });

        if (error) {
          showToast('error', error.message);
          return;
        }

        // Store user from signUp response
        if (data?.user) {
          setAuthUser(data.user);
          setPendingEmail(email);
        }

        // Move to email sent step - user needs to confirm email first
        setSignupStep('email_sent');
        showToast('success', 'Confirmation email sent! Please check your inbox.');
      } catch (error: any) {
        showToast('error', error.message || 'Failed to create account');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Sign in with Supabase Auth
      setIsLoading(true);
      try {
        const { data, error } = await supabaseAuth.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          showToast('error', error.message);
          setIsLoading(false);
          return;
        }

        // Get user and their profile to retrieve wallet
        const { data: { user } } = await supabaseAuth.auth.getUser();
        
        if (user) {
          // Try to get profile and wallet from database
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('wallet_address')
              .eq('id', user.id)
              .maybeSingle();

            if (profileError) {
              // Ignore 406 and PGRST errors - profile might not exist yet
              if (!profileError.message?.includes('406') && 
                  !profileError.code?.startsWith('PGRST')) {
                console.warn('Profile query error:', profileError.message);
              }
            }

            if (profile?.wallet_address) {
              // Wallet is stored in Supabase, will need password to decrypt on home page
              console.log('Found wallet address:', profile.wallet_address);
            }
          } catch (e) {
            // Ignore errors - profile might not exist yet
            console.warn('Profile query failed:', e);
          }
        }

        showToast('success', 'Signed in successfully!');
        setIsLoading(false);
        // Use window.location for more reliable redirect
        window.location.href = '/';
      } catch (error: any) {
        showToast('error', error.message || 'Failed to sign in');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCompleteSignup = async () => {
    // Validate required profile fields
    if (!firstName || !lastName || !email || !dateOfBirth || !country || !city || !addressLine1 || !postalCode) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // Use the user stored from signUp response
      const user = authUser;
      
      if (!user) {
        showToast('error', 'Please sign up first');
        return;
      }

      // Create wallet for the user (required for the app)
      const { ethers } = await import('ethers');
      const wallet = ethers.Wallet.createRandom();
      
      // Store wallet with password encryption
      await walletStorage.storeWallet(wallet.address, wallet.privateKey, wallet.mnemonic?.phrase || "", walletPassword);
      walletStorage.setCurrentAccount(wallet.address);
      
      setCurrentAccount(wallet.address);
      setWalletConnected(true);

      // Save profile to database with user ID
      const updates: ProfileDetails = {
        id: user.id, // Link to Supabase Auth user
        username: email.split('@')[0],
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        date_of_birth: dateOfBirth,
        country,
        nationality,
        state,
        city,
        address_line1: addressLine1,
        postal_code: postalCode,
      };

      await profileApi.update(wallet.address, updates);
      
      // Store session
      walletStorage.setCurrentAccount(wallet.address);
      
      showToast('success', 'Account created successfully!');
      window.location.href = '/';
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('error', 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormField = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    type: 'text' | 'email' | 'password' | 'tel' | 'date' | 'select' = 'text',
    placeholder?: string,
    required?: boolean,
    icon?: React.ReactNode
  ) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            {icon}
          </div>
        )}
        {type === 'select' ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full bg-gray-800/50 border border-gray-700 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${icon ? 'pl-10' : ''}`}
          >
            <option value="">Select {label}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        ) : type === 'password' ? (
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={`w-full bg-gray-800/50 border border-gray-700 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${icon ? 'pl-10' : 'pr-10'}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full bg-gray-800/50 border border-gray-700 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${icon ? 'pl-10' : ''}`}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/" className="p-2.5 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h1>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gray-900/50 border border-gray-700/50 p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative">
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-8">
              <button
                onClick={() => { setMode('signup'); setSignupStep('credentials'); }}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                  mode === 'signup' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <UserPlus className="h-4 w-4" />
                Sign Up
              </button>
              <button
                onClick={() => setMode('signin')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                  mode === 'signin' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </button>
            </div>

            {/* Wallet Connection - Auto-created after profile */}
            {mode === 'signup' && signupStep === 'profile' && (
              <div className="mb-8 p-4 rounded-xl bg-indigo-900/20 border border-indigo-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-6 w-6 text-indigo-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Wallet</p>
                      <p className="text-xs text-gray-400">
                        A wallet will be created for you automatically
                      </p>
                    </div>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
              </div>
            )}

            {/* Step 1: Credentials */}
            {(signupStep === 'credentials' || mode === 'signin') && (
              <div className="space-y-6">
                {renderFormField('Email', email, setEmail, 'email', 'your@email.com', true, <Mail className="h-4 w-4" />)}
                {renderFormField('Password', password, setPassword, 'password', '••••••••', true)}
                
                {mode === 'signup' && (
                  renderFormField('Confirm Password', confirmPassword, setConfirmPassword, 'password', '••••••••', true)
                )}

                <button
                  onClick={handleAuth}
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : mode === 'signup' ? (
                    <>
                      Sign Up <UserPlus className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Sign In <LogIn className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Email Confirmation Step */}
            {signupStep === 'email_sent' && mode === 'signup' && (
              <div className="space-y-6 text-center">
                <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-10 w-10 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Check your email!</h2>
                <p className="text-gray-400">
                  We've sent a confirmation link to<br />
                  <span className="text-indigo-400 font-medium">{pendingEmail}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Click the link in the email to verify your account, then come back here to complete your profile.
                </p>
                <div className="pt-4">
                  <button
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        // Check if user has confirmed their email
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session?.user?.email_confirmed_at) {
                          // Email is confirmed, proceed to profile
                          setSignupStep('profile');
                          showToast('success', 'Email verified! Please complete your profile.');
                        } else {
                          showToast('error', 'Please verify your email first. Check your inbox for the confirmation link.');
                        }
                      } catch (error) {
                        showToast('error', 'Error checking verification status');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        I've confirmed my email <CheckCircle className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  Didn't receive the email?
                  <button
                    onClick={async () => {
                      try {
                        await supabase.auth.resend({ type: 'signup', email: pendingEmail });
                        showToast('success', 'Email resent! Check your inbox.');
                      } catch (error) {
                        showToast('error', 'Failed to resend email');
                      }
                    }}
                    className="ml-2 text-indigo-400 hover:text-indigo-300"
                  >
                    Resend
                  </button>
                </div>
                <button
                  onClick={() => {
                    setSignupStep('credentials');
                    setMode('signin');
                  }}
                  className="text-sm text-gray-500 hover:text-gray-400"
                >
                  Already verified? Sign in
                </button>
              </div>
            )}

            {/* Step 2: Profile Details (Signup only) */}
            {mode === 'signup' && signupStep === 'profile' && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Almost done!</h2>
                  <p className="text-sm text-gray-400">Complete your profile to start trading</p>
                </div>

                <div className="p-4 rounded-xl bg-blue-900/20 border border-blue-700/30 mb-6">
                  <div className="flex items-center gap-2 text-blue-200 text-sm">
                    <Shield className="h-4 w-4" />
                    <span>Your data is encrypted and securely stored</span>
                  </div>
                </div>

                {/* Personal Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-indigo-400" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFormField('First Name', firstName, setFirstName, 'text', 'Enter your first name', true, <User className="h-4 w-4" />)}
                    {renderFormField('Last Name', lastName, setLastName, 'text', 'Enter your last name', true, <User className="h-4 w-4" />)}
                    {renderFormField('Phone', phone, setPhone, 'tel', '+1 234 567 8900', false, <Phone className="h-4 w-4" />)}
                    {renderFormField('Date of Birth', dateOfBirth, setDateOfBirth, 'date', '', true, <Calendar className="h-4 w-4" />)}
                    {renderFormField('Nationality', nationality, setNationality, 'text', 'e.g., American', false, <Flag className="h-4 w-4" />)}
                  </div>
                </div>

                {/* Location Info */}
                <div className="space-y-4 pt-4 border-t border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-indigo-400" />
                    Location
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFormField('Country', country, setCountry, 'select', '', true, <Globe className="h-4 w-4" />)}
                    {renderFormField('State/Province', state, setState, 'text', 'e.g., California', false, <Building className="h-4 w-4" />)}
                    {renderFormField('City', city, setCity, 'text', 'Enter city', true, <MapPin className="h-4 w-4" />)}
                    {renderFormField('Postal Code', postalCode, setPostalCode, 'text', 'e.g., 10001', true, <MapPin className="h-4 w-4" />)}
                  </div>
                  <div className="space-y-2">
                    {renderFormField('Address Line 1', addressLine1, setAddressLine1, 'text', 'Street address, P.O. box', true, <MapPin className="h-4 w-4" />)}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setSignupStep('credentials')}
                    className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCompleteSignup}
                    disabled={isLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Create Account <CheckCircle className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Sign in link */}
            {mode === 'signin' && (
              <p className="text-center text-sm text-gray-400 mt-6">
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Sign up
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
