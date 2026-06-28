import { createClient } from '@supabase/supabase-js';
import { getEnv, isPlaceholder, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  status: 'success' | 'failure' | 'warning';
  createdAt: string;
}

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  resource?: string;
  status?: AuditLog['status'];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export async function logAuditEvent(params: {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: AuditLog['status'];
}): Promise<void> {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: params.userId,
      action: params.action,
      resource: params.resource,
      resource_id: params.resourceId || null,
      details: params.details || {},
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      status: params.status || 'success',
      created_at: new Date().toISOString(),
    });

  if (error) {
    logger.error('Failed to create audit log', error);
  }
}

export async function getAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLog[]> {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filter.limit || 50)
    .range(filter.offset || 0, (filter.limit || 50) - 1);

  if (filter.userId) {
    query = query.eq('user_id', filter.userId);
  }
  if (filter.action) {
    query = query.eq('action', filter.action);
  }
  if (filter.resource) {
    query = query.eq('resource', filter.resource);
  }
  if (filter.status) {
    query = query.eq('status', filter.status);
  }
  if (filter.startDate) {
    query = query.gte('created_at', filter.startDate);
  }
  if (filter.endDate) {
    query = query.lte('created_at', filter.endDate);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch audit logs', error);
    return [];
  }

  return (data || []).map((log) => ({
    id: log.id,
    userId: log.user_id,
    action: log.action,
    resource: log.resource,
    resourceId: log.resource_id,
    details: log.details,
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    status: log.status,
    createdAt: log.created_at,
  }));
}

export async function getAuditLogsByUser(userId: string, limit = 50): Promise<AuditLog[]> {
  return getAuditLogs({ userId, limit });
}

export async function getAuditLogsByAction(action: string, limit = 50): Promise<AuditLog[]> {
  return getAuditLogs({ action, limit });
}

export async function getAuditLogsByResource(resource: string, limit = 50): Promise<AuditLog[]> {
  return getAuditLogs({ resource, limit });
}

export async function getFailedAuditLogs(limit = 50): Promise<AuditLog[]> {
  return getAuditLogs({ status: 'failure', limit });
}

export async function getSecurityAuditLogs(limit = 50): Promise<AuditLog[]> {
  return getAuditLogs({
    action: 'security',
    limit,
  });
}
