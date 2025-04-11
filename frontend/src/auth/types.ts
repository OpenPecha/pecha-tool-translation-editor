export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}



export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  currentUser: User | null;
  login: (retry:boolean) => void;
  logout: () => void;
  getToken: () => Promise<string | null>;
  error: string | null;
}
