// src/App.tsx

// --- React and Router Imports ---
import {
    BrowserRouter,
    Routes,
    Route,
    NavLink,
    Navigate,
} from "react-router-dom";

// --- Firebase Imports ---
import { signOut } from "firebase/auth";
import { auth, functions } from "./firebase";

// --- Our Auth Context ---
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// --- Page and Component Imports ---
import MarketingPage from "./pages/MarketingPage";
import AuthForms from "./components/AuthForms";
import DashboardPage from "./pages/DashboardPage";
import CalculatorPage from "./pages/CalculatorPage";
import PortfolioDetailPage from "./pages/PortfolioDetailPage";
import WatchlistPage from "./pages/WatchlistPage";
import styles from "./App.module.css";
import { httpsCallable } from "firebase/functions";
import { useState } from "react"; // Ensure useState is imported from react

// No more Portfolio interface needed here.

// ==================================================================
// This is the clean "core" of your App.
// It has NO state of its own. It only handles layout and routing.
// ==================================================================
function AppCore() {
    const { currentUser, loading } = useAuth();
    const [isRedirecting, setIsRedirecting] = useState(false); // State for redirection visual feedback

    const handleLogout = () => {
        signOut(auth).catch((error) => console.error("Logout Error:", error));
    };

    // IN: src/App.tsx

    const handleUpgrade = async () => {
        if (!currentUser) {
            console.error("User not logged in, cannot upgrade.");
            return;
        }
        setIsRedirecting(true);

        // Get a reference to BOTH functions
        const migrateData = httpsCallable(
            functions,
            "migratePositionsToTransactions"
        );
        const createCheckout = httpsCallable(
            functions,
            "createCheckoutSession"
        );

        try {
            // --- STEP 1: Call the new migration function FIRST ---
            console.log("Attempting to migrate legacy positions...");
            await migrateData();
            console.log("Migration successful, proceeding to checkout.");

            // --- STEP 2: If migration succeeds, proceed to Stripe ---
            const result: any = await createCheckout();
            const { url } = result.data;
            window.location.href = url; // Redirect to Stripe
        } catch (error) {
            console.error("The upgrade process failed:", error);
            alert(
                "Hubo un error al preparar tu cuenta para la actualización. Por favor, intente de nuevo."
            );
            setIsRedirecting(false); // Make sure to stop loading on error
        }
        // No finally block needed, as successful redirect means the component unmounts
    };

    if (loading) {
        return (
            <div className={styles.loadingScreen}>
                <img
                    src="/jc1.png"
                    alt="Loading..."
                    className={styles.loadingLogo}
                />
            </div>
        );
    }

    return (
        <div className={styles.app}>
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.headerLeft}>
                        {/* ... logo and nav links ... */}
                        <NavLink
                            to={currentUser ? "/dashboard" : "/"}
                            className={styles.logoLink}
                        >
                            <img
                                src="/jc1.png"
                                alt="WolfOfJayCee Finanzas Logo"
                                className={styles.logo}
                            />
                        </NavLink>
                        {currentUser && (
                            <nav className={styles.nav}>
                                <NavLink to="/dashboard">Dashboard</NavLink>
                                <NavLink to="/watchlist">Watchlist</NavLink>
                                <NavLink to="/calculator">Calculadora</NavLink>
                            </nav>
                        )}
                    </div>
                    {currentUser && (
                        <div className={styles.headerRight}>
                            <span className={styles.welcomeMessage}>
                                Bienvenido, {currentUser.email}
                            </span>

                            {currentUser.subscriptionTier === "premium" ? (
                                <span className={styles.premiumBadge}>
                                    Premium
                                </span>
                            ) : (
                                <button
                                    onClick={handleUpgrade}
                                    className={styles.upgradeButton}
                                    disabled={isRedirecting}
                                >
                                    {isRedirecting
                                        ? "Redirigiendo..."
                                        : "Actualizar a Premium"}
                                </button>
                            )}

                            <button
                                onClick={handleLogout}
                                className={styles.logoutButton}
                            >
                                Cerrar Sesión
                            </button>
                        </div>
                    )}
                </div>
            </header>
            <main className={styles.mainContent}>
                {/* ... your <Routes> component ... */}
                <Routes>
                    {currentUser ? (
                        // --- LOGGED-IN USER ROUTES ---
                        <>
                            <Route
                                path="/dashboard"
                                element={<DashboardPage />}
                            />
                            <Route
                                path="/watchlist"
                                element={<WatchlistPage />}
                            />
                            <Route
                                path="/calculator"
                                element={<CalculatorPage />}
                            />
                            <Route
                                path="/portfolio/:portfolioId"
                                element={<PortfolioDetailPage />}
                            />
                            <Route
                                path="*"
                                element={<Navigate to="/dashboard" />}
                            />
                        </>
                    ) : (
                        // --- LOGGED-OUT USER ROUTES ---
                        <>
                            <Route path="/" element={<MarketingPage />} />
                            <Route path="/login" element={<AuthForms />} />
                            <Route path="*" element={<Navigate to="/" />} />
                        </>
                    )}
                </Routes>
            </main>
        </div>
    );
}

// ==================================================================
// The top-level component remains the same.
// ==================================================================
function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppCore />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
