import axios from 'axios';
import { useAccountStore } from '../stores/useAccountStore'; // Import useAccountStore

interface RequestConfig {
    url: string;
    method: string;
    data?: object;
    headers?: object;
    params?: object;
}

const baseUrl = import.meta.env.VITE_API_ROOT_URL;

export function request<T>(config: RequestConfig): Promise<T> {
    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('token'); // Get token from localStorage
        const currentAccount = useAccountStore.getState().currentAccount; // Get current account
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
    });

}