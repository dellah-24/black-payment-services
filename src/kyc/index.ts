import { createClient } from '@supabase/supabase-js';
import { getEnv, isPlaceholder, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface KYCDocument {
  id: string;
  userId: string;
  type: 'passport' | 'drivers_license' | 'national_id' | 'proof_of_address';
  status: 'pending' | 'approved' | 'rejected';
  documentUrl: string;
  uploadedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export interface KYCVerification {
  id: string;
  userId: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  level: 'basic' | 'enhanced' | 'premium';
  documents: KYCDocument[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export async function submitKYCDocument(params: {
  userId: string;
  type: KYCDocument['type'];
  documentUrl: string;
}): Promise<KYCDocument> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured');
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('kyc_documents')
    .insert({
      user_id: params.userId,
      type: params.type,
      document_url: params.documentUrl,
      status: 'pending',
      uploaded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to submit KYC document', error);
    throw new Error('Failed to submit KYC document');
  }

  return {
    id: data.id,
    userId: data.user_id,
    type: data.type,
    status: data.status,
    documentUrl: data.document_url,
    uploadedAt: data.uploaded_at,
    reviewedAt: data.reviewed_at,
    rejectionReason: data.rejection_reason,
  };
}

export async function getKYCVerification(userId: string): Promise<KYCVerification | null> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: verification, error: verificationError } = await supabase
    .from('kyc_verifications')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (verificationError || !verification) {
    return null;
  }

  const { data: documents, error: documentsError } = await supabase
    .from('kyc_documents')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });

  if (documentsError) {
    logger.error('Failed to fetch KYC documents', documentsError);
  }

  return {
    id: verification.id,
    userId: verification.user_id,
    status: verification.status,
    level: verification.level,
    documents: (documents || []).map((doc) => ({
      id: doc.id,
      userId: doc.user_id,
      type: doc.type,
      status: doc.status,
      documentUrl: doc.document_url,
      uploadedAt: doc.uploaded_at,
      reviewedAt: doc.reviewed_at,
      rejectionReason: doc.rejection_reason,
    })),
    createdAt: verification.created_at,
    updatedAt: verification.updated_at,
    completedAt: verification.completed_at,
  };
}

export async function getKYCDocuments(userId: string): Promise<KYCDocument[]> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseKey) {
    return [];
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('kyc_documents')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch KYC documents', error);
    return [];
  }

  return (data || []).map((doc) => ({
    id: doc.id,
    userId: doc.user_id,
    type: doc.type,
    status: doc.status,
    documentUrl: doc.document_url,
    uploadedAt: doc.uploaded_at,
    reviewedAt: doc.reviewed_at,
    rejectionReason: doc.rejection_reason,
  }));
}

export async function deleteKYCDocument(documentId: string, userId: string): Promise<void> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured');
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('kyc_documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (error) {
    logger.error('Failed to delete KYC document', error);
    throw new Error('Failed to delete KYC document');
  }
}

export async function submitKYC(userId: string, params: {
  fullName: string;
  dateOfBirth: string;
  address: string;
  documentType: string;
  documentNumber: string;
}): Promise<void> {
  // This is a placeholder that would typically:
  // 1. Create a KYC verification record
  // 2. Upload documents to storage
  // 3. Trigger verification process
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured');
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('kyc_verifications')
    .upsert({
      user_id: userId,
      status: 'in_progress',
      level: 'basic',
      updated_at: new Date().toISOString(),
    });

  if (error) {
    logger.error('Failed to submit KYC', error);
    throw new Error('Failed to submit KYC');
  }
}

// Export all functions as a service object for convenience
export const kycService = {
  submitKYC,
  submitKYCDocument,
  getKYCVerification,
  getKYCDocuments,
  deleteKYCDocument,
};
