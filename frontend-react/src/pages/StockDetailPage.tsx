// frontend-react/src/pages/StockDetailPage.tsx

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styles from "./StockDetailPage.module.css";
import { getFunctions, httpsCallable } from "firebase/functions";
import { EarningsChart } from "@/components/EarningsChart";
// --- Import our new component ---
import { KeyMetrics } from "@/components/KeyMetrics";

// (The interface definitions from the previous step remain the same)
interface CompanyProfile {
    country: string;
    currency: string;
    exchange: string;
    name: string;
    ticker: string;
    ipo: string;
    marketCapitalization: number;
    shareOutstanding: number;
    logo: string;
    phone: string;
    weburl: string;
    finnhubIndustry: string;
}
interface Financials {
    [key: string]: any;
}
interface Earning {
    actual: number;
    estimate: number;
    period: string;
    quarter: number;
    surprise: number;
    surprisePercent: number;
    symbol: string;
    year: number;
}
interface FundamentalsData {
    symbol: string;
    profile: CompanyProfile;
    metrics: { [key: string]: any }; // Let's be a bit more flexible here
    financials: Financials[];
    earnings: Earning[];
}

const StockDetailPage = () => {
    const { symbol } = useParams<{ symbol: string }>();
    const [fundamentals, setFundamentals] = useState<FundamentalsData | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFundamentals = async () => {
            if (!symbol) return;

            setIsLoading(true);
            setError(null);
            try {
                const functions = getFunctions();
                const getStockFundamentals = httpsCallable<
                    { symbol: string },
                    FundamentalsData
                >(functions, "getStockFundamentals");
                const result = await getStockFundamentals({ symbol });

                // Add a check to ensure we got data back
                if (!result.data || !result.data.profile) {
                    throw new Error("Incomplete data received from API.");
                }

                setFundamentals(result.data);
            } catch (err) {
                console.error("Error fetching stock fundamentals:", err);
                setError(
                    "Could not load company data. Please try again later."
                );
            } finally {
                setIsLoading(false);
            }
        };

        fetchFundamentals();
    }, [symbol]);

    return (
        <div className={styles.pageContainer}>
            {isLoading && (
                <div className={styles.loading}>Loading Financial Data...</div>
            )}

            {error && <div className={styles.error}>{error}</div>}

            {!isLoading && !error && fundamentals && (
                // --- THIS IS THE MAIN CHANGE ---
                // We're now rendering our new component instead of just the h1
                <div className={styles.contentGrid}>
                    <KeyMetrics
                        profile={fundamentals.profile}
                        metrics={fundamentals.metrics}
                    />
                    {/* The other widgets will go here later */}
                    <EarningsChart data={fundamentals.earnings} />
                </div>
            )}
        </div>
    );
};

export default StockDetailPage;
