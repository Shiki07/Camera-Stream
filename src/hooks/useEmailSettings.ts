
import { useEffect } from 'react';

export const useEmailSettings = (
  notificationEmail: string,
  setNotificationEmail: (email: string) => void
) => {
  // Load saved email from localStorage on component mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('cameraNotificationEmail');
      if (savedEmail) {
        setNotificationEmail(savedEmail);
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
  }, [setNotificationEmail]);
};
