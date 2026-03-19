'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, 
  Wallet, 
  Shield, 
  Bell, 
  CreditCard,
  ArrowLeft,
  Copy,
  Check,
  Key,
  Globe,
  ChevronRight,
  LogOut,
  Settings,
  Loader2,
  Save,
  Camera,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Flag,
  Building,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { showToast } from '@/components/Toast';
import { walletStorage } from '@/lib/secureWalletStorage';
import { profileApi, ProfileDetails, COUNTRIES } from '@/lib/profileApi';

export default function ProfilePage() {
  const [account, setAccount] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'personal' | 'location'>('profile');
  
  // Profile form state
  const [profile, setProfile] = useState<ProfileDetails>({});
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Form fields
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [country, setCountry] = useState('');
  const [nationality, setNationality] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    const savedAccount = walletStorage.getCurrentAccount();
    if (savedAccount) {
      setAccount(savedAccount);
      loadProfile(savedAccount);
    }
  }, []);

  const loadProfile = async (walletAddress: string) => {
    try {
      const profileData = await profileApi.getOrCreate(walletAddress);
      setProfile(profileData);
      
      // Populate form fields
      setUsername(profileData.username || '');
      setFirstName(profileData.first_name || '');
      setLastName(profileData.last_name || '');
      setEmail(profileData.email || '');
      setPhone(profileData.phone || '');
      setDateOfBirth(profileData.date_of_birth || '');
      setCountry(profileData.country || '');
      setNationality(profileData.nationality || '');
      setState(profileData.state || '');
      setCity(profileData.city || '');
      setAddressLine1(profileData.address_line1 || '');
      setAddressLine2(profileData.address_line2 || '');
      setPostalCode(profileData.postal_code || '');

      // Get completion percentage
      const percentage = await profileApi.getCompletionPercentage(walletAddress);
      setCompletionPercentage(percentage);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  // Theme is always dark

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      showToast('success', 'Address copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const saveProfile = async () => {
    if (!account) return;
    
    setIsLoading(true);
    try {
      const updates: ProfileDetails = {
        username,
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
        address_line2: addressLine2,
        postal_code: postalCode,
      };

      await profileApi.update(account, updates);
      
      const percentage = await profileApi.getCompletionPercentage(account);
      setCompletionPercentage(percentage);
      
      showToast('success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      showToast('error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async () => {
    if (confirm('Are you sure you want to sign out? This will disconnect your wallet.')) {
      if (account) {
        await walletStorage.deleteWallet(account);
      }
      walletStorage.clearSession();
      setAccount(null);
      window.location.href = '/auth';
    }
  };

  const renderFormField = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    type: 'text' | 'email' | 'tel' | 'date' | 'select' = 'text',
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
            disabled={!isEditing}
            className={`w-full bg-gray-800/50 border border-gray-700 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${icon ? 'pl-10' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">Select {label}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={!isEditing}
            className={`w-full bg-gray-800/50 border border-gray-700 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${icon ? 'pl-10' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        )}
      </div>
    </div>
  );

  if (!account) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 p-8 shadow-2xl border border-gray-700/50 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Wallet className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Connect Wallet First
              </h2>
              <p className="text-gray-400 mb-6">
                Please connect your wallet to view your profile
              </p>
              <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:scale-105 transition-transform">
                Go to Dashboard <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/" className="p-2.5 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 transition-colors mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Profile
          </h1>
        </div>

        {/* Profile Completion Banner */}
        {completionPercentage < 100 && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-900/20 border border-indigo-700/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-indigo-400" />
              <div>
                <p className="text-sm font-medium text-white">Complete your profile</p>
                <p className="text-xs text-gray-400">{completionPercentage}% complete - Fill in all fields to unlock P2P trading</p>
              </div>
            </div>
            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {completionPercentage === 100 && (
          <div className="mb-6 p-4 rounded-xl bg-green-900/20 border border-green-700/30 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-sm font-medium text-white">Profile Complete!</p>
              <p className="text-xs text-gray-400">You can now start trading on P2P</p>
            </div>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveSection('profile')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeSection === 'profile' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-800/50 text-gray-400 hover:text-white'
            }`}
          >
            <User className="h-4 w-4 inline-block mr-2" />
            Basic
          </button>
          <button
            onClick={() => setActiveSection('personal')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeSection === 'personal' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-800/50 text-gray-400 hover:text-white'
            }`}
          >
            <Shield className="h-4 w-4 inline-block mr-2" />
            Personal
          </button>
          <button
            onClick={() => setActiveSection('location')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeSection === 'location' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-800/50 text-gray-400 hover:text-white'
            }`}
          >
            <MapPin className="h-4 w-4 inline-block mr-2" />
            Location
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-gray-900 border border-gray-700/50 p-6">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-start justify-between relative">
                <div className="flex items-start gap-6">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <User className="h-12 w-12 text-white" />
                    </div>
                    <button className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors">
                      <Camera className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>

                  {/* Username Field */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username"
                        disabled={!isEditing}
                        className="text-2xl font-bold bg-transparent border-none outline-none text-white placeholder-gray-500 focus:ring-0 w-full disabled:opacity-50"
                      />
                    </div>
                    
                    <button
                      onClick={() => {
                        if (isEditing) {
                          saveProfile();
                        } else {
                          setIsEditing(true);
                        }
                      }}
                      disabled={isLoading}
                      className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      {isEditing ? (
                        <>
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save Changes
                        </>
                      ) : (
                        'Edit Profile'
                      )}
                    </button>

                    {/* Wallet Address */}
                    <div className="mt-4 p-3 rounded-xl bg-black/20 backdrop-blur-sm">
                      <p className="text-xs text-indigo-300 mb-1">Wallet Address</p>
                      <div className="flex items-center justify-between">
                        <code className="text-sm text-white font-mono">{account.slice(0, 16)}...{account.slice(-12)}</code>
                        <button onClick={copyAddress} className="p-2 rounded-lg hover:bg-white/10">
                          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-indigo-200" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Content */}
            <div className="rounded-2xl bg-gray-800/30 border border-gray-700/50 p-6">
              {/* Basic Profile Section */}
              {activeSection === 'profile' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                  <p className="text-sm text-gray-400 mb-4">This information is visible to other users on the platform.</p>
                </div>
              )}

              {/* Personal Information Section */}
              {activeSection === 'personal' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Personal Information</h3>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-indigo-400 hover:text-indigo-300"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFormField('First Name', firstName, setFirstName, 'text', 'Enter your first name', true, <User className="h-4 w-4" />)}
                    {renderFormField('Last Name', lastName, setLastName, 'text', 'Enter your last name', true, <User className="h-4 w-4" />)}
                    {renderFormField('Email', email, setEmail, 'email', 'your@email.com', true, <Mail className="h-4 w-4" />)}
                    {renderFormField('Phone', phone, setPhone, 'tel', '+1 234 567 8900', false, <Phone className="h-4 w-4" />)}
                    {renderFormField('Date of Birth', dateOfBirth, setDateOfBirth, 'date', '', true, <Calendar className="h-4 w-4" />)}
                    {renderFormField('Nationality', nationality, setNationality, 'text', 'e.g., American', false, <Flag className="h-4 w-4" />)}
                  </div>

                  <div className="p-4 rounded-xl bg-yellow-900/20 border border-yellow-700/30 mt-4">
                    <p className="text-xs text-yellow-200">
                      <strong>Note:</strong> Personal information is required for KYC verification and P2P trading. 
                      Your data is encrypted and securely stored.
                    </p>
                  </div>
                </div>
              )}

              {/* Location Section */}
              {activeSection === 'location' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Location</h3>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-indigo-400 hover:text-indigo-300"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFormField('Country', country, setCountry, 'select', '', true, <Globe className="h-4 w-4" />)}
                    {renderFormField('State/Province', state, setState, 'text', 'e.g., California', false, <Building className="h-4 w-4" />)}
                    {renderFormField('City', city, setCity, 'text', 'Enter city', true, <MapPin className="h-4 w-4" />)}
                    {renderFormField('Postal Code', postalCode, setPostalCode, 'text', 'e.g., 10001', true, <MapPin className="h-4 w-4" />)}
                  </div>

                  <div className="space-y-2">
                    {renderFormField('Address Line 1', addressLine1, setAddressLine1, 'text', 'Street address, P.O. box', true, <MapPin className="h-4 w-4" />)}
                    {renderFormField('Address Line 2', addressLine2, setAddressLine2, 'text', 'Apartment, suite, unit, building, floor, etc.', false, <MapPin className="h-4 w-4" />)}
                  </div>
                </div>
              )}

              {/* Save Button for Edit Mode */}
              {isEditing && activeSection !== 'profile' && (
                <div className="flex gap-3 mt-6 pt-6 border-t border-gray-700/50">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveProfile}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Account Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">KYC Level</span>
                  <span className="px-2 py-1 rounded-md bg-gray-700 text-xs text-white">
                    Level {profile.kyc_level || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Email</span>
                  {profile.email_verified ? (
                    <span className="flex items-center text-xs text-green-400">
                      <CheckCircle className="h-3 w-3 mr-1" /> Verified
                    </span>
                  ) : (
                    <span className="text-xs text-yellow-400">Unverified</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Profile</span>
                  <span className="text-xs text-white">{completionPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${completionPercentage === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="rounded-2xl bg-gray-800/30 border border-gray-700/50 overflow-hidden">
              {/* Security */}
              <div className="p-4 border-b border-gray-700/50">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Security
                </h3>
                <div className="space-y-2">
                  <Link href="/settings" className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-700/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Key className="h-5 w-5 text-indigo-400" />
                      <span className="text-white">Backup Phrase</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  </Link>
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-700/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-indigo-400" />
                      <span className="text-white">Two-Factor Authentication</span>
                    </div>
                    <button 
                      onClick={() => setTwoFactor(!twoFactor)}
                      className={`w-12 h-6 rounded-full transition-colors ${twoFactor ? 'bg-indigo-600' : 'bg-gray-600'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${twoFactor ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Account */}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" /> Account
                </h3>
                <div className="space-y-2">
                  <button 
                    onClick={disconnectWallet}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-500/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut className="h-5 w-5 text-red-400" />
                      <span className="text-red-400">Sign Out</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
