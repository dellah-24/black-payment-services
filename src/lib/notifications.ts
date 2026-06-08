/**
 * Push Notification Service
 * Web Push API for transaction notifications
 */

import { logger } from '@/lib/logger';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
}

export interface NotificationPermission {
  status: 'granted' | 'denied' | 'default';
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isPushSupported()) {
    return { status: 'denied' };
  }
  return {
    status: Notification.permission as 'granted' | 'denied' | 'default',
  };
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isPushSupported()) {
    logger.warn('Push notifications not supported');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    logger.error('Error requesting notification permission', error as Error);
    return false;
  }
}

/**
 * Show a local notification
 */
export function showNotification(options: NotificationOptions): Notification | null {
  if (!isPushSupported()) {
    logger.warn('Push notifications not supported');
    return null;
  }

  if (getNotificationPermission().status !== 'granted') {
    logger.warn('Notification permission not granted');
    return null;
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/icons/notification-icon.png',
      badge: options.badge || '/icons/badge-icon.png',
      tag: options.tag,
      data: options.data,
      requireInteraction: options.requireInteraction,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch (error) {
    logger.error('Error showing notification', error as Error);
    return null;
  }
}

/**
 * Show transaction notification
 */
export function notifyTransaction(
  type: 'send' | 'receive' | 'swap',
  amount: string,
  status: 'pending' | 'confirmed' | 'failed'
): void {
  const titles = {
    send: 'USDT Sent',
    receive: 'USDT Received',
    swap: 'Swap Completed',
  };

  const bodies = {
    pending: `Your ${type === 'swap' ? 'swap' : 'transaction'} is being processed...`,
    confirmed: `Successfully ${type === 'send' ? 'sent' : type === 'receive' ? 'received' : 'swapped'} ${amount} USDT`,
    failed: `Transaction failed. Please try again.`,
  };

  showNotification({
    title: titles[type],
    body: bodies[status],
    tag: `tx-${type}-${Date.now()}`,
  });
}

/**
 * Show price alert notification
 */
export function notifyPriceAlert(
  token: string,
  currentPrice: number,
  targetPrice: number,
  direction: 'above' | 'below'
): void {
  showNotification({
    title: `${token} Price Alert`,
    body: `${token} is now $${currentPrice.toFixed(2)} - ${direction} your target of $${targetPrice.toFixed(2)}`,
    tag: `price-${token.toLowerCase()}`,
  });
}

/**
 * Subscribe to push notifications (requires service worker)
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: Buffer.from(
        // This would be your VAPID public key in production
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
      ),
    });
    
    return subscription;
  } catch (error) {
    logger.error('Error subscribing to push', error as Error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Error unsubscribing from push', error as Error);
    return false;
  }
}

/**
 * Helper: Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  if (!base64String) return new Uint8Array();
  
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

/**
 * Request browser notification permission and show welcome
 */
export async function initNotifications(): Promise<boolean> {
  const permission = getNotificationPermission();
  
  if (permission.status === 'granted') {
    return true;
  }
  
  if (permission.status === 'default') {
    const granted = await requestNotificationPermission();
    if (granted) {
      showNotification({
        title: 'Notifications Enabled',
        body: 'You will receive alerts for transactions and price updates.',
      });
    }
    return granted;
  }
  
  return false;
}
