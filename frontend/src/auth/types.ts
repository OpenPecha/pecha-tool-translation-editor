export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export enum AuthProvider {
  GOOGLE = 'google',
  AUTH0 = 'auth0'
}

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  currentUser: User | null;
  login: (provider?: AuthProvider) => void;
  logout: () => void;
  getToken: () => Promise<string | null>;
}
