// src/components/PortfolioDetail.tsx

import React, { useState, useEffect } from "react";
import EditPositionModal from "./EditPositionModal";
import NewsPanel from "./NewsPanel";
import { formatAsCurrency } from "@/utils/formatting";
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import type { User } from "firebase/auth";
import AddPositionForm from "./AddPositionForm";
import styles from "./PortfolioDetail.module.css"; // We are now using YOUR CSS file

// --- Interfaces (no changes here) ---
interface Portfolio {
    id: string;
    name: string;
    description?: string;
}
interface Position {
    id: string;
    symbol: string;
    quantity: number;
    costBasisPerShare: number;
}
interface PriceData {
    [symbol: string]: number;
}
interface PortfolioDetailProps {
    portfolioId: string;
    currentUser: User;
}

const PortfolioDetail: React.FC<PortfolioDetailProps> = ({
    portfolioId,
    currentUser,
}) => {
    // --- State and Data Fetching Logic (no changes here) ---
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [prices, setPrices] = useState<PriceData>({});
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"positions" | "news">(
        "positions"
    );
    const [selectedNewsSymbol, setSelectedNewsSymbol] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState<Position | null>(
        null
    );

    useEffect(() => {
        const portfolioRef = doc(db, "portfolios", portfolioId);
        getDoc(portfolioRef).then((docSnap) => {
            if (docSnap.exists() && docSnap.data().userId === currentUser.uid) {
                setPortfolio({
                    id: docSnap.id,
                    ...docSnap.data(),
                } as Portfolio);
            } else {
                setError("Portfolio not found or you do not have permission.");
                setIsLoading(false);
            }
        });

        const positionsQuery = query(
            collection(db, "positions"),
            where("portfolioId", "==", portfolioId),
            where("userId", "==", currentUser.uid)
        );
        const unsubscribePositions = onSnapshot(positionsQuery, (snapshot) => {
            const positionsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Position[];
            setPositions(positionsData);
            setIsLoading(false);
        });

        const pricesQuery = query(collection(db, "latest_prices"));
        const unsubscribePrices = onSnapshot(pricesQuery, (snapshot) => {
            const priceData: PriceData = {};
            snapshot.forEach((doc) => {
                priceData[doc.id.toUpperCase()] = doc.data().price;
            });
            setPrices(priceData);
        });

        return () => {
            unsubscribePositions();
            unsubscribePrices();
        };
    }, [portfolioId, currentUser.uid]);

    const handlePositionAdded = () => {
        console.log(
            "Position added! UI will update via the snapshot listener."
        );
    };
    const handleOpenEditModal = (position: Position) => {
        setEditingPosition(position);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingPosition(null);
    };

    // --- Helper function for dynamic price colors based on your CSS ---
    const getPriceClass = (currentPrice: number, costBasisPerShare: number) => {
        if (currentPrice > costBasisPerShare) return styles.priceUp;
        if (currentPrice < costBasisPerShare) return styles.priceDown;
        return styles.priceNeutral;
    };

    // --- Conditional Renders using your CSS classes ---
    if (isLoading)
        return <p className={styles.loadingText}>Loading portfolio...</p>;
    if (error) return <p className={styles.errorText}>{error}</p>;

    // --- NEW AND IMPROVED RENDER BLOCK ---
    // --- THIS IS THE COMPLETE BLOCK TO COPY AND PASTE ---

    return (
        <div className={styles.container}>
            {/* Portfolio Header (no changes) */}
            {portfolio && (
                <div>
                    <h2 className={styles.title}>{portfolio.name}</h2>
                    <p
                        style={{
                            marginTop: "-16px",
                            marginBottom: "32px",
                            color: "var(--text-secondary)",
                        }}
                    >
                        {portfolio.description}
                    </p>
                </div>
            )}

            {/* --- NEW TAB NAVIGATION --- */}
            <div className={styles.tabNav}>
                <button
                    className={
                        activeTab === "positions" ? styles.activeTab : ""
                    }
                    onClick={() => setActiveTab("positions")}
                >
                    Posiciones
                </button>
                <button
                    className={activeTab === "news" ? styles.activeTab : ""}
                    onClick={() => setActiveTab("news")}
                >
                    Noticias
                </button>
            </div>

            {/* --- NEW CONDITIONAL CONTENT AREA --- */}
            <div className={styles.tabContent}>
                {/* --- POSITIONS TAB CONTENT --- */}
                {activeTab === "positions" && (
                    <>
                        {/* Your existing Positions Table is now inside this tab */}
                        <table className={styles.positionsTable}>
                            <thead>
                                <tr>
                                    <th>Symbol</th>
                                    <th>Quantity</th>
                                    <th>Cost Basis</th>
                                    <th>Current Price</th>
                                    <th>Total Value</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {positions.map((pos) => {
                                    const currentPrice =
                                        prices[pos.symbol.toUpperCase()] || 0;
                                    const currentValue =
                                        currentPrice * pos.quantity;
                                    const costBasisPerShare =
                                        typeof pos.costBasisPerShare ===
                                        "number"
                                            ? pos.costBasisPerShare
                                            : 0;
                                    return (
                                        <tr key={pos.id}>
                                            <td>
                                                <span className={styles.symbol}>
                                                    {pos.symbol.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>{pos.quantity}</td>
                                            <td>
                                                {formatAsCurrency(
                                                    costBasisPerShare
                                                )}
                                            </td>
                                            <td
                                                className={getPriceClass(
                                                    currentPrice,
                                                    costBasisPerShare
                                                )}
                                            >
                                                {formatAsCurrency(currentPrice)}
                                            </td>
                                            <td>
                                                <strong>
                                                    {formatAsCurrency(
                                                        currentValue
                                                    )}
                                                </strong>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() =>
                                                        handleOpenEditModal(pos)
                                                    }
                                                    className={
                                                        styles.editButton
                                                    }
                                                >
                                                    Editar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {positions.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className={styles.emptyText}
                                        >
                                            No positions added yet. Use the form
                                            below to start.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Your existing Add Position Form is also inside this tab */}
                        <div className={styles.formSeparator}>
                            <h3 className={styles.title}>
                                Añadir Nueva Posición
                            </h3>
                            <AddPositionForm
                                portfolioId={portfolioId}
                                currentUser={currentUser}
                                onPositionAdded={handlePositionAdded}
                            />
                        </div>
                    </>
                )}

                {/* --- NEWS TAB CONTENT --- */}
                {activeTab === "news" && (
                    <div>
                        {positions.length > 0 ? (
                            <>
                                <label
                                    htmlFor="news-select"
                                    style={{
                                        fontWeight: "600",
                                        marginBottom: "8px",
                                        display: "block",
                                    }}
                                >
                                    Ver noticias para:
                                </label>
                                <select
                                    id="news-select"
                                    value={selectedNewsSymbol}
                                    onChange={(e) =>
                                        setSelectedNewsSymbol(e.target.value)
                                    }
                                    className={styles.newsSymbolSelect}
                                >
                                    {positions.map((p) => (
                                        <option key={p.id} value={p.symbol}>
                                            {p.symbol.toUpperCase()}
                                        </option>
                                    ))}
                                </select>

                                {selectedNewsSymbol && (
                                    <NewsPanel symbol={selectedNewsSymbol} />
                                )}
                            </>
                        ) : (
                            <p className={styles.emptyText}>
                                Añade una posición para ver noticias.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* The Edit Position Modal stays outside the tabs so it can be called from anywhere */}
            <EditPositionModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                position={editingPosition}
            />
        </div>
    );
};

export default PortfolioDetail;
