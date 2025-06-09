// src/pages/WatchlistPage.tsx

import React, { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import { db } from "../firebase";
import {
    doc,
    onSnapshot,
    collection,
    query,
    where,
    getDocs,
} from "firebase/firestore";

import styles from "./WatchlistPage.module.css";
import appStyles from "../App.module.css";
import AddToWatchlistForm from "@/components/AddToWatchlistForm"; // We will create this next

interface PriceData {
    price: number;
    change: number;
    percent_change: number;
}

const WatchlistPage: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [symbols, setSymbols] = useState<string[]>([]);
    const [priceData, setPriceData] = useState<{ [symbol: string]: PriceData }>(
        {}
    );
    const [isLoading, setIsLoading] = useState(true);

    // Effect to get the user's list of watched symbols
    useEffect(() => {
        const watchlistDocRef = doc(db, "watchlists", currentUser.uid);
        const unsubscribe = onSnapshot(watchlistDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setSymbols(docSnap.data().symbols || []);
            } else {
                setSymbols([]); // User has no watchlist yet
            }
        });
        return () => unsubscribe();
    }, [currentUser.uid]);

    // Effect to get the prices for the symbols in the watchlist
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

    return (
        <div>
            <h1 className={appStyles.pageTitle}>Mi Watchlist</h1>

            <div className={styles.container}>
                <h2 className={styles.sectionTitle}>Añadir Símbolo</h2>
                <AddToWatchlistForm
                    currentUser={currentUser}
                    currentSymbols={symbols}
                />
            </div>

            <div className={styles.container}>
                <table className={styles.watchlistTable}>
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
                                                {/* This block only renders if price data EXISTS for the symbol */}
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
                                                {/* This block renders if data is NOT YET available */}
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
                                            {/* Delete button will go here */}
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
