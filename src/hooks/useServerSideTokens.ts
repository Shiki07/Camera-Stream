import { useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type TokenType = 'homeassistant' | 'cloud_storage' | 'duckdns';

export function useServerSideTokens() {
  const { user } = useAuth();
  const loadingRef = useRef<Set<string>>(new Set());

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const saveToken = useCallback(async <T extends object>(
    tokenType: TokenType,
    data: T
  ): Promise<boolean> => {
    if (!user) {
      console.warn('Cannot save token: user not authenticated');
      return false;
    }

    const key = `save_${tokenType}`;
    if (loadingRef.current.has(key)) {
      return false;
    }

    try {
      loadingRef.current.add(key);
      const authToken = await getAuthToken();
      
      if (!authToken) {
        console.warn('No auth token available');
        return false;
      }

      const response = await fetch(
        'https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/save-user-token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            action: 'save',
            token_type: tokenType,
            data,
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('Failed to save token:', result.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving token:', error);
      return false;
    } finally {
      loadingRef.current.delete(key);
    }
  }, [user, getAuthToken]);

  const loadToken = useCallback(async <T>(
    tokenType: TokenType
  ): Promise<T | null> => {
    if (!user) {
      console.warn('Cannot load token: user not authenticated');
      return null;
    }

    const key = `load_${tokenType}`;
    if (loadingRef.current.has(key)) {
      return null;
    }

    try {
      loadingRef.current.add(key);
      const authToken = await getAuthToken();
      
      if (!authToken) {
        console.warn('No auth token available');
        return null;
      }

      const response = await fetch(
        'https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/save-user-token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            action: 'load',
            token_type: tokenType,
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('Failed to load token:', result.error);
        return null;
      }

      return result.data as T;
    } catch (error) {
      console.error('Error loading token:', error);
      return null;
    } finally {
      loadingRef.current.delete(key);
    }
  }, [user, getAuthToken]);

  const deleteToken = useCallback(async (tokenType: TokenType): Promise<boolean> => {
    if (!user) {
      console.warn('Cannot delete token: user not authenticated');
      return false;
    }

    const key = `delete_${tokenType}`;
    if (loadingRef.current.has(key)) {
      return false;
    }

    try {
      loadingRef.current.add(key);
      const authToken = await getAuthToken();
      
      if (!authToken) {
        console.warn('No auth token available');
        return false;
      }

      const response = await fetch(
        'https://pqxslnhcickmlkjlxndo.supabase.co/functions/v1/save-user-token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            action: 'delete',
            token_type: tokenType,
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('Failed to delete token:', result.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting token:', error);
      return false;
    } finally {
      loadingRef.current.delete(key);
    }
  }, [user, getAuthToken]);

  return {
    saveToken,
    loadToken,
    deleteToken,
    isAuthenticated: !!user,
  };
}
