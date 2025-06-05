// frontend-react/src/components/AddPositionForm.tsx
import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore"; // Firestore functions
import { db } from "../firebase"; // Firestore instance
import type { User } from "firebase/auth"; // Firebase User type

interface AddPositionFormProps {
    portfolioId: string;
    currentUser: User;
    onPositionAdded: () => void; // Callback to refresh positions in parent
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
                symbol: symbol.toUpperCase(), // Store symbol in uppercase
                quantity: parsedQuantity,
                costBasisPerShare: parsedCostBasis,
                portfolioId: portfolioId,
                userId: currentUser.uid,
                createdAt: new Date(), // Timestamp
            });
            setMessage("Posición añadida exitosamente!");
            setSymbol("");
            setQuantity("");
            setCostBasisPerShare("");
            onPositionAdded(); // Notify parent to refresh positions
        } catch (err: any) {
            console.error("Error al añadir posición:", err);
            setError(`Error al añadir posición: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        display: "block",
        width: "100%",
        padding: "10px",
        margin: "10px 0",
        borderRadius: "4px",
        border: "1px solid #444",
        backgroundColor: "#333",
        color: "white",
        boxSizing: "border-box",
    };

    const buttonStyle: React.CSSProperties = {
        padding: "10px 15px",
        color: "white",
        border: "none",
        cursor: "pointer",
        borderRadius: "5px",
        width: "100%",
        marginTop: "10px",
    };

    return (
        <div
            style={{
                padding: "20px",
                background: "#282c34",
                borderRadius: "8px",
                marginTop: "30px",
            }}
        >
            <h3 style={{ textAlign: "center", marginBottom: "20px" }}>
                Añadir Nueva Posición
            </h3>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Símbolo (ej. AAPL)"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    required
                    style={inputStyle}
                    disabled={loading}
                />
                <input
                    type="number"
                    placeholder="Cantidad"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    min="1"
                    step="any"
                    style={inputStyle}
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
                    style={inputStyle}
                    disabled={loading}
                />
                <button
                    type="submit"
                    style={{ ...buttonStyle, backgroundColor: "#007bff" }}
                    disabled={loading}
                >
                    {loading ? "Añadiendo..." : "Añadir Posición"}
                </button>
                {message && (
                    <p
                        style={{
                            color: "lightgreen",
                            textAlign: "center",
                            marginTop: "10px",
                        }}
                    >
                        {message}
                    </p>
                )}
                {error && (
                    <p
                        style={{
                            color: "salmon",
                            textAlign: "center",
                            marginTop: "10px",
                        }}
                    >
                        {error}
                    </p>
                )}
            </form>
        </div>
    );
};

export default AddPositionForm;
