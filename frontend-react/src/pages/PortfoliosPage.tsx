// frontend-react/src/pages/PortfoliosPage.tsx
import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { User } from "firebase/auth";
import AddPortfolioForm from "../components/AddPortfolioForm";
import styles from "./PortfoliosPage.module.css"; // create this CSS module

interface PortfoliosPageProps {
    currentUser: User;
    onSelectPortfolio: (id: string) => void;
}

interface Portfolio {
    id: string;
    name: string;
    description?: string;
}

const PortfoliosPage: React.FC<PortfoliosPageProps> = ({
    currentUser,
    onSelectPortfolio,
}) => {
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const fetchPortfolios = async () => {
            setLoading(true);
            setError(null);
            try {
                const q = query(
                    collection(db, "portfolios"),
                    where("userId", "==", currentUser.uid)
                );
                const snap = await getDocs(q);
                const list: Portfolio[] = snap.docs.map((doc) => ({
                    id: doc.id,
                    ...(doc.data() as Omit<Portfolio, "id">),
                }));
                setPortfolios(list);
            } catch (e: any) {
                console.error("Error fetching portfolios:", e);
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPortfolios();
    }, [currentUser, refreshTrigger]);

    const handlePortfolioAdded = () => {
        // Trigger a re-fetch so the new portfolio appears immediately
        setRefreshTrigger((prev) => prev + 1);
    };

    if (loading)
        return <p className={styles.loadingText}>Cargando portafolios…</p>;
    if (error) return <p className={styles.errorText}>{error}</p>;

    return (
        <div className={styles.container}>
            <h2 className={styles.pageTitle}>Mis Portafolios</h2>

            <ul className={styles.portfolioList}>
                {portfolios.map((p) => (
                    <li key={p.id} className={styles.portfolioItem}>
                        <button
                            className={styles.linkButton}
                            onClick={() => onSelectPortfolio(p.id)}
                        >
                            {p.name}
                        </button>
                    </li>
                ))}
            </ul>

            {/** Aquí aparece el formulario “Añadir Nuevo Portafolio” **/}
            <AddPortfolioForm
                currentUser={currentUser}
                onPortfolioAdded={handlePortfolioAdded}
            />
        </div>
    );
};

export default PortfoliosPage;
