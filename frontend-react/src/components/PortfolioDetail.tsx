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
import { db } from "../firebase"; // Firestore instance
import type { User } from "firebase/auth"; // Firebase User type
import AddPositionForm from "./AddPositionForm"; // Import AddPositionForm

interface PortfolioDetailProps {
    portfolioId: string;
    currentUser: User;
}

interface Position {
    id: string; // This declares the 'id' field for the Position interface
    symbol: string;
    quantity: number;
    costBasisPerShare: number;
    // You can add more fields if present in your positions documents
}

interface LatestPrice {
    price: number;
    lastUpdatedAt: { _seconds: number; _nanoseconds: number };
}

const PortfolioDetail: React.FC<PortfolioDetailProps> = ({
    portfolioId,
    currentUser,
}) => {
    const [positions, setPositions] = useState<Position[]>([]);
    const [prices, setPrices] = useState<{ [symbol: string]: LatestPrice }>({});
    const [loadingPositions, setLoadingPositions] = useState(true);
    const [loadingPrices, setLoadingPrices] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [positionsRefreshTrigger, setPositionsRefreshTrigger] = useState(0);

    // Fetch positions for the current portfolio and user
    useEffect(() => {
        const fetchPositions = async () => {
            setLoadingPositions(true);
            setError(null);
            try {
                const q = query(
                    collection(db, "positions"),
                    where("portfolioId", "==", portfolioId),
                    where("userId", "==", currentUser.uid)
                );
                const querySnapshot = await getDocs(q);
                const fetchedPositions: Position[] = querySnapshot.docs.map(
                    (doc) => {
                        const data = doc.data(); // Get the raw data first
                        return {
                            ...(data as Position), // Spread all properties from the document's data (TypeScript assumes 'id' here)
                            id: doc.id, // Explicitly add the document's ID, which will overwrite any 'id' from 'data'
                        };
                    }
                );
                setPositions(fetchedPositions);
            } catch (err: any) {
                console.error("Error fetching positions:", err);
                setError(`Error al cargar posiciones: ${err.message}`);
            } finally {
                setLoadingPositions(false);
            }
        };

        fetchPositions();
    }, [portfolioId, currentUser, positionsRefreshTrigger]);

    // Fetch latest prices for the fetched positions
    useEffect(() => {
        const fetchPrices = async () => {
            if (positions.length > 0) {
                setLoadingPrices(true);
                const fetchedPrices: { [symbol: string]: LatestPrice } = {};
                try {
                    for (const position of positions) {
                        const priceDocRef = doc(
                            db,
                            "latest_prices",
                            position.symbol
                        );
                        const priceDocSnap = await getDoc(priceDocRef);

                        if (priceDocSnap.exists()) {
                            fetchedPrices[position.symbol] =
                                priceDocSnap.data() as LatestPrice;
                        } else {
                            console.warn(
                                `Price for ${position.symbol} not found in latest_prices.`
                            );
                            fetchedPrices[position.symbol] = {
                                price: 0,
                                lastUpdatedAt: { _seconds: 0, _nanoseconds: 0 },
                            };
                        }
                    }
                    setPrices(fetchedPrices);
                } catch (err: any) {
                    console.error("Error fetching prices:", err);
                } finally {
                    setLoadingPrices(false);
                }
            } else {
                setPrices({});
                setLoadingPrices(false);
            }
        };

        fetchPrices();
    }, [positions]);

    const handlePositionAdded = () => {
        setPositionsRefreshTrigger((prev) => prev + 1);
    };

    if (loadingPositions) {
        return <p style={{ textAlign: "center" }}>Cargando posiciones...</p>;
    }

    if (error) {
        return <p style={{ textAlign: "center", color: "red" }}>{error}</p>;
    }

    if (positions.length === 0) {
        return (
            <div style={{ textAlign: "center" }}>
                <p>No tienes posiciones en este portafolio todavía.</p>
                {currentUser && (
                    <AddPositionForm
                        portfolioId={portfolioId}
                        currentUser={currentUser}
                        onPositionAdded={handlePositionAdded}
                    />
                )}
            </div>
        );
    }

    return (
        <div>
            <h3 style={{ textAlign: "center", marginTop: "20px" }}>
                Tus Posiciones:
            </h3>
            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: "10px",
                }}
            >
                <thead>
                    <tr style={{ background: "#333" }}>
                        <th
                            style={{
                                padding: "8px",
                                border: "1px solid #444",
                                textAlign: "left",
                            }}
                        >
                            Símbolo
                        </th>
                        <th
                            style={{
                                padding: "8px",
                                border: "1px solid #444",
                                textAlign: "left",
                            }}
                        >
                            Cantidad
                        </th>
                        <th
                            style={{
                                padding: "8px",
                                border: "1px solid #444",
                                textAlign: "left",
                            }}
                        >
                            Costo Base
                        </th>
                        <th
                            style={{
                                padding: "8px",
                                border: "1px solid #444",
                                textAlign: "left",
                            }}
                        >
                            Precio Actual
                        </th>
                        <th
                            style={{
                                padding: "8px",
                                border: "1px solid #444",
                                textAlign: "left",
                            }}
                        >
                            Valor Actual
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {positions.map((position) => {
                        const currentPrice =
                            prices[position.symbol]?.price || 0;
                        const currentValue = currentPrice * position.quantity;
                        return (
                            <tr
                                key={position.id}
                                style={{ background: "#282c34" }}
                            >
                                <td
                                    style={{
                                        padding: "8px",
                                        border: "1px solid #444",
                                    }}
                                >
                                    {position.symbol}
                                </td>
                                <td
                                    style={{
                                        padding: "8px",
                                        border: "1px solid #444",
                                    }}
                                >
                                    {position.quantity}
                                </td>
                                <td
                                    style={{
                                        padding: "8px",
                                        border: "1px solid #444",
                                    }}
                                >
                                    ${position.costBasisPerShare.toFixed(2)}
                                </td>
                                <td
                                    style={{
                                        padding: "8px",
                                        border: "1px solid #444",
                                        color:
                                            currentPrice >
                                            position.costBasisPerShare
                                                ? "lightgreen"
                                                : currentPrice <
                                                  position.costBasisPerShare
                                                ? "salmon"
                                                : "white",
                                    }}
                                >
                                    {loadingPrices
                                        ? "Cargando..."
                                        : `$${currentPrice.toFixed(2)}`}
                                </td>
                                <td
                                    style={{
                                        padding: "8px",
                                        border: "1px solid #444",
                                    }}
                                >
                                    {loadingPrices
                                        ? "Cargando..."
                                        : `$${currentValue.toFixed(2)}`}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {currentUser && (
                <AddPositionForm
                    portfolioId={portfolioId}
                    currentUser={currentUser}
                    onPositionAdded={handlePositionAdded}
                />
            )}
        </div>
    );
};

export default PortfolioDetail;
