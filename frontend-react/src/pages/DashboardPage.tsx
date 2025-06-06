// src/pages/DashboardPage.tsx

import React from "react";
import type { User } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import AddPortfolioForm from "../components/AddPortfolioForm";
import styles from "./DashboardPage.module.css";

// Match the Portfolio interface from App.tsx
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
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            <h2 className={styles.pageTitle}>Dashboard</h2>

            {portfolios.length > 0 ? (
                <ul className={styles.portfolioList}>
                    {portfolios.map((p) => (
                        <li key={p.id} className={styles.portfolioItem}>
                            <button
                                className={styles.linkButton}
                                onClick={() => navigate(`/portfolio/${p.id}`)}
                            >
                                {p.name}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={styles.emptyText}>
                    No tienes portafolios. Crea uno nuevo debajo.
                </p>
            )}

            <div className={styles.formWrapper}>
                <AddPortfolioForm
                    currentUser={currentUser}
                    onPortfolioAdded={onPortfolioAdded}
                />
            </div>
        </div>
    );
};

export default DashboardPage;
