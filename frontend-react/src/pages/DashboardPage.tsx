// src/pages/DashboardPage.tsx

import React, { useState, useEffect } from "react"; // <-- Added useState, useEffect
import { Link } from "react-router-dom";
import type { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore"; // <-- Added Firestore imports
import { db } from "../firebase"; // <-- Added db import

import AddPortfolioForm from "../components/AddPortfolioForm";
import PortfolioSummaryCard from "../components/PortfolioSummaryCard"; // <-- Import new component
import styles from "./DashboardPage.module.css";

// Your interfaces are perfect, no change needed
interface Portfolio {
    id: string;
    name: string;
    description?: string;
    userId: string;
}

interface DashboardPageProps {
    portfolios: Portfolio[];
    currentUser: User;
    onPortfolioAdded: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
    portfolios,
    currentUser,
    onPortfolioAdded,
}) => {
    // --- NEW LOGIC ---
    // State to hold the summary data fetched from Firestore
    const [totalValue, setTotalValue] = useState<number>(0);
    const [history, setHistory] = useState([]);
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);

    // useEffect to listen for real-time updates to the user's summary
    useEffect(() => {
        if (!currentUser) return;

        const summaryDocRef = doc(db, "user_summaries", currentUser.uid);
        const unsubscribe = onSnapshot(summaryDocRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();

                setTotalValue(doc.data().totalValue || 0);
                setHistory(data.history || []);
            }
            setIsLoadingSummary(false);
        });

        return () => unsubscribe();
    }, [currentUser]);
    // --- END OF NEW LOGIC ---

    return (
        <div>
            {/* Using your existing .pageTitle class */}
            <h1 className={styles.pageTitle}>Dashboard</h1>

            {/* Render our new Summary Card at the top */}
            <PortfolioSummaryCard
                totalValue={totalValue}
                history={history}
                isLoading={isLoadingSummary}
            />

            {/* Section for Listing Portfolios (using your existing code) */}
            <div className={styles.section}>
                {/* Using your existing .portfolioName for the section title */}
                <h2 className={styles.portfolioName}>Mis Portafolios</h2>
                {portfolios.length > 0 ? (
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

            {/* Section for the Add Portfolio Form (using your existing code) */}
            <div className={styles.section}>
                {/* I'm adding a title here for consistency */}
                <h2 className={styles.portfolioName}>
                    Añadir Nuevo Portafolio
                </h2>
                <AddPortfolioForm
                    currentUser={currentUser}
                    onPortfolioAdded={onPortfolioAdded}
                />
            </div>
        </div>
    );
};

export default DashboardPage;
