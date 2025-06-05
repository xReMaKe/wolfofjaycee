// frontend-react/src/components/AuthForms.tsx
import React, { useState } from "react";
import { auth } from "../firebase"; // Import the auth instance
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "firebase/auth";

const AuthForms: React.FC = () => {
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [signupMessage, setSignupMessage] = useState("");
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginMessage, setLoginMessage] = useState("");

    const handleSignup = async () => {
        setSignupMessage("");
        if (!signupEmail || !signupPassword) {
            setSignupMessage("Por favor, ingrese correo y contraseña.");
            return;
        }
        try {
            await createUserWithEmailAndPassword(
                auth,
                signupEmail,
                signupPassword
            );
            setSignupMessage("Usuario registrado exitosamente!");
        } catch (error: any) {
            console.error("Error al registrar:", error);
            setSignupMessage(`Error al registrar: ${error.message}`);
        }
    };

    const handleLogin = async () => {
        setLoginMessage("");
        if (!loginEmail || !loginPassword) {
            setLoginMessage("Por favor, ingrese correo y contraseña.");
            return;
        }
        try {
            await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
            setLoginMessage("Sesión iniciada exitosamente!");
        } catch (error: any) {
            console.error("Error al iniciar sesión:", error);
            setLoginMessage(`Error al iniciar sesión: ${error.message}`);
        }
    };

    const inputStyle: React.CSSProperties = {
        display: "block",
        width: "100%",
        padding: "10px",
        margin: "10px 0",
        borderRadius: "4px",
        border: "1px solid #ddd",
        boxSizing: "border-box", // Include padding in width
    };

    const buttonStyle: React.CSSProperties = {
        padding: "10px 15px",
        color: "white",
        border: "none",
        cursor: "pointer",
        borderRadius: "5px",
        width: "100%",
    };

    return (
        <div>
            <h2>Registrarse</h2>
            <input
                type="email"
                placeholder="Correo electrónico"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                style={inputStyle}
            />
            <input
                type="password"
                placeholder="Contraseña"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                style={inputStyle}
            />
            <button
                onClick={handleSignup}
                style={{ ...buttonStyle, backgroundColor: "#4CAF50" }}
            >
                Registrarse
            </button>
            <p style={{ color: "red", marginTop: "10px" }}>{signupMessage}</p>

            <h2 style={{ marginTop: "30px" }}>Iniciar Sesión</h2>
            <input
                type="email"
                placeholder="Correo electrónico"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={inputStyle}
            />
            <input
                type="password"
                placeholder="Contraseña"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={inputStyle}
            />
            <button
                onClick={handleLogin}
                style={{ ...buttonStyle, backgroundColor: "#039be5" }}
            >
                Iniciar Sesión
            </button>
            <p style={{ color: "red", marginTop: "10px" }}>{loginMessage}</p>
        </div>
    );
};

export default AuthForms;
