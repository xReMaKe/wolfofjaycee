// src/pages/PortfolioDetailPage.tsx

import React from "react";
import { useParams, Link } from "react-router-dom";
import PortfolioDetail from "../components/PortfolioDetail";
import { useAuth } from "@/contexts/AuthContext"; // <-- Import the hook

// No more PortfolioDetailPageProps!

const PortfolioDetailPage: React.FC = () => {
    // Get the user from the context
    const { currentUser } = useAuth();
    // Grab “portfolioId” from the URL, e.g., /portfolio/some-id-from-firestore
    const { portfolioId } = useParams<{ portfolioId: string }>();

    return (
        <div style={{ padding: "20px" }}>
            <Link
                to="/dashboard" // Changed this to /dashboard to avoid redirect loop
                style={{
                    color: "var(--accent-blue)",
                    marginBottom: "24px",
                    display: "inline-block",
                    fontWeight: "600",
                }}
            >
                ← Volver al Dashboard
            </Link>

            {/* If we have a user and a portfolioId from the URL, render the Detail component */}
            {currentUser && portfolioId ? (
                <PortfolioDetail
                    portfolioId={portfolioId}
                    currentUser={currentUser}
                />
            ) : (
                // This will show briefly while the page loads or if the URL is wrong
                <p>Cargando datos del portafolio...</p>
            )}
        </div>
    );
};

export default PortfolioDetailPage;
