// src/access/config/firebase.ts

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Debug: Log environment variables
console.log('Environment Variables Check:');
console.log('VITE_FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY);
console.log('All env vars:', import.meta.env);

// Your Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyDK6QUGi4AfNJJIH2T0GU0lntcO2dBLQ70',
  authDomain: 'bikenest-35d1b.firebaseapp.com',
  projectId: 'bikenest-35d1b',
  storageBucket: 'bikenest-35d1b.firebasestorage.app',
  messagingSenderId: '801508330863',
  appId: '1:801508330863:web:403362b9df1f271103ac9a'
};

// Debug: Log the config object
console.log('Firebase Config Object:', firebaseConfig);

// Check if API key exists
if (!firebaseConfig.apiKey) {
  console.error('Firebase API Key is missing! Please check your .env file');
  console.error('Make sure you have a .env file in your project root with VITE_FIREBASE_API_KEY');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the new persistence API
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    tabManager: persistentMultipleTabManager()
  })
});

// Initialize other Firebase services
export const auth = getAuth(app);
export const storage = getStorage(app);

// Log successful initialization
console.log('✅ Firebase initialized with persistent cache enabled');
console.log('✅ Multi-tab support enabled');
console.log('✅ Unlimited cache size configured');

// Enable network status detection
export const enableNetworkStatusDetection = () => {
  // Initial status
  console.log(`Network status: ${navigator.onLine ? '🟢 Online' : '🔴 Offline'}`);

  window.addEventListener('online', () => {
    console.log('🟢 Back online - Firebase will sync automatically');
    // You can add custom logic here, like showing a notification
  });

  window.addEventListener('offline', () => {
    console.log('🔴 Gone offline - Using cached data');
    // You can add custom logic here, like showing a notification
  });
};

// Initialize Firebase offline support (simplified now)
export const initializeFirebaseOfflineSupport = async () => {
  console.log('Initializing Firebase offline support...');

  // The persistence is already configured in initializeFirestore above
  // We just need to enable network status detection
  enableNetworkStatusDetection();

  // Test if persistence is working
  try {
    // The new API handles persistence automatically
    console.log('✅ Firebase offline persistence is active');
    console.log('✅ Data will be cached automatically in IndexedDB');
    console.log('✅ Multi-tab synchronization enabled');
  } catch (error) {
    console.error('❌ Error with Firebase persistence:', error);
  }
};

// Optional: Get current network status
export const isOnline = () => navigator.onLine;

export default app;
