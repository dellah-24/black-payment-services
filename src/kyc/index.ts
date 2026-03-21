/**
 * KYC (Know Your Customer) Verification Module
 * Handles identity verification for P2P trading
 */

export type KYCLevel = 0 | 1 | 2 | 3;
export type KYCStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'expired';
export type DocumentType = 'passport' | 'national_id' | 'drivers_license' | 'residence_permit';

export interface KYCProfile {
  userId: string;
  level: KYCLevel;
  status: KYCStatus;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  country?: string;
  nationality?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  documents?: DocumentUpload[];
  verificationStartDate?: number;
  verificationEndDate?: number;
}

export interface DocumentUpload {
  id: string;
  type: DocumentType;
  frontUrl?: string;
  backUrl?: string;
  selfieUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: number;
}

export interface KYCLivenessCheck {
  id: string;
  imageUrl: string;
  isLive: boolean;
  checkAt: number;
}

/**
 * KYC Events
 */
export type KYCEventType = 
  | 'verification_started'
  | 'document_uploaded'
  | 'liveness_checked'
  | 'verification_approved'
  | 'verification_rejected'
  | 'verification_expired'
  | 'level_changed';

export interface KYCEvent {
  type: KYCEventType;
  data: unknown;
  timestamp: number;
}

/**
 * KYC Provider Interface
 * In production, integrate with providers like:
 * - SumSub
 * - Jumio
 * - Onfido
 * - Veriff
 */
export interface KYCProvider {
  initialize(config: unknown): void;
  startVerification(userId: string): Promise<string>; // Returns verification URL
  checkStatus(userId: string): Promise<KYCProfile>;
  uploadDocument(userId: string, document: { type: DocumentType; front: Blob; back?: Blob }): Promise<DocumentUpload>;
  performLivenessCheck(userId: string, image: Blob): Promise<KYCLivenessCheck>;
}

/**
 * Default KYC Implementation (Simulated)
 */
class DefaultKYCProvider implements KYCProvider {
  private profiles: Map<string, KYCProfile> = new Map();
  private documents: Map<string, DocumentUpload[]> = new Map();
  private eventListeners: ((event: KYCEvent) => void)[] = [];

  initialize(config: unknown): void {
    // Initialize KYC provider with config
    console.log('KYC Provider initialized', config);
  }

  async startVerification(userId: string): Promise<string> {
    const profile = this.getOrCreateProfile(userId);
    profile.status = 'pending';
    profile.verificationStartDate = Date.now();
    this.profiles.set(userId, profile);
    
    this.emit('verification_started', { userId });
    
    // In production, return actual verification URL
    return `https://kyc.blackpayments.app/verify/${userId}`;
  }

  async checkStatus(userId: string): Promise<KYCProfile> {
    return this.profiles.get(userId) || {
      userId,
      level: 0,
      status: 'none',
    };
  }

  async uploadDocument(
    userId: string, 
    document: { type: DocumentType; front: Blob; back?: Blob }
  ): Promise<DocumentUpload> {
    const docUpload: DocumentUpload = {
      id: crypto.randomUUID(),
      type: document.type,
      frontUrl: URL.createObjectURL(document.front),
      backUrl: document.back ? URL.createObjectURL(document.back) : undefined,
      status: 'pending',
      uploadedAt: Date.now(),
    };

    const docs = this.documents.get(userId) || [];
    docs.push(docUpload);
    this.documents.set(userId, docs);

    const profile = this.getOrCreateProfile(userId);
    profile.documents = docs;
    this.profiles.set(userId, profile);

    // Simulate document verification
    setTimeout(() => {
      docUpload.status = 'approved';
      this.emit('document_uploaded', { userId, document: docUpload });
      
      // Check if all required documents are approved
      this.checkVerificationCompletion(userId);
    }, 3000);

    return docUpload;
  }

  async performLivenessCheck(userId: string, image: Blob): Promise<KYCLivenessCheck> {
    // In production, this would call liveness detection API
    const livenessCheck: KYCLivenessCheck = {
      id: crypto.randomUUID(),
      imageUrl: URL.createObjectURL(image),
      isLive: true, // Simulated
      checkAt: Date.now(),
    };

    this.emit('liveness_checked', { userId, check: livenessCheck });

    if (livenessCheck.isLive) {
      this.checkVerificationCompletion(userId);
    }

    return livenessCheck;
  }

  private getOrCreateProfile(userId: string): KYCProfile {
    return this.profiles.get(userId) || {
      userId,
      level: 0,
      status: 'none',
    };
  }

  private async checkVerificationCompletion(userId: string): Promise<void> {
    const profile = this.profiles.get(userId);
    if (!profile || profile.status !== 'pending') return;

    const docs = this.documents.get(userId) || [];
    const allApproved = docs.length > 0 && docs.every(d => d.status === 'approved');

    if (allApproved) {
      profile.status = 'approved';
      profile.level = 3;
      profile.verificationEndDate = Date.now();
      this.profiles.set(userId, profile);
      this.emit('verification_approved', { userId, level: 3 });
    }
  }

  addEventListener(listener: (event: KYCEvent) => void): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: (event: KYCEvent) => void): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }

  private emit(type: KYCEventType, data: unknown): void {
    const event: KYCEvent = { type, data, timestamp: Date.now() };
    this.eventListeners.forEach(listener => listener(event));
  }
}

/**
 * KYC Manager
 */
export class KYCManager {
  private static instance: KYCManager;
  private provider: KYCProvider;
  private userId: string | null = null;
  private eventListeners: ((event: KYCEvent) => void)[] = [];

  private constructor() {
    this.provider = new DefaultKYCProvider();
  }

  static getInstance(): KYCManager {
    if (!KYCManager.instance) {
      KYCManager.instance = new KYCManager();
    }
    return KYCManager.instance;
  }

  /**
   * Configure KYC provider
   */
  configure(provider: KYCProvider): void {
    this.provider = provider;
  }

  /**
   * Set current user
   */
  setUser(userId: string): void {
    this.userId = userId;
  }

  /**
   * Get current user
   */
  getUser(): string | null {
    return this.userId;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: KYCEvent) => void): void {
    this.eventListeners.push(listener);
    // Note: External provider event listeners handled separately if needed
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: KYCEvent) => void): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }

  /**
   * Start verification flow
   */
  async startVerification(): Promise<string> {
    if (!this.userId) throw new Error('User not set');
    return this.provider.startVerification(this.userId);
  }

  /**
   * Get verification status
   */
  async getStatus(): Promise<KYCProfile> {
    if (!this.userId) throw new Error('User not set');
    return this.provider.checkStatus(this.userId);
  }

  /**
   * Upload ID document
   */
  async uploadDocument(
    type: DocumentType, 
    frontImage: Blob, 
    backImage?: Blob
  ): Promise<DocumentUpload> {
    if (!this.userId) throw new Error('User not set');
    return this.provider.uploadDocument(this.userId, { type, front: frontImage, back: backImage });
  }

  /**
   * Perform liveness check (selfie)
   */
  async performLivenessCheck(image: Blob): Promise<KYCLivenessCheck> {
    if (!this.userId) throw new Error('User not set');
    return this.provider.performLivenessCheck(this.userId, image);
  }

  /**
   * Update profile information
   */
  async updateProfile(updates: Partial<Pick<KYCProfile, 'firstName' | 'lastName' | 'dateOfBirth' | 'country' | 'nationality' | 'address'>>): Promise<void> {
    if (!this.userId) throw new Error('User not set');
    
    const profile = await this.provider.checkStatus(this.userId);
    const updatedProfile = { ...profile, ...updates };
    
    // In production, this would update the backend
    console.log('Profile updated', updatedProfile);
  }

  /**
   * Get KYC level requirements
   */
  static getLevelRequirements(): { level: KYCLevel; name: string; requirements: string[] }[] {
    return [
      {
        level: 0,
        name: 'Unverified',
        requirements: ['No verification required'],
      },
      {
        level: 1,
        name: 'Email Verified',
        requirements: ['Email verification'],
      },
      {
        level: 2,
        name: 'Phone Verified',
        requirements: ['Email verification', 'Phone number verification'],
      },
      {
        level: 3,
        name: 'Full KYC',
        requirements: [
          'Email verification',
          'Phone number verification', 
          'Government ID document',
          'Liveness check (selfie)',
          'Proof of address (optional)',
        ],
      },
    ];
  }

  /**
   * Get supported document types by country
   */
  static getDocumentTypesByCountry(country: string): DocumentType[] {
    // Common document types by country
    const documentMap: Record<string, DocumentType[]> = {
      US: ['passport', 'national_id', 'drivers_license'],
      GB: ['passport', 'national_id', 'drivers_license'],
      DE: ['passport', 'national_id', 'drivers_license'],
      FR: ['passport', 'national_id', 'drivers_license'],
      NG: ['passport', 'national_id'],
      KE: ['passport', 'national_id'],
      PH: ['passport', 'national_id', 'drivers_license'],
      IN: ['passport', 'national_id', 'drivers_license'],
      TR: ['passport', 'national_id', 'drivers_license'],
    };

    return documentMap[country] || ['passport', 'national_id', 'drivers_license'];
  }

  /**
   * Check if user can trade (based on KYC level)
   */
  static canTrade(profile: KYCProfile, tradeAmount: bigint): { allowed: boolean; reason?: string } {
    // Tier 1: Under $1000 - Email verified
    if (tradeAmount <= 1000n * 1000000n) { // $1000 in USDT (6 decimals)
      return { allowed: profile.level >= 1 };
    }

    // Tier 2: $1000 - $10000 - Phone verified
    if (tradeAmount <= 10000n * 1000000n) {
      if (profile.level < 2) {
        return { allowed: false, reason: 'Phone verification required for trades over $1,000' };
      }
      return { allowed: true };
    }

    // Tier 3: Over $10000 - Full KYC
    if (profile.level < 3) {
      return { allowed: false, reason: 'Full KYC required for trades over $10,000' };
    }

    return { allowed: true };
  }
}

export const kycManager = KYCManager.getInstance();
