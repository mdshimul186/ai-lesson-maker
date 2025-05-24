import { create } from 'zustand';
import axios from 'axios';
import { useAccountStore } from './useAccountStore'; // Import accountStore

// Define user interface
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

// Define login credentials interface
export interface LoginCredentials {
  email: string;
  password: string;
}

// Define register data interface
export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

// Define authentication state
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  needsVerification: boolean;
  unverifiedEmail: string | null;
    // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  verifyEmail: (code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
  resetNeedsVerification: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_ROOT_URL;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('token'),
  needsVerification: false,
  unverifiedEmail: localStorage.getItem('unverifiedEmail'),
  
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      // FormData is required for OAuth2 password flow
      const formData = new FormData();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);

      const response = await axios.post(
        `${API_BASE_URL}/api/users/token`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Store token in localStorage
      localStorage.setItem('token', response.data.access_token);
      
      // Fetch user data
      const userResponse = await axios.get(`${API_BASE_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${response.data.access_token}`,
        },
      });
        set({
        token: response.data.access_token,
        user: userResponse.data,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      // Fetch user accounts after successful login
      setTimeout(() => {
        const accountStore = useAccountStore.getState();
        accountStore.fetchAccounts();
      }, 0);
    } catch (error: any) {
      // Handle specific error for unverified email
      if (error.response && error.response.data && error.response.data.detail === 'Email not verified') {
        localStorage.setItem('unverifiedEmail', credentials.email);
        set({
          isLoading: false,
          error: 'Email not verified',
          needsVerification: true,
          unverifiedEmail: credentials.email
        });
      } else {
        set({ 
          isLoading: false, 
          error: error.response?.data?.detail || 'Login failed',
          isAuthenticated: false 
        });
      }
    }
  },
  
  register: async (registerData) => {
    set({ isLoading: true, error: null });
    try {
      await axios.post(
        `${API_BASE_URL}/api/users/register`,
        registerData
      );
      set({ isLoading: false });
      // Registration successful, but user still needs to verify email
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      });
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null
    });
  },
    verifyEmail: async (code) => {
    set({ isLoading: true, error: null });
    try {
      await axios.post(
        `${API_BASE_URL}/api/users/verify-email`,
        { verification_code: code }
      );
      set({ 
        isLoading: false,
        needsVerification: false
      });
      localStorage.removeItem('unverifiedEmail');
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.detail || 'Email verification failed'
      });
    }
  },
  
  resendVerification: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await axios.post(
        `${API_BASE_URL}/api/users/resend-verification`,
        { email }
      );
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.detail || 'Failed to resend verification email'
      });
    }
  },
  
  fetchCurrentUser: async () => {
    const { token } = get();
    if (!token) return;
    
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });      set({ 
        isLoading: false,
        user: response.data,
        isAuthenticated: true
      });

      // Fetch user accounts after fetching current user using setTimeout to break the potential call chain
      setTimeout(() => {
        const accountStore = useAccountStore.getState();
        accountStore.fetchAccounts();
      }, 0);
    } catch (error: any) {
      // If token is invalid, clear it
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        set({
          isLoading: false,
          error: 'Session expired. Please login again.',
          isAuthenticated: false,
          token: null
        });
      } else {
        set({ 
          isLoading: false, 
          error: error.response?.data?.detail || 'Failed to fetch user data'
        });
      }
    }
  },
  
  clearError: () => set({ error: null }),
  
  resetNeedsVerification: () => set({ needsVerification: false })
}));
