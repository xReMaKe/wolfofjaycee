// src/components/AddPositionForm.tsx

import React, { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import type { User } from "firebase/auth";
// Assuming you have styles for this form, otherwise create AddPositionForm.module.css
import styles from "./AddPositionForm.module.css";

interface AddPositionFormProps {
    portfolioId: string;
    currentUser: User;
    onPositionAdded: () => void;
}

const AddPositionForm: React.FC<AddPositionFormProps> = ({
    portfolioId,
    currentUser,
    onPositionAdded,
}) => {
    // Use strings for form state to handle empty inputs gracefully
    const [symbol, setSymbol] = useState("");
    const [quantity, setQuantity] = useState("");
    const [purchasePrice, setPurchasePrice] = useState("");

    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        // --- Input Validation ---
        if (!symbol.trim()) {
            setError("El símbolo es obligatorio.");
            return;
        }

        const numQuantity = parseFloat(quantity);
        if (isNaN(numQuantity) || numQuantity <= 0) {
            setError("La cantidad debe ser un número positivo.");
            return;
        }

        // THIS IS THE KEY FIX: We now correctly parse the purchase price
        const numPurchasePrice = parseFloat(purchasePrice);
        if (isNaN(numPurchasePrice) || numPurchasePrice < 0) {
            setError("El costo base debe ser un número válido.");
            return;
        }

        setIsSubmitting(true);

        try {
            await addDoc(collection(db, "positions"), {
                symbol: symbol.toUpperCase().trim(),
                quantity: numQuantity,
                purchasePrice: numPurchasePrice, // Sending the correct, parsed number
                portfolioId: portfolioId,
                userId: currentUser.uid,
            });

            // Success!
            setSuccessMessage("¡Posición añadida exitosamente!");
            onPositionAdded();

            // Clear the form fields
            setSymbol("");
            setQuantity("");
            setPurchasePrice("");

            // Hide success message after 3 seconds
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error("Error adding position:", err);
            setError("No se pudo añadir la posición. Inténtalo de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        // Use your ".form" class
        <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGrid}>
                <input
                    type="text"
                    placeholder="Símbolo (ej. AAPL)"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className={styles.input}
                />
                <input
                    type="number"
                    placeholder="Cantidad"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={styles.input}
                    step="any"
                />
                <input
                    type="number"
                    placeholder="Costo Base por Acción"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className={styles.input}
                    step="any"
                />
            </div>

            {/* Display success or error message using your ".message" classes */}
            <div className={styles.message}>
                {error && <p className={styles.errorMessage}>{error}</p>}
                {successMessage && (
                    <p className={styles.successMessage}>{successMessage}</p>
                )}
            </div>

            {/* Use your ".button" class */}
            <button
                type="submit"
                disabled={isSubmitting}
                className={styles.button}
            >
                {isSubmitting ? "Añadiendo..." : "Añadir Posición"}
            </button>
        </form>
    );
};

export default AddPositionForm;
