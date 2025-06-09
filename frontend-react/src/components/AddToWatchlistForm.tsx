// src/components/AddToWatchlistForm.tsx

import React, { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formattedSymbol = symbol.toUpperCase().trim();
        if (!formattedSymbol) return;

        setIsSubmitting(true);
        const watchlistRef = doc(db, "watchlists", currentUser.uid);

        try {
            // Use arrayUnion to safely add the new symbol to the array
            await setDoc(
                watchlistRef,
                {
                    symbols: arrayUnion(formattedSymbol),
                },
                { merge: true }
            ); // merge:true creates the doc if it doesn't exist
            setSymbol(""); // Clear input on success
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
