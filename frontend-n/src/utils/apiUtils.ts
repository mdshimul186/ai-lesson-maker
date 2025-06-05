/**
 * Utility functions for API request throttling and debouncing
 */

// Cache for storing previous responses
type CacheEntry = {
  data: any;
  timestamp: number;
};

// A basic cache for API responses
const apiCache: Record<string, CacheEntry> = {};

// Default cache expiry time in ms (3 seconds)
const DEFAULT_CACHE_TIME = 3000;

/**
 * Returns a cached response if available and not expired, 
 * otherwise executes and caches the API call
 * 
 * @param cacheKey A unique key for the request
 * @param apiFn The API function to call if cache is not available
 * @param cacheDuration How long to cache the response in ms
 * @returns The API response (either from cache or fresh)
 */
export async function cachedApiCall<T>(
  cacheKey: string, 
  apiFn: () => Promise<T>, 
  cacheDuration = DEFAULT_CACHE_TIME
): Promise<T> {
  const now = Date.now();
  const cachedResponse = apiCache[cacheKey];
  
  if (cachedResponse && (now - cachedResponse.timestamp) < cacheDuration) {
    console.log(`Using cached response for ${cacheKey}`);
    return cachedResponse.data as T;
  }
  
  // Execute the API call
  const response = await apiFn();
  
  // Cache the response
  apiCache[cacheKey] = {
    data: response,
    timestamp: now
  };
  
  return response;
}

// Track ongoing requests to prevent duplicate calls
const ongoingRequests: Record<string, Promise<any>> = {};

/**
 * Ensures only one API call for a given key is in flight at any time
 * If multiple components try to make the same request simultaneously,
 * they'll all receive the result from a single network request
 * 
 * @param requestKey A unique key for the request
 * @param apiFn The API function to call
 * @returns The API response
 */
export async function dedupedApiCall<T>(requestKey: string, apiFn: () => Promise<T>): Promise<T> {
  // If this request is already in progress, return the existing promise
  if (Object.prototype.hasOwnProperty.call(ongoingRequests, requestKey)) {
    console.log(`Request in progress, reusing existing call for ${requestKey}`);
    return ongoingRequests[requestKey] as Promise<T>;
  }
  
  // Store the promise for this request
  const requestPromise = apiFn();
  ongoingRequests[requestKey] = requestPromise;
  
  try {
    // Wait for the request to complete
    const result = await requestPromise;
    // Clear the ongoing request entry
    delete ongoingRequests[requestKey];
    return result;
  } catch (error) {
    // Clear the ongoing request entry even if there's an error
    delete ongoingRequests[requestKey];
    throw error;
  }
}

// Track timestamps of the most recent call for each throttled function
const lastCallTimestamps: Record<string, number> = {};

/**
 * Throttles an API call to only execute once within the specified interval
 * 
 * @param throttleKey A unique key for the throttled function
 * @param apiFn The API function to call
 * @param interval Minimum time between calls in ms (default: 2000ms)
 * @returns The API response or null if throttled
 */
export async function throttledApiCall<T>(
  throttleKey: string, 
  apiFn: () => Promise<T>, 
  interval = 2000
): Promise<T | null> {
  const now = Date.now();
  const lastCallTime = lastCallTimestamps[throttleKey] || 0;
  
  // If not enough time has passed since the last call, throttle this call
  if (now - lastCallTime < interval) {
    console.log(`Throttled API call for ${throttleKey}`);
    return null;
  }
  
  // Update the timestamp for this key
  lastCallTimestamps[throttleKey] = now;
  
  // Execute and return the API call
  return apiFn();
}

/**
 * Clears all cached API responses
 */
export function clearApiCache(): void {
  Object.keys(apiCache).forEach(key => {
    delete apiCache[key];
  });
  console.log('API cache cleared');
}

/**
 * Clears cached API responses that match a pattern
 * @param pattern String or regex pattern to match cache keys
 */
export function clearApiCachePattern(pattern: string | RegExp): void {
  const keys = Object.keys(apiCache);
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  
  keys.forEach(key => {
    if (regex.test(key)) {
      delete apiCache[key];
      console.log(`Cleared cache for key: ${key}`);
    }
  });
}
