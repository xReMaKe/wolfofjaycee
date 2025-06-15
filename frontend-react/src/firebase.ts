// src/firebase.ts
import { initializeApp } from "firebase/app";
import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
} from "firebase/auth";
// --- MODIFIED FIRESTORE IMPORTS ---
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Your firebaseConfig and debug logs remain the same
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

// --- NEW FIRESTORE INITIALIZATION WITH LONG POLLING ---
// This replaces the old `const db = getFirestore(app);`
// It initializes Firestore with special settings for iOS compatibility.
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache(),
});

// Initialize Functions (this part is correct and remains unchanged)
export const functions = getFunctions(
    app,
    import.meta.env.DEV
        ? "https://us-central1-financeproject-72a60.cloudfunctions.net" // dev: hit cloud URL
        : window.location.origin // prod: stay on your domain
);

// Export all the services for use in your app
export { app, auth, db };
