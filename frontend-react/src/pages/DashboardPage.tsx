// src/pages/DashboardPage.tsx
import React from "react";
import PortfolioDetail from "../components/PortfolioDetail";
import AddPortfolioForm from "../components/AddPortfolioForm";
import styles from "../App.module.css"; // We can reuse some styles from App

// Define the structure of a Portfolio object
interface Portfolio {
    id: string;
    name: string;
    description?: string;
    userId: string;
}

interface DashboardPageProps {
    portfolios: Portfolio[];
    currentUser: any; // Using 'any' for simplicity, could be 'User' from firebase/auth
    onPortfolioAdded: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
    portfolios,
    currentUser,
    onPortfolioAdded,
}) => {
    return (
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
                                {portfolio.description || "Sin descripción"}
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
                onPortfolioAdded={onPortfolioAdded}
            />

            {portfolios.length > 0 && (
                <PortfolioDetail
                    portfolioId={portfolios[0].id}
                    currentUser={currentUser}
                />
            )}
        </div>
    );
};

export default DashboardPage;
