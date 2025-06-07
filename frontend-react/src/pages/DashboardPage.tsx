// src/pages/DashboardPage.tsx
import React from "react";
import { Link } from "react-router-dom"; // Import Link for navigation
import AddPortfolioForm from "../components/AddPortfolioForm";
import styles from "./DashboardPage.module.css";
import type { User } from "firebase/auth";

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
    return (
        <div>
            <h1 className={styles.pageTitle}>Dashboard</h1>

            {/* Section for Listing Portfolios */}
            <div className={styles.section}>
                <h2 className={styles.portfolioName}>Mis Portafolios</h2>
                {portfolios.length > 0 ? (
                    <ul className={styles.portfolioList}>
                        {portfolios.map((portfolio) => (
                            <li
                                key={portfolio.id}
                                className={styles.portfolioItem}
                            >
                                {/* This makes each portfolio a clickable link */}
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

            {/* Section for the Add Portfolio Form */}
            <div className={styles.section}>
                <AddPortfolioForm
                    currentUser={currentUser}
                    onPortfolioAdded={onPortfolioAdded}
                />
            </div>
        </div>
    );
};

export default DashboardPage;
