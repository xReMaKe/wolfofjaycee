// src/pages/PortfolioDetailPage.tsx

import React from "react";
import { useParams, Link } from "react-router-dom";
import PortfolioDetail from "../components/PortfolioDetail"; // ← this is your component
import type { User } from "firebase/auth";

// Only currentUser is passed in from App.tsx.
// We’ll grab portfolioId via useParams().
interface PortfolioDetailPageProps {
    currentUser: User;
}

const PortfolioDetailPage: React.FC<PortfolioDetailPageProps> = ({
    currentUser,
}) => {
    // Grab “portfolioId” from the URL /portfolio/:portfolioId
    const { portfolioId } = useParams<{ portfolioId: string }>();

    return (
        <div style={{ padding: "20px" }}>
            <Link
                to="/"
                style={{
                    color: "var(--accent-blue)",
                    marginBottom: "24px",
                    display: "inline-block",
                    fontWeight: "600",
                }}
            >
                &larr; Volver al Dashboard
            </Link>

            {currentUser && portfolioId ? (
                // Pass both portfolioId and currentUser into the PortfolioDetail component
                <PortfolioDetail
                    portfolioId={portfolioId}
                    currentUser={currentUser}
                />
            ) : (
                <p>Cargando datos del portafolio...</p>
            )}
        </div>
    );
};

export default PortfolioDetailPage;
