import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('[FIREBASE] Initializing Firebase...');
console.log('[FIREBASE] Config check:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasAuthDomain: !!firebaseConfig.authDomain,
  hasProjectId: !!firebaseConfig.projectId,
  hasStorageBucket: !!firebaseConfig.storageBucket,
  hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
  hasAppId: !!firebaseConfig.appId,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId
});

// Check if any required config is missing
const missingConfig = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value || value.includes('your-'))
  .map(([key]) => key);

if (missingConfig.length > 0) {
  console.warn('[FIREBASE] ⚠️ Missing or placeholder config values:', missingConfig);
} else {
  console.log('[FIREBASE] ✓ All config values present');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log('[FIREBASE] Firebase app initialized');

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
console.log('[FIREBASE] Auth service initialized');
console.log('[FIREBASE] Auth instance created:', {
  app: auth.app ? 'Present' : 'Missing',
  name: auth.name
});

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
console.log('[FIREBASE] Google Auth Provider initialized');
console.log('[FIREBASE] Google Provider scopes:', googleProvider.getScopes());

export default app;

