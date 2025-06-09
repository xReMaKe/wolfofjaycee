// src/App.tsx
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import MarketingPage from "./pages/MarketingPage";
import { useState, useEffect } from "react";
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
import WatchlistPage from "./pages/WatchlistPage";
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
                                {/* --- ADD NEW WATCHLIST LINK --- */}
                                <Link
                                    to="/watchlist"
                                    style={{
                                        marginRight: "15px",
                                        color: "white",
                                    }}
                                >
                                    Watchlist
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
                    <Routes>
                        {currentUser ? (
                            // --- LOGGED-IN USER ROUTES ---
                            <>
                                {/* The main dashboard for logged-in users */}
                                <Route
                                    path="/dashboard"
                                    element={
                                        <DashboardPage
                                            portfolios={portfolios}
                                            currentUser={currentUser}
                                            onPortfolioAdded={
                                                handlePortfolioAdded
                                            }
                                        />
                                    }
                                />
                                <Route
                                    path="/watchlist"
                                    element={
                                        <WatchlistPage
                                            currentUser={currentUser}
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

                                {/* Any other logged-in routes go here */}

                                {/* If a logged-in user tries to go to the root, send them to their dashboard */}
                                <Route
                                    path="*"
                                    element={<Navigate to="/dashboard" />}
                                />
                            </>
                        ) : (
                            // --- LOGGED-OUT USER ROUTES ---
                            <>
                                {/* The root URL shows our new marketing page */}
                                <Route path="/" element={<MarketingPage />} />

                                {/* We can keep AuthForms on a specific route like /login */}
                                <Route path="/login" element={<AuthForms />} />

                                {/* If a logged-out user tries any other URL, send them to the marketing page */}
                                <Route path="*" element={<Navigate to="/" />} />
                                {/* --- ADD NEW WATCHLIST ROUTE --- */}
                            </>
                        )}
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
