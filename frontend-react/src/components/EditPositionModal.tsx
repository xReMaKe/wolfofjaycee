// src/components/EditPositionModal.tsx
import React, { useState, useEffect } from "react";
import styles from "./EditPositionModal.module.css";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";

interface Position {
    id: string;
    symbol: string;
    quantity: number;
    costBasisPerShare: number;
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    position: Position | null;
}

const EditPositionModal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    position,
}) => {
    const [quantity, setQuantity] = useState("");
    const [costBasis, setCostBasis] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        // When the modal opens, pre-fill the form with the position's current data
        if (position) {
            setQuantity(String(position.quantity));
            setCostBasis(String(position.costBasisPerShare));
        }
    }, [position]);

    if (!isOpen || !position) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const numQuantity = parseFloat(quantity);
        const numCostBasis = parseFloat(costBasis);

        if (
            isNaN(numQuantity) ||
            numQuantity <= 0 ||
            isNaN(numCostBasis) ||
            numCostBasis < 0
        ) {
            setError("Por favor, introduce valores numéricos válidos.");
            return;
        }

        setIsSubmitting(true);
        const positionRef = doc(db, "positions", position.id);

        try {
            await updateDoc(positionRef, {
                quantity: numQuantity,
                costBasisPerShare: numCostBasis,
            });
            onClose(); // Close the modal on success
        } catch (err) {
            console.error("Error updating position:", err);
            setError("No se pudo actualizar la posición.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.title}>
                    Editar Posición: {position.symbol}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="quantity">Cantidad</label>
                        <input
                            id="quantity"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            step="any"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="costBasis">Costo Base por Acción</label>
                        <input
                            id="costBasis"
                            type="number"
                            value={costBasis}
                            onChange={(e) => setCostBasis(e.target.value)}
                            step="any"
                        />
                    </div>
                    {error && <p className={styles.error}>{error}</p>}
                    <div className={styles.buttonGroup}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={styles.cancelButton}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={styles.saveButton}
                        >
                            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPositionModal;
