// src/components/PremiumSummaryCard.tsx
import React from "react";
import PerformanceChart from "./charts/PerformanceChart";
import styles from "./PortfolioSummaryCard.module.css";

interface PremiumSummaryCardProps {
    totalValue: number;
    history: { value: number; timestamp: { seconds: number } }[];
    isLoading: boolean;
}

const PremiumSummaryCard: React.FC<PremiumSummaryCardProps> = ({
    totalValue,
    history,
    isLoading,
}) => {
    if (isLoading) {
        return <div className={styles.card}>Cargando…</div>;
    }

    /* ---------- 24-hour change ---------- */
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const firstPoint =
        [...history]
            .reverse()
            .find((p) => p.timestamp.seconds * 1000 < twentyFourHoursAgo) ??
        history[0];

    const change = totalValue - firstPoint.value;
    const percent = (change / firstPoint.value) * 100 || 0;
    const changeClass =
        change >= 0 ? styles.changePositive : styles.changeNegative;

    /* ---------- Mark-up ---------- */
    return (
        <div className={styles.card}>
            {/* ✨ keep the original class name so the CSS rule still matches */}
            <div className={styles.summary}>
                <h2 className={styles.totalValue}>
                    {totalValue.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                    })}
                </h2>

                <p className={`${styles.change} ${changeClass}`}>
                    {change.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        signDisplay: "always",
                    })}{" "}
                    ({percent.toFixed(2)}%){" "}
                    <span className={styles.hoyLabel}>Hoy</span>
                </p>
            </div>

            {/* selector .summary + .chartContainer now matches again → fixed height */}
            <div className={styles.chartContainer}>
                <PerformanceChart />
            </div>
        </div>
    );
};

export default PremiumSummaryCard;
