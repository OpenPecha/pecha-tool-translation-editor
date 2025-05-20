
// Authentication utilities

type CustomHeaders = Record<string, string>;

// This is a synchronous function that returns the token from localStorage
// It's used as a fallback when we can't use the Auth0 hooks (outside of React components)
const getBaseHeaders = (): CustomHeaders => {
  // Try different token names that might be used in the application
  const token = localStorage.getItem("auth_token") ?? 
               localStorage.getItem("access_token") ?? 
               sessionStorage.getItem("auth_token") ?? 
               sessionStorage.getItem("access_token") ?? 
               '';
  
  return {
    Authorization: `Bearer ${token}`,
  };
};

// This is an async function that gets the token from Auth0
// It should be used when possible, but requires being in a React component context
export const getAuthToken = async (): Promise<string> => {
  try {
    // If we're in a browser environment with localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      // Check if we have a cached token
      const cachedToken = localStorage.getItem('auth_token');
      if (cachedToken) {
        return cachedToken;
      }
    }
    
    // If no cached token, we need to be in a component context to get it from Auth0
    throw new Error('No authentication token available. Make sure you are logged in.');
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw error;
  }
};

export const getHeaders = (): CustomHeaders => ({
  ...getBaseHeaders(),
  'Content-Type': 'application/json',
});

export const getHeadersMultipart = (): CustomHeaders => getBaseHeaders();
