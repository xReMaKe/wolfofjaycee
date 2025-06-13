// frontend-react/src/pages/StockDetailPage.tsx

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styles from "./StockDetailPage.module.css";
import { getFunctions, httpsCallable } from "firebase/functions";

// Cleaned up imports
import { KeyMetrics } from "@/components/KeyMetrics";
import { EarningsChart } from "@/components/EarningsChart";
import { FinancialsChart } from "@/components/FinancialsChart";

// Type definitions remain the same
interface CompanyProfile {
    name: string;
    ticker: string;
    logo: string;
    finnhubIndustry: string;
    [key: string]: any;
}
interface Earning {
    actual: number;
    estimate: number;
    period: string;
    [key: string]: any;
}
interface FinnhubFinancialReport {
    period: string;
    year: number;
    fiscalYear: number;
    report: {
        bs?: any[];
        ic?: any[];
        cf?: any[];
    };
}
interface FundamentalsData {
    symbol: string;
    profile: CompanyProfile;
    metrics: { [key: string]: any };
    earnings: Earning[];
    financials: FinnhubFinancialReport[];
}

const StockDetailPage = () => {
    const { symbol } = useParams<{ symbol: string }>();
    const [fundamentals, setFundamentals] = useState<FundamentalsData | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // ... fetch logic is unchanged ...
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
                <div className={styles.contentGrid}>
                    <KeyMetrics
                        profile={fundamentals.profile}
                        metrics={fundamentals.metrics}
                    />
                    {/* --- This now correctly uses the newly upgraded EarningsChart --- */}
                    <EarningsChart data={fundamentals.earnings} />
                    <FinancialsChart data={fundamentals.financials} />
                </div>
            )}
        </div>
    );
};

export default StockDetailPage;
