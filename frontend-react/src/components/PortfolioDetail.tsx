// frontend-react/src/components/PortfolioDetail.tsx
import React, { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { User } from "firebase/auth";
import AddPositionForm from "./AddPositionForm";
import styles from "./PortfolioDetail.module.css"; // Import the CSS module

interface PortfolioDetailProps {
    portfolioId: string;
    currentUser: User;
}

interface Position {
    id: string;
    symbol: string;
    quantity: number;
    costBasisPerShare: number;
}

interface LatestPrice {
    price: number;
    lastUpdatedAt: { seconds: number; nanoseconds: number };
}

const PortfolioDetail: React.FC<PortfolioDetailProps> = ({
    portfolioId,
    currentUser,
}) => {
    const [positions, setPositions] = useState<Position[]>([]);
    const [prices, setPrices] = useState<{ [symbol: string]: LatestPrice }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch positions
                const positionsQuery = query(
                    collection(db, "positions"),
                    where("portfolioId", "==", portfolioId),
                    where("userId", "==", currentUser.uid)
                );
                const positionsSnapshot = await getDocs(positionsQuery);
                const fetchedPositions: Position[] = positionsSnapshot.docs.map(
                    (doc) => ({
                        id: doc.id,
                        ...(doc.data() as Omit<Position, "id">),
                    })
                );
                setPositions(fetchedPositions);

                // Fetch prices for the positions
                if (fetchedPositions.length > 0) {
                    const fetchedPrices: { [symbol: string]: LatestPrice } = {};
                    for (const position of fetchedPositions) {
                        const priceDocRef = doc(
                            db,
                            "latest_prices",
                            position.symbol
                        );
                        const priceDocSnap = await getDoc(priceDocRef);
                        if (priceDocSnap.exists()) {
                            fetchedPrices[position.symbol] =
                                priceDocSnap.data() as LatestPrice;
                        }
                    }
                    setPrices(fetchedPrices);
                }
            } catch (err: any) {
                console.error("Error fetching portfolio details:", err);
                setError(`Error al cargar datos: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [portfolioId, currentUser, refreshTrigger]);

    const handlePositionAdded = () => {
        setRefreshTrigger((prev) => prev + 1);
    };

    const getPriceColorClass = (currentPrice: number, costBasis: number) => {
        if (currentPrice > costBasis) return styles.priceUp;
        if (currentPrice < costBasis) return styles.priceDown;
        return styles.priceNeutral;
    };

    if (loading) {
        return <p className={styles.loadingText}>Cargando posiciones...</p>;
    }

    if (error) {
        return <p className={styles.errorText}>{error}</p>;
    }

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>Posiciones del Portafolio</h3>
            {positions.length > 0 ? (
                <table className={styles.positionsTable}>
                    <thead>
                        <tr>
                            <th>Símbolo</th>
                            <th>Cantidad</th>
                            <th>Costo Base</th>
                            <th>Precio Actual</th>
                            <th>Valor Actual</th>
                        </tr>
                    </thead>
                    <tbody>
                        {positions.map((position) => {
                            const currentPrice =
                                prices[position.symbol]?.price ?? 0;
                            const currentValue =
                                currentPrice * position.quantity;
                            return (
                                <tr key={position.id}>
                                    <td>
                                        <span className={styles.symbol}>
                                            {position.symbol}
                                        </span>
                                    </td>
                                    <td>{position.quantity}</td>
                                    <td>
                                        ${position.costBasisPerShare.toFixed(2)}
                                    </td>
                                    <td
                                        className={getPriceColorClass(
                                            currentPrice,
                                            position.costBasisPerShare
                                        )}
                                    >
                                        ${currentPrice.toFixed(2)}
                                    </td>
                                    <td>${currentValue.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <p className={styles.emptyText}>
                    No tienes posiciones en este portafolio todavía.
                </p>
            )}

            <div className={styles.formSeparator}>
                {/* This form will be unstyled for now. We will style it in the next step. */}
                <AddPositionForm
                    portfolioId={portfolioId}
                    currentUser={currentUser}
                    onPositionAdded={handlePositionAdded}
                />
            </div>
        </div>
    );
};

export default PortfolioDetail;
