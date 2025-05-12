import axios from 'axios';

interface RequestConfig {
    url: string;
    method: string;
    data?: object;
    headers?: object;
    params?: object;
}

let baseUrl = 'http://localhost:8000';

export function request<T>(config: RequestConfig): Promise<T> {
    return new Promise((resolve, reject) => {
        axios.request({
            ...config,
            baseURL: baseUrl
        }).then((response) => {
            resolve(response.data);
        }).catch((error) => {
            reject(error);
        });
    });

}