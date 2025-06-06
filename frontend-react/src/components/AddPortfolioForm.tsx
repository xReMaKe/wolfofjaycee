// frontend-react/src/components/AddPortfolioForm.tsx
import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { User } from "firebase/auth";
import styles from "./AddPortfolioForm.module.css"; // Import the CSS module

interface AddPortfolioFormProps {
    currentUser: User;
    onPortfolioAdded: () => void;
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
        e.preventDefault();
        setLoading(true);
        setMessage("");
        setError(null);

        if (!name.trim()) {
            setError("El nombre del portafolio no puede estar vacío.");
            setLoading(false);
            return;
        }

        try {
            await addDoc(collection(db, "portfolios"), {
                name: name,
                description: description,
                userId: currentUser.uid,
                createdAt: new Date(),
            });
            setMessage("Portafolio añadido exitosamente!");
            setName("");
            setDescription("");
            onPortfolioAdded();
        } catch (err: any) {
            console.error("Error al añadir portafolio:", err);
            setError(`Error al añadir portafolio: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // The inputStyle and buttonStyle constants have been removed.

    return (
        <div className={styles.formContainer}>
            <h3 className={styles.title}>Añadir Nuevo Portafolio</h3>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Nombre del Portafolio"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={styles.input}
                    disabled={loading}
                />
                <textarea
                    placeholder="Descripción (opcional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className={styles.textarea}
                    disabled={loading}
                ></textarea>
                <button
                    type="submit"
                    className={styles.button}
                    disabled={loading}
                >
                    {loading ? "Añadiendo..." : "Añadir Portafolio"}
                </button>
                {message && <p className={styles.successMessage}>{message}</p>}
                {error && <p className={styles.errorMessage}>{error}</p>}
            </form>
        </div>
    );
};

export default AddPortfolioForm;
