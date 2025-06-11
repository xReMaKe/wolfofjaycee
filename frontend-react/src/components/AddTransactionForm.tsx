// src/components/AddTransactionForm.tsx
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import styles from "./AddTransactionForm.module.css";

interface AddTransactionFormProps {
    portfolioId: string;
}

const AddTransactionForm: React.FC<AddTransactionFormProps> = ({
    portfolioId,
}) => {
    const { currentUser } = useAuth();
    const [symbol, setSymbol] = useState("");
    const [type, setType] = useState<"buy" | "sell">("buy");
    const [quantity, setQuantity] = useState("");
    const [price, setPrice] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(""); // Added for success feedback
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            setError("Debes iniciar sesión para añadir una transacción.");
            return;
        }

        setError("");
        setSuccess("");

        const quantityNum = parseFloat(quantity);
        const priceNum = parseFloat(price);

        if (!symbol || isNaN(quantityNum) || isNaN(priceNum) || !date) {
            setError("Por favor, rellene todos los campos correctamente.");
            return;
        }
        if (quantityNum <= 0 || priceNum < 0) {
            // Allow $0 price, but not quantity
            setError("La cantidad debe ser un número positivo.");
            return;
        }

        setIsSubmitting(true);

        try {
            const docRef = await addDoc(collection(db, "transactions"), {
                userId: currentUser.uid,
                portfolioId,
                symbol: symbol.toUpperCase().trim(),
                type,
                quantity: quantityNum,
                pricePerShare: priceNum,
                transactionDate: new Date(date),
                createdAt: serverTimestamp(),
            });

            console.log("Transaction written with ID: ", docRef.id);
            setSuccess(
                `¡Transacción para ${symbol.toUpperCase().trim()} añadida!`
            );

            // Reset form on successful submission
            setSymbol("");
            setQuantity("");
            setPrice("");
            setDate(new Date().toISOString().split("T")[0]);
            setType("buy");

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Error adding transaction:", err);
            setError(
                "No se pudo añadir la transacción. Por favor, inténtelo de nuevo."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h3 className={styles.title}>Añadir Nueva Transacción</h3>
            {error && <p className={styles.error}>{error}</p>}
            {success && <p className={styles.success}>{success}</p>}{" "}
            {/* Added success message display */}
            <div className={styles.inputGroup}>
                <label htmlFor="symbol">Símbolo (Ticker)</label>
                <input
                    id="symbol"
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="ej. AAPL"
                    required
                />
            </div>
            <div className={styles.inputGroup}>
                <label>Tipo de Transacción</label>
                <div className={styles.radioGroup}>
                    <button
                        type="button"
                        onClick={() => setType("buy")}
                        className={type === "buy" ? styles.active : ""}
                    >
                        Comprar
                    </button>
                    <button
                        type="button"
                        onClick={() => setType("sell")}
                        className={type === "sell" ? styles.active : ""}
                    >
                        Vender
                    </button>
                </div>
            </div>
            <div className={styles.row}>
                <div className={styles.inputGroup}>
                    <label htmlFor="quantity">Cantidad</label>
                    <input
                        id="quantity"
                        type="number"
                        step="any"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="ej. 10"
                        required
                    />
                </div>
                <div className={styles.inputGroup}>
                    <label htmlFor="price">Precio por Acción</label>
                    <input
                        id="price"
                        type="number"
                        step="any"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="ej. 150.25"
                        required
                    />
                </div>
            </div>
            <div className={styles.inputGroup}>
                <label htmlFor="date">Fecha de Transacción</label>
                <input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                />
            </div>
            <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting}
            >
                {isSubmitting ? "Añadiendo..." : "Añadir Transacción"}
            </button>
        </form>
    );
};

export default AddTransactionForm;
