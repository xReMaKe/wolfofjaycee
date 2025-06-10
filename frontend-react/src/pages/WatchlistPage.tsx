// src/pages/WatchlistPage.tsx

import React, { useState, useEffect } from "react";
// import type { User } from "firebase/auth"; // <--- CHANGE 1: We no longer need the 'User' type here directly
import { db } from "../firebase";
import {
    doc,
    onSnapshot,
    collection,
    query,
    where,
    updateDoc,
    arrayRemove,
} from "firebase/firestore";

import { useAuth } from "@/contexts/AuthContext"; // <--- CHANGE 2: Import our new hook

import styles from "./WatchlistPage.module.css";
import appStyles from "../App.module.css";
import AddToWatchlistForm from "@/components/AddToWatchlistForm";

interface PriceData {
    price: number;
    change: number;
    percent_change: number;
}

// <--- CHANGE 3: Remove the props from the component definition
const WatchlistPage: React.FC = () => {
    const { currentUser } = useAuth(); // <--- CHANGE 4: Get the user from the context hook

    const [symbols, setSymbols] = useState<string[]>([]);
    const [priceData, setPriceData] = useState<{ [symbol: string]: PriceData }>(
        {}
    );
    const [isLoading, setIsLoading] = useState(true);

    const handleRemoveSymbol = async (symbolToRemove: string) => {
        if (!currentUser) return;

        const watchlistRef = doc(db, "watchlists", currentUser.uid);

        try {
            await updateDoc(watchlistRef, {
                symbols: arrayRemove(symbolToRemove),
            });
        } catch (error) {
            console.error("Error removing symbol from watchlist: ", error);
        }
    };

    useEffect(() => {
        // This effect now depends on 'currentUser' from the hook
        if (!currentUser) return; // Add a guard clause

        const watchlistDocRef = doc(db, "watchlists", currentUser.uid);
        const unsubscribe = onSnapshot(watchlistDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setSymbols(docSnap.data().symbols || []);
            } else {
                setSymbols([]);
            }
        });
        return () => unsubscribe();
    }, [currentUser]); // Depend on the whole currentUser object now

    useEffect(() => {
        if (symbols.length === 0) {
            setIsLoading(false);
            setPriceData({});
            return;
        }
        setIsLoading(true);

        const pricesQuery = query(
            collection(db, "latest_prices"),
            where("__name__", "in", symbols)
        );

        const unsubscribe = onSnapshot(pricesQuery, (snapshot) => {
            const newPriceData: { [symbol: string]: PriceData } = {};
            snapshot.forEach((doc) => {
                newPriceData[doc.id] = doc.data() as PriceData;
            });
            setPriceData(newPriceData);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [symbols]);

    const getChangeClass = (change: number = 0) => {
        if (change > 0) return styles.priceUp;
        if (change < 0) return styles.priceDown;
        return styles.priceNeutral;
    };

    // Add a loading/null check for the user.
    // Since this is a protected route, it will only flash briefly.
    if (!currentUser) {
        return <div>Loading user data...</div>;
    }

    return (
        <div>
            <h1 className={appStyles.pageTitle}>Mi Watchlist</h1>

            <div className={styles.container}>
                <h2 className={styles.sectionTitle}>Añadir Símbolo</h2>
                {/* We still need to pass currentUser to components that need it */}
                <AddToWatchlistForm
                    currentUser={currentUser}
                    currentSymbols={symbols}
                />
            </div>

            <div className={styles.container}>
                <table className={styles.watchlistTable}>
                    {/* ... rest of your JSX table code is IDENTICAL and does not need to change ... */}
                    <thead>
                        <tr>
                            <th>Símbolo</th>
                            <th>Precio Actual</th>
                            <th>Cambio ($)</th>
                            <th>Cambio (%)</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && (
                            <tr>
                                <td colSpan={5} className={styles.loadingText}>
                                    Cargando...
                                </td>
                            </tr>
                        )}
                        {!isLoading && symbols.length === 0 && (
                            <tr>
                                <td colSpan={5} className={styles.emptyText}>
                                    Tu watchlist está vacía.
                                </td>
                            </tr>
                        )}
                        {!isLoading &&
                            symbols.map((symbol) => {
                                const data = priceData[symbol] || {
                                    price: 0,
                                    change: 0,
                                    percent_change: 0,
                                };
                                return (
                                    <tr key={symbol}>
                                        <td>
                                            <strong>{symbol}</strong>
                                        </td>
                                        {data ? (
                                            <>
                                                <td>
                                                    $
                                                    {(data.price || 0).toFixed(
                                                        2
                                                    )}
                                                </td>
                                                <td
                                                    className={getChangeClass(
                                                        data.change
                                                    )}
                                                >
                                                    {(data.change || 0).toFixed(
                                                        2
                                                    )}
                                                </td>
                                                <td
                                                    className={getChangeClass(
                                                        data.change
                                                    )}
                                                >
                                                    {(
                                                        data.percent_change || 0
                                                    ).toFixed(2)}
                                                    %
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td
                                                    colSpan={3}
                                                    style={{
                                                        color: "var(--text-secondary)",
                                                        fontStyle: "italic",
                                                    }}
                                                >
                                                    Cargando precio...
                                                </td>
                                            </>
                                        )}
                                        <td>
                                            <button
                                                onClick={() =>
                                                    handleRemoveSymbol(symbol)
                                                }
                                                className={styles.deleteButton}
                                                title={`Remove ${symbol}`}
                                            >
                                                ×
                                            </button>
                                        </td>
                                        <td></td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default WatchlistPage;
