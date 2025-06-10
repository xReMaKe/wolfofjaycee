// src/components/AddToWatchlistForm.tsx

import React, { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import type { User } from "firebase/auth";
import styles from "./AddToWatchlistForm.module.css";

interface FormProps {
    currentUser: User;
    currentSymbols: string[];
}

const AddToWatchlistForm: React.FC<FormProps> = ({
    currentUser,
    currentSymbols,
}) => {
    const [symbol, setSymbol] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // In src/components/AddToWatchlistForm.tsx

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Start with the user's input
        let symbolToAdd = symbol.toUpperCase().trim();
        if (!symbolToAdd) return; // Exit if empty

        // --- NEW CRYPTO FORMATTING LOGIC ---
        // This is a map of common, simple crypto tickers to their required Finnhub format.
        const cryptoMap: { [key: string]: string } = {
            BTC: "COINBASE:BTC-USD",
            ETH: "COINBASE:ETH-USD",
            SOL: "COINBASE:SOL-USD",
            ADA: "COINBASE:ADA-USD", // Cardano
            SHIB: "COINBASE:SHIB-USD", // Shiba Inu
            DOGE: "BINANCE:DOGEUSDT", // Dogecoin
            XRP: "BINANCE:XRPUSDT", // Ripple
            BNB: "BINANCE:BNBUSDT", // BNB
            USDT: "COINBASE:USDT-USD", // Tether
            NEAR: "COINBASE:NEAR-USD", // NEAR Protocol
            // Add any other cryptos you want here!
        };

        // If the user typed a key from our map (e.g., "BTC"),
        // we re-assign symbolToAdd to be the correct value (e.g., "COINBASE:BTC-USD").
        if (cryptoMap[symbolToAdd]) {
            symbolToAdd = cryptoMap[symbolToAdd];
        }
        // --- END OF NEW LOGIC ---

        // Now, we use the (potentially formatted) symbolToAdd for the duplicate check
        if (currentSymbols.includes(symbolToAdd)) {
            alert(`"${symbolToAdd}" ya está en tu watchlist.`);
            return;
        }

        setIsSubmitting(true);
        const watchlistRef = doc(db, "watchlists", currentUser.uid);

        try {
            await setDoc(
                watchlistRef,
                {
                    symbols: arrayUnion(symbolToAdd), // Add the final formatted symbol
                },
                { merge: true }
            );
            setSymbol("");
        } catch (error) {
            console.error("Error adding to watchlist:", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="ej. AAPL, TSLA..."
                className={styles.input}
            />
            <button
                type="submit"
                disabled={isSubmitting}
                className={styles.button}
            >
                {isSubmitting ? "..." : "Añadir"}
            </button>
        </form>
    );
};

export default AddToWatchlistForm;
