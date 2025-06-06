// src/components/AuthForms.tsx
import React, { useState } from "react";
import { auth } from "../firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "firebase/auth";
import styles from "./AuthForms.module.css";

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
        } catch (error: any) {
            setSignupMessage(`Error: ${error.code}`);
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
        } catch (error: any) {
            setLoginMessage(`Error: ${error.code}`);
        }
    };

    return (
        <div className={styles.authContainer}>
            <div className={styles.formSection}>
                <h2 className={styles.title}>Registrarse</h2>
                <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className={styles.inputField}
                />
                <input
                    type="password"
                    placeholder="Contraseña"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className={styles.inputField}
                />
                <button
                    onClick={handleSignup}
                    className={`${styles.button} ${styles.signupButton}`}
                >
                    Crear Cuenta
                </button>
                <p
                    className={
                        signupMessage ? styles.errorMessage : styles.message
                    }
                >
                    {signupMessage}
                </p>
            </div>

            <div className={styles.formSection}>
                <h2 className={styles.title}>Iniciar Sesión</h2>
                <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className={styles.inputField}
                />
                <input
                    type="password"
                    placeholder="Contraseña"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={styles.inputField}
                />
                <button
                    onClick={handleLogin}
                    className={`${styles.button} ${styles.loginButton}`}
                >
                    Iniciar Sesión
                </button>
                <p
                    className={
                        loginMessage ? styles.errorMessage : styles.message
                    }
                >
                    {loginMessage}
                </p>
            </div>
        </div>
    );
};

export default AuthForms;
