// Configuration variables for the frontend application

// API base URL from environment variable
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_ROOT_URL || 'http://localhost:8000';

// Other configuration constants can be added here
export const DEFAULT_LANGUAGE = 'English';
export const DEFAULT_VOICE_RATE = 1.0;
export const DEFAULT_ANIMATION_TYPE = 'typing';
export const DEFAULT_THEME = 'light';
