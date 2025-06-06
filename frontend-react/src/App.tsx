// src/App.tsx
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom"; // IMPORT ROUTER COMPONENTS

import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import type { Query } from "firebase/firestore";
import { auth, db } from "./firebase";

// Page and Component Imports
import AuthForms from "./components/AuthForms";
import DashboardPage from "./pages/DashboardPage"; // IMPORT DASHBOARD
import CalculatorPage from "./pages/CalculatorPage"; // IMPORT CALCULATOR

import styles from "./App.module.css";

// Define the structure of a Portfolio object
interface Portfolio {
    id: string;
    name: string;
    description?: string;
    userId: string;
}

function App() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // This logic for auth and data fetching remains EXACTLY THE SAME
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setIsLoading(false);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (currentUser) {
            const q: Query = query(
                collection(db, "portfolios"),
                where("userId", "==", currentUser.uid)
            );
            const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
                const userPortfolios = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Portfolio[];
                setPortfolios(userPortfolios);
            });
            return () => unsubscribeFirestore();
        } else {
            setPortfolios([]);
        }
    }, [currentUser]);

    const handleLogout = () => {
        signOut(auth).catch((error) => console.error("Logout Error:", error));
    };

    const handlePortfolioAdded = () => {
        console.log("Portfolio added! UI will update automatically.");
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        // The BrowserRouter is the top-level router component
        <BrowserRouter>
            <div className={styles.app}>
                <header className={styles.header}>
                    <h1 className={styles.headerTitle}>
                        WolfOfJayCee Finanzas
                    </h1>
                    {currentUser && (
                        <div className={styles.authStatus}>
                            {/* ADD NAVIGATION LINKS */}
                            <nav>
                                <Link
                                    to="/"
                                    style={{
                                        marginRight: "15px",
                                        color: "white",
                                    }}
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    to="/calculator"
                                    style={{
                                        marginRight: "15px",
                                        color: "white",
                                    }}
                                >
                                    Calculadora
                                </Link>
                            </nav>
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
                        // THE ROUTER'S VIEWPORT
                        <Routes>
                            <Route
                                path="/"
                                element={
                                    <DashboardPage
                                        portfolios={portfolios}
                                        currentUser={currentUser}
                                        onPortfolioAdded={handlePortfolioAdded}
                                    />
                                }
                            />
                            <Route
                                path="/calculator"
                                element={<CalculatorPage />}
                            />
                        </Routes>
                    ) : (
                        <AuthForms />
                    )}
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
