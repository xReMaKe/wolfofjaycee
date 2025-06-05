// frontend-react/src/App.tsx
// Corrected imports for React hooks
import { useState, useEffect } from "react"; // ADD useState and useEffect here
import "./App.css";
import { useAuth } from "./contexts/AuthContext";
import AuthForms from "./components/AuthForms";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebase"; // Ensure 'db' is here
import { collection, query, where, getDocs } from "firebase/firestore"; // Firestore imports
import PortfolioDetail from "./components/PortfolioDetail"; // NEW: Import PortfolioDetail
import AddPortfolioForm from "./components/AddPortfolioForm";

// Define an interface for your Portfolio data structure
interface Portfolio {
    id: string;
    name: string;
    description?: string; // Optional field
    userId: string;
    // Add other fields present in your Firestore 'portfolios' documents
}

function App() {
    const { currentUser, loading } = useAuth();
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]); // Type state as Portfolio[]
    const [refreshTrigger, setRefreshTrigger] = useState(0); // NEW: State to trigger refresh
    const handleLogout = async () => {
        try {
            await signOut(auth);
            console.log("Sesión cerrada.");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };

    // …inside useEffect…

    useEffect(() => {
        const fetchPortfolios = async () => {
            if (currentUser) {
                try {
                    const q = query(
                        collection(db, "portfolios"),
                        where("userId", "==", currentUser.uid)
                    );
                    const querySnapshot = await getDocs(q);

                    const fetchedPortfolios = querySnapshot.docs.map((doc) => {
                        const data = doc.data() as Portfolio;
                        return {
                            ...data,
                            id: doc.id, // overwrite any “id” in data
                        };
                    });

                    setPortfolios(fetchedPortfolios);
                    console.log("Portfolios fetched:", fetchedPortfolios);
                } catch (error) {
                    // ← THIS CATCH BLOCK WAS MISSING
                    console.error("Error fetching portfolios:", error);
                }
            } else {
                setPortfolios([]); // Clear portfolios if user logs out
            }
        };

        fetchPortfolios();
    }, [currentUser, refreshTrigger]);
    const handlePortfolioAdded = () => {
        // NEW: Callback function for form
        setRefreshTrigger((prev) => prev + 1); // Increment to trigger useEffect
    };

    if (loading) {
        return (
            <div
                style={{
                    textAlign: "center",
                    padding: "50px",
                    background: "#1c1c1c",
                    color: "white",
                    height: "100vh",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                Cargando autenticación...
            </div>
        );
    }

    return (
        <div className="App">
            <header
                className="App-header"
                style={{
                    background: "#282c34",
                    color: "white",
                    padding: "20px",
                    textAlign: "center",
                }}
            >
                <h1>WolfOfJayCee Finanzas</h1>
                <p>Visualiza tu Riqueza</p>
                <div
                    style={{ position: "absolute", top: "10px", right: "20px" }}
                >
                    {currentUser ? (
                        <span style={{ marginRight: "10px" }}>
                            Bienvenido, {currentUser.email}
                        </span>
                    ) : (
                        <span>No ha iniciado sesión.</span>
                    )}
                </div>
            </header>

            <main
                style={{
                    padding: "20px",
                    maxWidth: "800px",
                    margin: "auto",
                    background: "#1c1c1c",
                    color: "white",
                    borderRadius: "8px",
                }}
            >
                {currentUser ? (
                    <div id="logged-in-content">
                        <h2
                            style={{
                                textAlign: "center",
                                marginBottom: "20px",
                            }}
                        >
                            Tu Portafolio
                        </h2>
                        <p
                            style={{
                                textAlign: "center",
                                fontSize: "small",
                                opacity: 0.7,
                            }}
                        >
                            Tu UID: {currentUser.uid}
                        </p>{" "}
                        {/* Keep UID display here for now */}
                        {portfolios.length > 0 ? (
                            <div>
                                <h3 style={{ textAlign: "center" }}>
                                    Tus Portafolios:
                                </h3>
                                <ul>
                                    {portfolios.map(
                                        (
                                            portfolio: Portfolio // Type portfolio parameter
                                        ) => (
                                            <li
                                                key={portfolio.id}
                                                style={{
                                                    marginBottom: "10px",
                                                    padding: "10px",
                                                    background: "#282c34",
                                                    borderRadius: "5px",
                                                }}
                                            >
                                                <strong>
                                                    {portfolio.name}
                                                </strong>{" "}
                                                (
                                                {portfolio.description ||
                                                    "Sin descripción"}
                                                )
                                            </li>
                                        )
                                    )}
                                </ul>
                                {/* NEW: Render PortfolioDetail for the first portfolio found */}
                                {portfolios[0] &&
                                    currentUser && ( // Ensure portfolio and user exist
                                        <PortfolioDetail
                                            portfolioId={portfolios[0].id}
                                            currentUser={currentUser}
                                        />
                                    )}
                                {/* END NEW */}
                            </div>
                        ) : (
                            <p style={{ textAlign: "center" }}>
                                No tienes portafolios creados todavía.
                            </p>
                        )}
                        {/* NEW: Render AddPortfolioForm */}
                        {currentUser && (
                            <AddPortfolioForm
                                currentUser={currentUser}
                                onPortfolioAdded={handlePortfolioAdded}
                            />
                        )}
                        {/* END NEW */}
                        <button
                            onClick={handleLogout}
                            style={{
                                padding: "10px 15px",
                                backgroundColor: "#f44336",
                                color: "white",
                                border: "none",
                                cursor: "pointer",
                                borderRadius: "5px",
                                display: "block",
                                margin: "20px auto",
                            }}
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                ) : (
                    <div id="logged-out-content">
                        <AuthForms />
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
