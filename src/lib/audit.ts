import { supabase } from './supabaseClient';
import { logger } from './logger';

interface AuditLogPayload {
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  user_id?: string;
}

/**
 * Centralized audit logging (non-sensitive) to Supabase
 */
export async function logEvent(eventType: string, metadata: Record<string, unknown> = {}) {
  try {
    // strip any potentially sensitive fields
    const sanitized = { ...metadata };
    delete (sanitized as any).privateKey;
    delete (sanitized as any).mnemonic;
    delete (sanitized as any).keystore;

    const payload: AuditLogPayload = {
      event_type: eventType,
      metadata: sanitized,
      created_at: new Date().toISOString()
    };
    // attach user id if available
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) payload.user_id = session.user.id;

    // Fire and forget; don't block critical flows but log failures
    const { error } = await supabase.from('audit_logs').insert([payload]);
    if (error) logger.warn('Audit log failed', { error });
  } catch (e) {
    logger.warn('Audit logging error', e as Error);
  }
}
