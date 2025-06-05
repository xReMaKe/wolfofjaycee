// frontend-react/src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// (I'll use the values you provided in your last message as a placeholder)
const firebaseConfig = {
    apiKey: "AIzaSyB5fNj7X2HS4lhTiuJu7bMTBFgAcGId8kk",
    authDomain: "financeproject-72a60.firebaseapp.com",
    projectId: "financeproject-72a60",
    storageBucket: "financeproject-72a60.firebasestorage.app",
    messagingSenderId: "343107005697",
    appId: "1:343107005697:web:033b270c241b47936d7f00",
    measurementId: "G-DSK1HE582S", // Keep this if using Analytics
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// THIS LINE IS CRUCIAL:
export { app, auth, db }; // Make sure 'auth' is included in this export statement
// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
