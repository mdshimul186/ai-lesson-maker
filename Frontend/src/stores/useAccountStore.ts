import { create } from 'zustand';
import { 
  accountService, 
  paymentService,
} from '../services';
import { IAccount, ICreditPackage, ITransaction, IPaymentExecutionResponse } from '../interfaces'; // Added IPaymentExecutionResponse

interface AccountState {
  accounts: IAccount[];
  currentAccount: IAccount | null;
  creditPackages: ICreditPackage[];
  transactions: ITransaction[];
  isLoading: boolean;
  error: string | null;
  paymentCompleted: boolean; // New state to track payment completion
  
  fetchAccounts: () => Promise<void>;
  setCurrentAccount: (accountId: string) => void;
  fetchAccountDetails: (accountId: string) => Promise<IAccount | null>;
  createTeamAccount: (name: string, description?: string) => Promise<IAccount | null>;
  updateAccountDetails: (accountId: string, name?: string, description?: string) => Promise<void>;
  
  fetchCreditPackages: () => Promise<void>;
  purchaseCredits: (packageId: string, accountId: string) => Promise<{redirectUrl?: string, error?: string}>;
  handlePaymentExecution: (paymentId: string, payerId: string) => Promise<{ success: boolean; status?: string; error?: string; paymentResponse?: IPaymentExecutionResponse }>;
  refreshAccountData: () => Promise<void>; // New function to refresh all account data
  fetchTransactions: (accountId?: string) => Promise<void>;
  resetPaymentStatus: () => void; // New action to reset payment status
  
  inviteTeamMember: (accountId: string, email: string, role?: string) => Promise<void>;
  removeTeamMember: (accountId: string, memberUserId: string) => Promise<void>;
  respondToInvitation: (invitationId: string, accept: boolean) => Promise<void>; // Added for completeness
  
  clearError: () => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  currentAccount: null,
  creditPackages: [],
  transactions: [],
  isLoading: false,
  error: null,
  paymentCompleted: false, // Initialize new state

    fetchAccounts: async () => {
    set({ isLoading: true, error: null });
    try {
      const accounts = await accountService.getUserAccounts();
      
      // Determine current account without triggering additional API calls
      const currentAccountId = localStorage.getItem('currentAccountId');
      const newCurrentAccount = currentAccountId 
        ? accounts.find(a => a.id === currentAccountId) 
        : get().currentAccount 
          ? accounts.find(a => a.id === get().currentAccount!.id)
          : accounts[0] || null;
      
      set({
        accounts,
        isLoading: false,
        currentAccount: newCurrentAccount,
      });
      
      // Store the selected account ID in localStorage if we have a new one
      if (newCurrentAccount && (!currentAccountId || currentAccountId !== newCurrentAccount.id)) {
        localStorage.setItem('currentAccountId', newCurrentAccount.id);
      }
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.detail || 'Failed to fetch accounts' 
      });
    }
  },
    setCurrentAccount: (accountId: string) => {
    const currentAccountId = get().currentAccount?.id;
    const account = get().accounts.find(a => a.id === accountId);
    if (account) {
      // Optimistically set, then fetch full details
      set({ currentAccount: { ...account } }); // Create a new object to trigger re-renders
      localStorage.setItem('currentAccountId', accountId);
      get().fetchAccountDetails(accountId);
    } else {
      get().fetchAccountDetails(accountId).then(fetchedAccount => {
        if (fetchedAccount) {
          set({ currentAccount: fetchedAccount });
          localStorage.setItem('currentAccountId', accountId);
          if (currentAccountId !== accountId) {
            window.location.reload();
          }
        } else {
          set({ currentAccount: null });
          localStorage.removeItem('currentAccountId');
        }
      });
    }
  },
  fetchAccountDetails: async (accountId: string): Promise<IAccount | null> => {
    // Check if we already have the full details for this account in our state
    const existingAccount = get().accounts.find(a => a.id === accountId);
    const hasFullDetails = existingAccount && existingAccount.members !== undefined;
    
    // If we already have full details and not in a loading state, return the existing account
    if (hasFullDetails && !get().isLoading) {
      return existingAccount;
    }
    
    // Prevent concurrent calls for the same account ID
    if (get().isLoading) {
      console.log("Already loading, skipping duplicate fetchAccountDetails call");
      return null;
    }
    
    set(state => ({ ...state, isLoading: true, error: null }));
    
    try {      const detailedAccount = await accountService.getAccount(accountId);
      set(state => ({
        ...state,
        accounts: state.accounts.map(acc => acc.id === accountId ? detailedAccount : acc),
        currentAccount: state.currentAccount?.id === accountId ? detailedAccount : state.currentAccount,
        isLoading: false,
      }));
      return detailedAccount;
    } catch (error: any) {
      set(state => ({ ...state, isLoading: false, error: error.response?.data?.detail || `Failed to fetch details for account ${accountId}` }));
      if (get().currentAccount?.id === accountId) {
        set({ currentAccount: null });
        localStorage.removeItem('currentAccountId');
      }
      return null;
    }
  },
  
  createTeamAccount: async (name: string, description?: string): Promise<IAccount | null> => {
    set({ isLoading: true, error: null });
    try {
      const newAccount = await accountService.createAccount({
        name,
        type: 'team',
        description
      });
      set(state => ({ 
        accounts: [...state.accounts, newAccount],
        currentAccount: newAccount,
        isLoading: false
      }));
      localStorage.setItem('currentAccountId', newAccount.id);
      return newAccount;
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.detail || 'Failed to create team account' 
      });
      return null;
    }
  },
  
  updateAccountDetails: async (accountId: string, name?: string, description?: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAccount = await accountService.updateAccount(accountId, { name, description });
      set(state => ({ 
        accounts: state.accounts.map(account => 
          account.id === accountId ? updatedAccount : account
        ),
        currentAccount: state.currentAccount?.id === accountId ? updatedAccount : state.currentAccount,
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.detail || 'Failed to update account' 
      });
      throw error;
    }
  },
  
  fetchCreditPackages: async () => {
    set({ isLoading: true, error: null });
    try {
      const packages = await paymentService.getCreditPackages();
      set({ creditPackages: packages, isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.detail || 'Failed to fetch credit packages' 
      });
    }
  },
  
  purchaseCredits: async (packageId: string, accountId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await paymentService.createPayment({
        package_id: packageId,
        account_id: accountId,
        provider: 'paypal'
      });
      set({ isLoading: false });
      if (response.redirect_url) {
        return { redirectUrl: response.redirect_url };
      }
      const errorMessage = response.error_message || 'Payment initiation failed, no redirect URL.';
      set({ error: errorMessage });
      return { error: errorMessage };
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to initiate payment';
      set({ isLoading: false, error: errorMsg });
      return { error: errorMsg };
    }
  },
  
  handlePaymentExecution: async (paymentId: string, payerId: string) => {
    if (get().paymentCompleted) { // Prevent re-execution if already completed
      return { success: true, status: 'completed', error: 'Payment already processed.' };
    }
    set({ isLoading: true, error: null, paymentCompleted: false });
    try {
      // Assuming paymentService.executePayment exists and takes these params in an object
      // Also assuming IPaymentExecutionResponse is the type returned by executePayment
      const response: IPaymentExecutionResponse = await paymentService.executePayment({ 
        payment_id: paymentId, 
        payer_id: payerId 
      }); 
      
      if (response.status === 'completed') {
        set({ isLoading: false, paymentCompleted: true }); // Set paymentCompleted to true
        // Fetch updated account details for the current account to reflect new credits
        const currentAccountId = get().currentAccount?.id;
        if (currentAccountId) {
          await get().fetchAccountDetails(currentAccountId); 
        }
        // Also, fetch updated transactions for the current account
        if (currentAccountId) {
          await get().fetchTransactions(currentAccountId);
        }
        return { success: true, status: response.status, paymentResponse: response };
      } else {
        const errorMessage = response.error_message || `Payment status: ${response.status}`;
        set({ isLoading: false, error: errorMessage, paymentCompleted: false });
        return { success: false, status: response.status, error: errorMessage, paymentResponse: response };
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to execute payment';
      set({ isLoading: false, error: errorMsg, paymentCompleted: false });
      return { success: false, error: errorMsg };
    }
  },

  fetchTransactions: async (accountId?: string) => {
    const targetAccountId = accountId || get().currentAccount?.id;
    if (!targetAccountId) {
      set({ transactions: [], error: "No account selected to fetch transactions for." });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const transactions = await paymentService.getTransactions(targetAccountId);
      set({ transactions, isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.detail || 'Failed to fetch transactions' 
      });
    }
  },

  inviteTeamMember: async (accountId: string, email: string, role?: string) => {
    set({ isLoading: true, error: null });
    try {
      await accountService.inviteMember(accountId, email, role); // Corrected parameters
      // After inviting, refresh the current account details to show the new member (pending)
      if (get().currentAccount?.id === accountId) {
        await get().fetchAccountDetails(accountId);
      }
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.detail || 'Failed to invite member' 
      });
      throw error;
    }
  },

  removeTeamMember: async (accountId: string, memberUserId: string) => {
    set({ isLoading: true, error: null });
    try {
      await accountService.removeMember(accountId, memberUserId);
      // After removing, refresh the current account details
      if (get().currentAccount?.id === accountId) {
        await get().fetchAccountDetails(accountId);
      }
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.detail || 'Failed to remove member' 
      });
      throw error;
    }
  },

  respondToInvitation: async (invitationId: string, accept: boolean) => {
    set({ isLoading: true, error: null });
    try {
      await accountService.respondToInvitation(invitationId, accept);
      // After responding, refresh all accounts as the user might have joined a new one
      // or an invitation status might have changed in one of their existing accounts.
      await get().fetchAccounts(); 
      // Optionally, if the current account was affected, refresh its details specifically
      // This depends on how invitation responses affect the current view.
      // For now, fetching all accounts is a safe bet.
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.response?.data?.detail || 'Failed to respond to invitation' 
      });
      throw error;
    }
  },

  resetPaymentStatus: () => {
    set({ paymentCompleted: false });
  },
  clearError: () => {
    set({ error: null });
  },

  refreshAccountData: async () => {
    // Get the current account ID
    const currentAccountId = get().currentAccount?.id;
    if (!currentAccountId) return;

    // Refresh all account data
    await get().fetchAccounts();
    
    // Ensure the current account is selected
    if (get().accounts.some(a => a.id === currentAccountId)) {
      await get().fetchAccountDetails(currentAccountId);
    }
  },
}));
