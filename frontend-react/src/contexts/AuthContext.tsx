import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react"; // <-- We import the type separately
import { onAuthStateChanged } from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth"; // <-- Import the type separately
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase"; // Using your path alias

// This will be the shape of our custom user object
export interface AppUser extends FirebaseUser {
    subscriptionTier?: "free" | "premium";
}

interface AuthContextType {
    currentUser: AppUser | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    currentUser: null,
    loading: true,
});

export const useAuth = () => {
    return useContext(AuthContext);
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen for Firebase Auth state changes (login/logout)
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is logged in. Now, let's listen for changes to their summary doc.
                const userSummaryRef = doc(db, "user_summaries", user.uid);

                const unsubscribeFirestore = onSnapshot(
                    userSummaryRef,
                    (docSnap) => {
                        if (docSnap.exists()) {
                            const summaryData = docSnap.data();
                            // Combine Firebase Auth user with our Firestore data
                            const appUser: AppUser = {
                                ...user,
                                subscriptionTier:
                                    summaryData.subscriptionTier || "free",
                            };
                            setCurrentUser(appUser);
                        } else {
                            // Summary doc might not exist yet, treat as free user
                            const appUser: AppUser = {
                                ...user,
                                subscriptionTier: "free",
                            };
                            setCurrentUser(appUser);
                        }
                        setLoading(false);
                    },
                    (error) => {
                        console.error("Error fetching user summary:", error);
                        // Still provide the basic user object even if Firestore fails
                        setCurrentUser(user);
                        setLoading(false);
                    }
                );

                // Return the firestore listener so it gets cleaned up on logout
                return () => unsubscribeFirestore();
            } else {
                // User is logged out
                setCurrentUser(null);
                setLoading(false);
            }
        });

        // Cleanup the auth listener on component unmount
        return () => unsubscribeAuth();
    }, []);

    const value = {
        currentUser,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};
