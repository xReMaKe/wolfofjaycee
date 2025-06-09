// src/pages/MarketingPage.tsx

import React from "react";
import { Link } from "react-router-dom";
import styles from "./MarketingPage.module.css";
import appStyles from "../App.module.css"; // We'll use the main content container

const MarketingPage: React.FC = () => {
    return (
        <div className={appStyles.mainContent}>
            <div className={styles.heroSection}>
                <h1 className={styles.heroTitle}>
                    Toma el Control de Tus Finanzas.
                </h1>
                <p className={styles.heroSubtitle}>
                    Desde el seguimiento de tu portafolio hasta calculadoras de
                    interés compuesto, te damos las herramientas para construir
                    tu futuro financiero.
                </p>
                <Link to="/login" className={styles.ctaButton}>
                    Comienza Gratis
                </Link>
            </div>
            {/* Future sections like "Features", "Testimonials" would go here */}
        </div>
    );
};

export default MarketingPage;
