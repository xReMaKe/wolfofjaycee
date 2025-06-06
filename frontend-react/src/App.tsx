// frontend-react/src/App.tsx
import { useState, useEffect } from "react";

// CORRECTED FIREBASE IMPORTS: Separating functions and types
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import type { Query } from "firebase/firestore";
import { auth, db } from "./firebase";

// Import components
import AuthForms from "./components/AuthForms";
import PortfolioDetail from "./components/PortfolioDetail";
import AddPortfolioForm from "./components/AddPortfolioForm";

// Import our CSS module
import styles from "./App.module.css";

// Define the structure of a Portfolio object
interface Portfolio {
    id: string;
    name: string;
    description?: string;
    // IMPORTANT: Make sure this matches your Firestore document fields
    userId: string;
}

function App() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [isLoading, setIsLoading] = useState(true); // To show a loading state

    // Effect for handling user authentication state changes
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setIsLoading(false);
        });
        // Cleanup function to unsubscribe when the component unmounts
        return () => unsubscribeAuth();
    }, []);

    // Effect for fetching portfolios in real-time when the user is logged in
    useEffect(() => {
        // Only run if there is a current user
        if (currentUser) {
            // IMPORTANT: Using "userId" to match your original code.
            // Verify this is the correct field name in your Firestore 'portfolios' collection.
            const q: Query = query(
                collection(db, "portfolios"),
                where("userId", "==", currentUser.uid)
            );

            // onSnapshot creates a real-time listener
            const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
                const userPortfolios = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Portfolio[];
                setPortfolios(userPortfolios);
            });

            // Cleanup function to unsubscribe from Firestore listener
            return () => unsubscribeFirestore();
        } else {
            // If there is no user, ensure the portfolios list is empty
            setPortfolios([]);
        }
    }, [currentUser]); // This effect re-runs only when currentUser changes

    const handleLogout = () => {
        signOut(auth).catch((error) => console.error("Logout Error:", error));
    };

    const handlePortfolioAdded = () => {
        // This function is passed to the form.
        // With real-time updates from onSnapshot, we no longer need to manually trigger a refresh.
        console.log("Portfolio added! UI will update automatically.");
    };

    // Show a loading message while we check for a logged-in user
    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className={styles.app}>
            <header className={styles.header}>
                <h1 className={styles.headerTitle}>WolfOfJayCee Finanzas</h1>
                {currentUser && (
                    <div className={styles.authStatus}>
                        <span className={styles.welcomeMessage}>
                            Bienvenido, {currentUser.email}
                        </span>
                        <button
                            onClick={handleLogout}
                            className={styles.logoutButton}
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                )}
            </header>

            <main className={styles.mainContent}>
                {currentUser ? (
                    <div>
                        <h2 className={styles.sectionTitle}>Mis Portafolios</h2>
                        {portfolios.length > 0 ? (
                            <ul className={styles.portfolioList}>
                                {portfolios.map((portfolio) => (
                                    <li
                                        key={portfolio.id}
                                        className={styles.portfolioListItem}
                                    >
                                        <div className={styles.portfolioName}>
                                            {portfolio.name}
                                        </div>
                                        <p className={styles.portfolioDesc}>
                                            {portfolio.description ||
                                                "Sin descripción"}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className={styles.emptyState}>
                                <p>No tienes portafolios creados todavía.</p>
                            </div>
                        )}

                        <AddPortfolioForm
                            currentUser={currentUser}
                            onPortfolioAdded={handlePortfolioAdded}
                        />

                        {portfolios.length > 0 && (
                            <PortfolioDetail
                                portfolioId={portfolios[0].id}
                                currentUser={currentUser}
                            />
                        )}
                    </div>
                ) : (
                    <AuthForms />
                )}
            </main>
        </div>
    );
}

export default App;
