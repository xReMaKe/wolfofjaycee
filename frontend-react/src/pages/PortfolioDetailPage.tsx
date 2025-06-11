// src/pages/PortfolioDetailPage.tsx

import React from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase";

// --- Component Imports ---
import PortfolioDetail from "../components/PortfolioDetail";
import AddPositionForm from "../components/AddPositionForm";
import AddTransactionForm from "../components/AddTransactionForm";

// --- Style Imports ---
import styles from "./PortfolioDetailPage.module.css";
import detailStyles from "../components/PortfolioDetail.module.css";

const PortfolioDetailPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { portfolioId } = useParams<{ portfolioId: string }>();

    const handleUpgrade = async () => {
        if (!currentUser) return;
        const createCheckout = httpsCallable(
            functions,
            "createCheckoutSession"
        );
        try {
            const result: any = await createCheckout();
            window.location.href = result.data.url;
        } catch (error) {
            console.error("Stripe Checkout Error:", error);
            alert("Error al iniciar el proceso de pago.");
        }
    };

    if (!currentUser) {
        return <p>Cargando...</p>;
    }

    return (
        <div className={styles.pageContainer}>
            <Link to="/dashboard" className={styles.backLink}>
                ← Volver al Dashboard
            </Link>

            <div className={detailStyles.container}>
                {portfolioId ? (
                    <>
                        {/* 1. The Data Table Component */}
                        <PortfolioDetail
                            portfolioId={portfolioId}
                            currentUser={currentUser}
                        />

                        {/* 2. The Form Section (inside the same container) */}
                        <div className={styles.formSection}>
                            {currentUser.subscriptionTier === "premium" ? (
                                // --- VISTA PREMIUM ---
                                <AddTransactionForm portfolioId={portfolioId} />
                            ) : (
                                // --- VISTA GRATIS ---
                                <>
                                    <h3 className={styles.formTitle}>
                                        Añadir Nueva Posición
                                    </h3>
                                    <AddPositionForm
                                        portfolioId={portfolioId}
                                        currentUser={currentUser}
                                        onPositionAdded={() => {}}
                                    />
                                    <div className={styles.upgradePrompt}>
                                        <h3>
                                            ¿Quieres un seguimiento más
                                            detallado?
                                        </h3>
                                        <p>
                                            Actualiza a Premium para registrar
                                            compras, ventas, dividendos y
                                            obtener un análisis de rendimiento
                                            real.
                                        </p>
                                        <button
                                            onClick={handleUpgrade}
                                            className={styles.upgradeButton}
                                        >
                                            Actualizar a Premium
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <p>Portafolio no especificado.</p>
                )}
            </div>
        </div>
    );
};

export default PortfolioDetailPage;
