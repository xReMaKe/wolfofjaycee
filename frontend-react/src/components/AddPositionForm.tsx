// frontend-react/src/components/AddPositionForm.tsx
import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { User } from "firebase/auth";
import styles from "./AddPositionForm.module.css"; // Import the CSS module

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
    const [symbol, setSymbol] = useState("");
    const [quantity, setQuantity] = useState("");
    const [costBasisPerShare, setCostBasisPerShare] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        setError(null);

        const parsedQuantity = parseFloat(quantity);
        const parsedCostBasis = parseFloat(costBasisPerShare);

        if (
            !symbol.trim() ||
            isNaN(parsedQuantity) ||
            parsedQuantity <= 0 ||
            isNaN(parsedCostBasis) ||
            parsedCostBasis < 0
        ) {
            setError(
                "Por favor, ingresa un símbolo válido, una cantidad (>0) y un costo base (>=0)."
            );
            setLoading(false);
            return;
        }

        try {
            await addDoc(collection(db, "positions"), {
                symbol: symbol.toUpperCase(),
                quantity: parsedQuantity,
                costBasisPerShare: parsedCostBasis,
                portfolioId: portfolioId,
                userId: currentUser.uid,
                createdAt: new Date(),
            });
            setMessage("Posición añadida exitosamente!");
            setSymbol("");
            setQuantity("");
            setCostBasisPerShare("");
            onPositionAdded();
        } catch (err: any) {
            console.error("Error al añadir posición:", err);
            setError(`Error al añadir posición: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // The inline style constants have been removed.

    return (
        <div>
            <h4 className={styles.title}>Añadir Nueva Posición</h4>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputGrid}>
                    <input
                        type="text"
                        placeholder="Símbolo (ej. AAPL)"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        required
                        className={styles.input}
                        disabled={loading}
                    />
                    <input
                        type="number"
                        placeholder="Cantidad"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                        min="0.000001"
                        step="any"
                        className={styles.input}
                        disabled={loading}
                    />
                    <input
                        type="number"
                        placeholder="Costo Base por Acción"
                        value={costBasisPerShare}
                        onChange={(e) => setCostBasisPerShare(e.target.value)}
                        required
                        min="0"
                        step="any"
                        className={styles.input}
                        disabled={loading}
                    />
                </div>
                <button
                    type="submit"
                    className={styles.button}
                    disabled={loading}
                >
                    {loading ? "Añadiendo..." : "Añadir Posición"}
                </button>
                {message && <p className={styles.successMessage}>{message}</p>}
                {error && <p className={styles.errorMessage}>{error}</p>}
            </form>
        </div>
    );
};

export default AddPositionForm;
