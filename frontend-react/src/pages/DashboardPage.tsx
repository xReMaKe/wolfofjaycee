// src/pages/DashboardPage.tsx

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "@/contexts/AuthContext"; // <-- Import the hook
// Add this line with your other component imports, around line 9
import PerformanceChart from "../components/charts/PerformanceChart";
import AddPortfolioForm from "../components/AddPortfolioForm";
import PortfolioSummaryCard from "../components/PortfolioSummaryCard";
import styles from "./DashboardPage.module.css";
import PremiumSummaryCard from "../components/PremiumSummaryCard";
// Interface for Portfolio remains the same
interface Portfolio {
    id: string;
    name: string;
    description?: string;
    userId: string;
}

// No more DashboardPageProps! The component is self-sufficient.

const DashboardPage: React.FC = () => {
    // Get the current user from our Auth context
    const { currentUser } = useAuth();

    // All state is now managed inside the component
    const [totalValue, setTotalValue] = useState<number>(0);
    const [history, setHistory] = useState([]);
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]); // <-- State for portfolios
    const [isLoadingPortfolios, setIsLoadingPortfolios] = useState(true); // <-- Loading state for portfolios

    // Effect for user summary data (your existing logic, just depends on the new currentUser)
    useEffect(() => {
        if (!currentUser) return;
        setIsLoadingSummary(true);
        const summaryDocRef = doc(db, "user_summaries", currentUser.uid);
        const unsubscribe = onSnapshot(summaryDocRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setTotalValue(data.totalValue || 0);
                setHistory(data.history || []);
            }
            setIsLoadingSummary(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    // NEW Effect to fetch the list of portfolios (moved from App.tsx)
    useEffect(() => {
        if (!currentUser) return;
        setIsLoadingPortfolios(true);
        const q = query(
            collection(db, "portfolios"),
            where("userId", "==", currentUser.uid)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userPortfolios = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Portfolio[];
            setPortfolios(userPortfolios);
            setIsLoadingPortfolios(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    if (!currentUser) {
        // This will only show for a split second
        return <div>Loading...</div>;
    }

    // The onPortfolioAdded prop is no longer needed since the onSnapshot listener
    // will automatically update the UI when a new portfolio is added.

    return (
        <div>
            <h1 className={styles.pageTitle}>Dashboard</h1>

            {currentUser.subscriptionTier === "premium" ? (
                // Premium User View: The new, combined card
                <PremiumSummaryCard
                    totalValue={totalValue}
                    history={history}
                    isLoading={isLoadingSummary}
                />
            ) : (
                // Free User View: The original summary card
                <PortfolioSummaryCard
                    totalValue={totalValue}
                    history={history}
                    isLoading={isLoadingSummary}
                />
            )}

            <div className={styles.section}>
                <h2 className={styles.portfolioName}>Mis Portafolios</h2>
                {isLoadingPortfolios ? (
                    <p>Cargando portafolios...</p>
                ) : portfolios.length > 0 ? (
                    <ul className={styles.portfolioList}>
                        {portfolios.map((portfolio) => (
                            <li
                                key={portfolio.id}
                                className={styles.portfolioItem}
                            >
                                <Link to={`/portfolio/${portfolio.id}`}>
                                    <div className={styles.portfolioName}>
                                        {portfolio.name}
                                    </div>
                                    <p className={styles.portfolioDesc}>
                                        {portfolio.description ||
                                            "Sin descripción"}
                                    </p>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className={styles.emptyState}>
                        <p>No tienes portafolios creados todavía.</p>
                    </div>
                )}
            </div>

            <div className={styles.section}>
                <h2 className={styles.portfolioName}>
                    Añadir Nuevo Portafolio
                </h2>
                {/* AddPortfolioForm now only needs the currentUser */}
                <AddPortfolioForm
                    currentUser={currentUser}
                    onPortfolioAdded={() => {}}
                />
            </div>
        </div>
    );
};

export default DashboardPage;
