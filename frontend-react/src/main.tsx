// frontend-react/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css"; // Keep your main index CSS
import { AuthProvider } from "./contexts/AuthContext.tsx"; // Import AuthProvider

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <AuthProvider>
            {" "}
            {/* Wrap App with AuthProvider */}
            <App />
        </AuthProvider>
    </React.StrictMode>
);
