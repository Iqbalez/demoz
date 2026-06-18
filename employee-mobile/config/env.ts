const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!rawApiUrl || rawApiUrl.trim() === '') {
  if (__DEV__) {
    console.warn('⚠️ EXPO_PUBLIC_API_URL is not set. Using fallback http://localhost:3001 for local development. Use http://10.0.2.2:3001 for Android emulator.');
  }
}

export const env = {
  EXPO_PUBLIC_API_URL: rawApiUrl || 'http://localhost:3001',
};
