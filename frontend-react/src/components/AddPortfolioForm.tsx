// frontend-react/src/components/AddPortfolioForm.tsx
import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore"; // Firestore functions
import { db } from "../firebase"; // Firestore instance
import type { User } from "firebase/auth"; // Firebase User type

interface AddPortfolioFormProps {
    currentUser: User;
    onPortfolioAdded: () => void; // Callback to refresh portfolios in parent
}

const AddPortfolioForm: React.FC<AddPortfolioFormProps> = ({
    currentUser,
    onPortfolioAdded,
}) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default form submission
        setLoading(true);
        setMessage("");
        setError(null);

        if (!name.trim()) {
            setError("El nombre del portafolio no puede estar vacío.");
            setLoading(false);
            return;
        }

        try {
            // Add a new document to the 'portfolios' collection
            await addDoc(collection(db, "portfolios"), {
                name: name,
                description: description,
                userId: currentUser.uid, // Link to the current user
                createdAt: new Date(), // Timestamp
            });
            setMessage("Portafolio añadido exitosamente!");
            setName("");
            setDescription("");
            onPortfolioAdded(); // Notify parent to refresh portfolios
        } catch (err: any) {
            console.error("Error al añadir portafolio:", err);
            setError(`Error al añadir portafolio: ${err.message}`);
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
                Añadir Nuevo Portafolio
            </h3>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Nombre del Portafolio"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={inputStyle}
                    disabled={loading}
                />
                <textarea
                    placeholder="Descripción (opcional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    style={inputStyle}
                    disabled={loading}
                ></textarea>
                <button
                    type="submit"
                    style={{ ...buttonStyle, backgroundColor: "#007bff" }}
                    disabled={loading}
                >
                    {loading ? "Añadiendo..." : "Añadir Portafolio"}
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

export default AddPortfolioForm;
