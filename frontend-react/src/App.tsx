// src/App.tsx
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
// Import the functions as normal "value" imports:
import { onAuthStateChanged, signOut } from "firebase/auth";
// Import only the User interface as a type:
import type { User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";

// Page and Component Imports
import AuthForms from "./components/AuthForms";
import DashboardPage from "./pages/DashboardPage";
import CalculatorPage from "./pages/CalculatorPage";
import PortfolioDetailPage from "./pages/PortfolioDetailPage"; // Ensure this import is here

import styles from "./App.module.css";

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

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setIsLoading(false);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (currentUser) {
            const q = query(
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
        // This is the "loading loop" you are seeing.
        return (
            <div style={{ color: "white", padding: "20px" }}>Loading...</div>
        );
    }

    return (
        <BrowserRouter>
            <div className={styles.app}>
                <header className={styles.header}>
                    <h1 className={styles.headerTitle}>
                        WolfOfJayCee Finanzas
                    </h1>
                    {currentUser && (
                        <div className={styles.authStatus}>
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
                            <Route
                                path="/portfolio/:portfolioId"
                                element={
                                    <PortfolioDetailPage
                                        currentUser={currentUser}
                                    />
                                }
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
