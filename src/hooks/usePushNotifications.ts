import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// VAPID public key - must match the one in Supabase secrets
const VAPID_PUBLIC_KEY = 'BNzfTXk9KYCNqkuQS2EG2_y0K-xAB-sPE8YbKz1HkjqD6WvqMBjV5IK7z3yqwzr9kGN_XHMP7kLkJu0ycgVkpVU';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check existing subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !user) {
        setIsLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          // Verify it's in the database
          const { data } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint)
            .single();
          
          setIsSubscribed(!!data);
        } else {
          setIsSubscribed(false);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setIsSubscribed(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [isSupported, user]);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers are not supported');
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service worker registered:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      throw error;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to enable push notifications');
      return false;
    }

    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        toast.error('Notification permission denied');
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      await navigator.serviceWorker.ready;

      // Get application server key as Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      // Subscribe to push - need to create a new ArrayBuffer from Uint8Array
      const keyBuffer = new ArrayBuffer(applicationServerKey.length);
      const keyView = new Uint8Array(keyBuffer);
      keyView.set(applicationServerKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBuffer
      });

      console.log('Push subscription created:', subscription.endpoint);

      // Extract keys
      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');

      if (!p256dh || !auth) {
        throw new Error('Failed to get subscription keys');
      }

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: arrayBufferToBase64(p256dh),
          auth: arrayBufferToBase64(auth),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        console.error('Error saving subscription:', error);
        throw error;
      }

      setIsSubscribed(true);
      toast.success('Push notifications enabled');
      return true;

    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Failed to enable push notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported, registerServiceWorker]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast.success('Push notifications disabled');
      return true;

    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to disable push notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Send a test notification
  const sendTestNotification = useCallback(async () => {
    if (!user || !isSubscribed) {
      toast.error('Push notifications are not enabled');
      return false;
    }

    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          title: 'Test Notification',
          body: 'Push notifications are working correctly!',
          url: '/'
        }
      });

      if (error) throw error;
      
      toast.success('Test notification sent');
      return true;
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
      return false;
    }
  }, [user, isSubscribed]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    sendTestNotification
  };
};
