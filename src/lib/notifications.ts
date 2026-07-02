import { createClient } from '@supabase/supabase-js';
import { getEnv, isPlaceholder, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface Notification {
  id: string;
  userId: string;
  type: 'payment' | 'withdrawal' | 'deposit' | 'system' | 'security' | 'promotion';
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  paymentNotifications: boolean;
  securityNotifications: boolean;
  marketingNotifications: boolean;
}

export async function getNotifications(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is required');
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error('Failed to fetch notifications', error);
    return [];
  }

  return (data || []).map((notification) => ({
    id: notification.id,
    userId: notification.user_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    read: notification.read,
    createdAt: notification.created_at,
    readAt: notification.read_at,
  }));
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is required');
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    logger.error('Failed to count unread notifications', error);
    return 0;
  }

  return count || 0;
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is required');
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    logger.error('Failed to mark notification as read', error);
    throw new Error('Failed to mark notification as read');
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is required');
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    logger.error('Failed to mark all notifications as read', error);
    throw new Error('Failed to mark all notifications as read');
  }
}

export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is required');
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    logger.error('Failed to delete notification', error);
    throw new Error('Failed to delete notification');
  }
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is required');
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    userId: data.user_id,
    email: data.email,
    push: data.push,
    sms: data.sms,
    inApp: data.in_app,
    paymentNotifications: data.payment_notifications,
    securityNotifications: data.security_notifications,
    marketingNotifications: data.marketing_notifications,
  };
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is required');
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      email: preferences.email,
      push: preferences.push,
      sms: preferences.sms,
      in_app: preferences.inApp,
      payment_notifications: preferences.paymentNotifications,
      security_notifications: preferences.securityNotifications,
      marketing_notifications: preferences.marketingNotifications,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to update notification preferences', error);
    throw new Error('Failed to update notification preferences');
  }

  return {
    userId: data.user_id,
    email: data.email,
    push: data.push,
    sms: data.sms,
    inApp: data.in_app,
    paymentNotifications: data.payment_notifications,
    securityNotifications: data.security_notifications,
    marketingNotifications: data.marketing_notifications,
  };
}
