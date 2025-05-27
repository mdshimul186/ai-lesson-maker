import axios from 'axios';
import { useAccountStore } from '../stores/useAccountStore'; // Import useAccountStore
import { IAccount } from '../interfaces'; // Import IAccount type

interface RequestConfig {
    url: string;
    method: string;
    data?: object;
    headers?: object;
    params?: object;
}

const baseUrl = import.meta.env.VITE_API_ROOT_URL;

export function request<T>(config: RequestConfig): Promise<T> {
    return new Promise(async (resolve, reject) => {
        // Function to wait for currentAccount to be set
        const waitForAccount = (): Promise<IAccount> => {
            const currentState = useAccountStore.getState();
            if (currentState.currentAccount) {
                return Promise.resolve(currentState.currentAccount);
            }

            return new Promise((resolve) => {
                const unsubscribe = useAccountStore.subscribe(
                    (state) => {
                        if (state.currentAccount) {
                            unsubscribe(); // Stop observing once account is found
                            resolve(state.currentAccount);
                        }
                    }
                );
            });
        };

        try {
            const currentAccount = await waitForAccount(); // Wait until account is set

            const token = localStorage.getItem('token'); // Get token from localStorage
            const headers: Record<string, string> = {
                ...config.headers as Record<string, string>,
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            if (currentAccount && currentAccount.id) { // Add account_id to headers if currentAccount exists
                headers['X-Account-ID'] = currentAccount.id;
            }

            axios.request({
                ...config,
                baseURL: baseUrl,
                headers: headers, // Add headers to the request
            }).then((response) => {
                resolve(response.data);
            }).catch((error) => {
                reject(error);
            });
        } catch (error) {
            reject(error);
        }
    });
}