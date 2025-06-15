// frontend-react/src/pages/SettingsPage.tsx

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./SettingsPage.module.css";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase"; // Import our shared functions instance

const SettingsPage = () => {
    const { currentUser } = useAuth();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const handleManageBilling = async () => {
        setIsRedirecting(true);
        console.log("Requesting Stripe billing portal URL...");

        try {
            const createPortalSession = httpsCallable(
                functions,
                "createPortalSession"
            );
            const result: any = await createPortalSession();

            const { url } = result.data;
            if (url) {
                // Redirect the user to the Stripe Customer Portal
                window.location.href = url;
            } else {
                throw new Error("Portal URL not received from server.");
            }
        } catch (error) {
            console.error("Could not open billing portal:", error);
            // You can add a user-facing error message here if you like
            alert("Could not open the billing portal. Please try again later.");
            setIsRedirecting(false);
        }
    };

    if (!currentUser) {
        return <div>Loading user data...</div>;
    }

    return (
        <div className={styles.pageContainer}>
            <h1 className={styles.title}>Configuración de la Cuenta</h1>

            <div className={styles.infoCard}>
                <div className={styles.infoRow}>
                    <span className={styles.label}>Email</span>
                    <span className={styles.value}>{currentUser.email}</span>
                </div>

                <div className={styles.infoRow}>
                    <span className={styles.label}>Plan de Suscripción</span>
                    <span className={styles.value}>
                        {currentUser.subscriptionTier === "premium"
                            ? "Premium"
                            : "Gratis"}
                    </span>
                </div>
            </div>

            <div className={styles.actionsCard}>
                <h2 className={styles.cardTitle}>Administrar Suscripción</h2>

                {currentUser.subscriptionTier === "premium" ? (
                    <>
                        <p className={styles.cardDescription}>
                            Actualiza tu método de pago, cancela tu suscripción
                            o ve tu historial de facturas.
                        </p>
                        <button
                            className={styles.manageButton}
                            onClick={handleManageBilling}
                            disabled={isRedirecting}
                        >
                            {isRedirecting
                                ? "Redirigiendo..."
                                : "Administrar Facturación"}
                        </button>
                    </>
                ) : (
                    <p className={styles.cardDescription}>
                        Actualiza a Premium para administrar tu facturación.
                    </p>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
