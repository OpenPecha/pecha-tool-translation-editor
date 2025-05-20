import { useContext } from 'react';
import { AuthContext } from '@/auth/auth-context-provider';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const getAuthToken = async (): Promise<string> => {
  try {
    // Try to get the auth context from the window object
    // This is a workaround for non-component contexts
    const authContext = (window as any).__AUTH_CONTEXT__;
    if (authContext && typeof authContext.getToken === 'function') {
      const token = await authContext.getToken();
      if (token) return token;
    }
    
    // Fallback to localStorage if available
    const token = localStorage.getItem('auth_token');
    if (token) return token;
    
    throw new Error('No authentication token available');
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw error;
  }
};
