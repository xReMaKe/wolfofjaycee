// src/components/PortfolioDetail.tsx

import React, { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    getDoc,
    QuerySnapshot, // <-- IMPORT THIS TYPE
} from "firebase/firestore";
import { db } from "../firebase";
import type { AppUser } from "@/contexts/AuthContext";
import { formatAsCurrency } from "@/utils/formatting";
import EditPositionModal from "@/components/EditPositionModal";
import NewsPanel from "@/components/NewsPanel";
import styles from "./PortfolioDetail.module.css";

// --- INTERFACES (ALL DEFINED AT THE TOP LEVEL) ---

interface Portfolio {
    id: string;
    name: string;
    description?: string;
}

interface PriceData {
    [symbol: string]: number;
}

interface LegacyPosition {
    id: string;
    symbol: string;
    quantity: number;
    costBasisPerShare: number;
}

interface Transaction {
    id: string;
    symbol: string;
    type: "buy" | "sell";
    quantity: number;
    pricePerShare: number;
}

// THIS IS THE CORRECT, UNIFIED INTERFACE
interface MergedPosition {
    symbol: string;
    quantity: number;
    costBasisPerShare: number;
    totalCost: number; // Keep track of total cost for accurate averaging
    source: "legacy" | "transaction";
    legacyId?: string;
}

interface PortfolioDetailProps {
    portfolioId: string;
    currentUser: AppUser;
}

const PortfolioDetail: React.FC<PortfolioDetailProps> = ({
    portfolioId,
    currentUser,
}) => {
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [displayPositions, setDisplayPositions] = useState<MergedPosition[]>(
        []
    );
    const [prices, setPrices] = useState<PriceData>({});
    const [activeTab, setActiveTab] = useState<"positions" | "news">(
        "positions"
    );
    const [selectedNewsSymbol, setSelectedNewsSymbol] = useState("");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPosition, setEditingPosition] =
        useState<LegacyPosition | null>(null);

    useEffect(() => {
        setIsLoading(true);

        const portfolioRef = doc(db, "portfolios", portfolioId);
        getDoc(portfolioRef).then((docSnap) => {
            if (docSnap.exists() && docSnap.data().userId === currentUser.uid) {
                setPortfolio({
                    id: docSnap.id,
                    ...docSnap.data(),
                } as Portfolio);
            } else {
                setError("Portafolio no encontrado o no tienes permiso.");
                setIsLoading(false);
            }
        });

        const pricesQuery = query(collection(db, "latest_prices"));
        const unsubscribePrices = onSnapshot(pricesQuery, (snapshot) => {
            const priceData: PriceData = {};
            snapshot.forEach((doc) => {
                priceData[doc.id.toUpperCase()] = doc.data().price;
            });
            setPrices(priceData);
        });

        const legacyPositionsQuery = query(
            collection(db, "positions"),
            where("portfolioId", "==", portfolioId),
            where("userId", "==", currentUser.uid)
        );
        const transactionsQuery = query(
            collection(db, "transactions"),
            where("portfolioId", "==", portfolioId),
            where("userId", "==", currentUser.uid)
        );

        // This function holds the complete logic for processing data
        const processData = (
            legacySnapshot: QuerySnapshot,
            transactionsSnapshot: QuerySnapshot
        ) => {
            const holdings: { [symbol: string]: MergedPosition } = {};

            // 1. Process legacy positions
            legacySnapshot.forEach((doc) => {
                const pos = doc.data() as LegacyPosition;
                const symbol = pos.symbol.toUpperCase();
                holdings[symbol] = {
                    symbol: symbol,
                    quantity: pos.quantity,
                    costBasisPerShare: pos.costBasisPerShare,
                    totalCost: pos.quantity * pos.costBasisPerShare,
                    source: "legacy",
                    legacyId: doc.id,
                };
            });

            // 2. If premium, process and merge transactions
            if (currentUser.subscriptionTier === "premium") {
                transactionsSnapshot.forEach((doc) => {
                    const tx = doc.data() as Transaction;
                    const symbol = tx.symbol.toUpperCase();

                    if (!holdings[symbol]) {
                        holdings[symbol] = {
                            symbol,
                            quantity: 0,
                            costBasisPerShare: 0,
                            totalCost: 0,
                            source: "transaction",
                        };
                    }

                    const currentQuantity = holdings[symbol].quantity;
                    const currentTotalCost = holdings[symbol].totalCost;

                    if (tx.type === "buy") {
                        const newQuantity = currentQuantity + tx.quantity;
                        const newTotalCost =
                            currentTotalCost + tx.quantity * tx.pricePerShare;
                        holdings[symbol].quantity = newQuantity;
                        holdings[symbol].totalCost = newTotalCost;
                        holdings[symbol].costBasisPerShare =
                            newTotalCost / newQuantity;
                    } else if (tx.type === "sell") {
                        holdings[symbol].quantity -= tx.quantity;
                    }
                    holdings[symbol].source = "transaction";
                });
            }

            const finalPositions = Object.values(holdings).filter(
                (p) => p.quantity > 0.00001
            );
            setDisplayPositions(finalPositions);
            if (finalPositions.length > 0 && !selectedNewsSymbol) {
                setSelectedNewsSymbol(finalPositions[0].symbol);
            }
        };

        // Set up listeners that call the processing function
        const unsubscribeLegacy = onSnapshot(
            legacyPositionsQuery,
            (legacySnapshot) => {
                onSnapshot(transactionsQuery, (transactionsSnapshot) => {
                    processData(legacySnapshot, transactionsSnapshot);
                    setIsLoading(false);
                });
            }
        );

        return () => {
            unsubscribeLegacy();
            unsubscribePrices();
        };
    }, [portfolioId, currentUser.uid, currentUser.subscriptionTier]);

    const handleOpenEditModal = (position: MergedPosition) => {
        if (position.source !== "legacy" || !position.legacyId) {
            alert(
                "Para modificar, por favor añada una nueva transacción de compra o venta."
            );
            return;
        }
        const legacyPosition: LegacyPosition = {
            id: position.legacyId,
            symbol: position.symbol,
            quantity: position.quantity,
            costBasisPerShare: position.costBasisPerShare,
        };
        setEditingPosition(legacyPosition);
        setIsEditModalOpen(true);
    };

    if (isLoading)
        return <p className={styles.loadingText}>Cargando portafolio...</p>;
    if (error) return <p className={styles.errorText}>{error}</p>;

    return (
        <>
            {portfolio && (
                <div>
                    <h2 className={styles.title}>{portfolio.name}</h2>
                    {portfolio.description && (
                        <p className={styles.description}>
                            {portfolio.description}
                        </p>
                    )}
                </div>
            )}
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
            <div className={styles.tabContent}>
                {activeTab === "positions" && (
                    <table className={styles.positionsTable}>
                        <thead>
                            <tr>
                                <th>Símbolo</th>
                                <th>Cantidad</th>
                                <th>Costo por Acción</th>
                                <th>Precio Actual</th>
                                <th>Valor Total</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayPositions.map((pos) => {
                                const currentPrice =
                                    prices[pos.symbol.toUpperCase()] || 0;
                                return (
                                    <tr key={pos.symbol}>
                                        <td>
                                            <span className={styles.symbol}>
                                                {pos.symbol}
                                            </span>
                                        </td>
                                        <td>{pos.quantity}</td>
                                        <td>
                                            {formatAsCurrency(
                                                pos.costBasisPerShare
                                            )}
                                        </td>
                                        <td>
                                            {formatAsCurrency(currentPrice)}
                                        </td>
                                        <td>
                                            <strong>
                                                {formatAsCurrency(
                                                    currentPrice * pos.quantity
                                                )}
                                            </strong>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() =>
                                                    handleOpenEditModal(pos)
                                                }
                                                className={styles.editButton}
                                                disabled={
                                                    pos.source === "transaction"
                                                }
                                                title={
                                                    pos.source === "transaction"
                                                        ? "Añada una transacción para modificar"
                                                        : "Editar posición"
                                                }
                                            >
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {displayPositions.length === 0 && !isLoading && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className={styles.emptyText}
                                    >
                                        Aún no hay posiciones.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
                {activeTab === "news" && (
                    <div>
                        {displayPositions.length > 0 ? (
                            <>
                                <label
                                    htmlFor="news-select"
                                    className={styles.newsLabel}
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
                                    {displayPositions.map((p) => (
                                        <option key={p.symbol} value={p.symbol}>
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
            <EditPositionModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                position={editingPosition}
            />
        </>
    );
};

export default PortfolioDetail;
