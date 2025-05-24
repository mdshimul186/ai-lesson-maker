import axios from 'axios';
import { IAccount, ICreditPackage, ITransaction, AccountType as GlobalAccountType } from '../interfaces'; // Import global interfaces

// Use GlobalAccountType if needed, or remove local AccountType enum if it's redundant
export enum AccountType {
  PERSONAL = 'personal',
  TEAM = 'team'
}

// Create account data - remains the same if IAccount is used for response only
export interface CreateAccountData {
  name: string;
  type: GlobalAccountType; // Use imported AccountType
  description?: string;
}

// Update account data - remains the same
export interface UpdateAccountData {
  name?: string;
  description?: string;
}

// Invite member data - account_id will be part of URL
export interface InviteMemberData {
  email: string;
  role?: string;
}

// Payment creation data - remains the same
export interface CreatePaymentData {
  package_id: string;
  account_id: string;
  provider: string;
  return_url?: string;
  cancel_url?: string;
}

// Payment verification data - remains the same
export interface PaymentVerifyData {
  payment_id: string;
  payer_id?: string;
  token?: string;
}

// Payment response - remains the same
export interface PaymentResponse {
  payment_id: string;
  status: string;
  redirect_url?: string;
  error_message?: string;
}

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_ROOT_URL;

// Account service
export const accountService = {  // Get all accounts for the current user
  getUserAccounts: async (): Promise<IAccount[]> => {
    const token = localStorage.getItem('token') || '';
    const response = await axios.get(`${API_BASE_URL}/accounts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  // Get a specific account by ID
  getAccount: async (accountId: string): Promise<IAccount> => {
    const token = localStorage.getItem('token') || '';
    const response = await axios.get(`${API_BASE_URL}/accounts/${accountId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  // Create a new account
  createAccount: async (accountData: CreateAccountData): Promise<IAccount> => {
    const token = localStorage.getItem('token') || '';
    const response = await axios.post(`${API_BASE_URL}/accounts`, accountData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  // Update an account
  updateAccount: async (accountId: string, updateData: UpdateAccountData): Promise<IAccount> => {
    const token = localStorage.getItem('token') || '';
    const response = await axios.put(`${API_BASE_URL}/accounts/${accountId}`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  // Invite a member to a team account
  inviteMember: async (accountId: string, email: string, role?: string): Promise<any> => {
    const token = localStorage.getItem('token') || '';
    const inviteData: InviteMemberData = { email, role };
    const response = await axios.post(`${API_BASE_URL}/accounts/${accountId}/members/invite`, inviteData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  // Accept or reject an invitation
  respondToInvitation: async (invitationId: string, accept: boolean): Promise<any> => {
    const token = localStorage.getItem('token') || '';
    const response = await axios.post(
      `${API_BASE_URL}/accounts/invitations/respond?accept=${accept}`,
      { invitation_id: invitationId }, // Send invitation_id in the body
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },
  // Remove a member from an account
  removeMember: async (accountId: string, memberUserId: string): Promise<any> => {
    const token = localStorage.getItem('token') || '';
    const response = await axios.delete(`${API_BASE_URL}/accounts/${accountId}/members/${memberUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

// Payment service
export const paymentService = {  // Get available credit packages
  getCreditPackages: async (): Promise<ICreditPackage[]> => {
    const token = localStorage.getItem('token') || '';
    const response = await axios.get(`${API_BASE_URL}/payments/packages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  // Create a payment
  createPayment: async (paymentData: CreatePaymentData): Promise<PaymentResponse> => {
    const token = localStorage.getItem('token') || '';
    const response = await axios.post(`${API_BASE_URL}/payments/create`, paymentData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;  },
  
  // Execute a payment after approval
  executePayment: async (verifyData: PaymentVerifyData): Promise<PaymentResponse> => {
    const token = localStorage.getItem('token') || '';
    
    try {
      const response = await axios.post(`${API_BASE_URL}/payments/execute`, verifyData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Payment execution error:', error);
      throw error;
    }
  },
  // Verify payment status directly with backend
  verifyPaymentStatus: async (paymentId: string): Promise<PaymentResponse> => {
    const token = localStorage.getItem('token') || '';
    try {
      const response = await axios.get(`${API_BASE_URL}/payments/verify/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to verify payment status:', error);
      throw error;
    }
  },
  
  // Mark a payment as successful in the database when we get PAYMENT_ALREADY_DONE
  markPaymentCompleted: async (paymentId: string, payerId: string, errorData: any): Promise<any> => {
    const token = localStorage.getItem('token') || '';
    try {
      const response = await axios.post(
        `${API_BASE_URL}/payments/mark-as-completed`,
        { 
          payment_id: paymentId,
          payer_id: payerId,
          paypal_error: errorData 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to mark payment as completed:', error);
      throw error;
    }
  },
  // Get transaction history
  getTransactions: async (accountId?: string): Promise<ITransaction[]> => {
    const token = localStorage.getItem('token') || '';
    let url = `${API_BASE_URL}/payments/transactions`;
    if (accountId) {
      url += `?account_id=${accountId}`;
    }
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
