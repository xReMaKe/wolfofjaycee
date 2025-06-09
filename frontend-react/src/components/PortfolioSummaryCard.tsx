// src/components/PortfolioSummaryCard.tsx

import React from "react";
import styles from "./PortfolioSummaryCard.module.css";
import { ResponsiveContainer, AreaChart, Area, XAxis } from "recharts";

// Update the props to accept the new history array
interface HistoryPoint {
    timestamp: { seconds: number }; // We only need the timestamp for the chart
    value: number;
}
interface PortfolioSummaryCardProps {
    totalValue: number;
    history: HistoryPoint[];
    isLoading: boolean;
}

const PortfolioSummaryCard: React.FC<PortfolioSummaryCardProps> = ({
    totalValue,
    history,
    isLoading,
}) => {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(value);

    // --- NEW: Calculate 24h change ---
    let changeValue = 0;
    let changePercentage = 0;
    // Find a data point from roughly 24 hours ago (20-28 hours)
    const twentyFourHoursAgo = Date.now() / 1000 - 24 * 60 * 60;
    const previousPoint = history
        .slice() // Create a copy to not mutate the original
        .reverse()
        .find((p) => p.timestamp.seconds < twentyFourHoursAgo);

    if (previousPoint && previousPoint.value > 0) {
        changeValue = totalValue - previousPoint.value;
        changePercentage = (changeValue / previousPoint.value) * 100;
    }

    const changeClass =
        changeValue >= 0 ? styles.changePositive : styles.changeNegative;

    if (isLoading) {
        // Loading state remains the same
        return <div className={styles.card}> ... </div>;
    }

    return (
        <div className={styles.card}>
            <div className={styles.mainStats}>
                <div className={styles.totalValue}>
                    {formatCurrency(totalValue)}
                </div>
                <div className={styles.label}>Valor Total del Portafolio</div>
            </div>

            {/* NEW: Render the 24h change */}
            <div className={`${styles.changeContainer} ${changeClass}`}>
                {changeValue >= 0 ? "+" : ""}
                {formatCurrency(changeValue)} ({changePercentage.toFixed(2)}%)
                Hoy
            </div>

            {/* NEW: Render the sparkline chart */}
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={history}>
                        <defs>
                            <linearGradient
                                id="sparklineColor"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor={
                                        changeValue >= 0 ? "#4ade80" : "#f87171"
                                    }
                                    stopOpacity={0.4}
                                />
                                <stop
                                    offset="95%"
                                    stopColor={
                                        changeValue >= 0 ? "#4ade80" : "#f87171"
                                    }
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={changeValue >= 0 ? "#4ade80" : "#f87171"}
                            strokeWidth={2}
                            fill="url(#sparklineColor)"
                        />
                        {/* Hide the XAxis visually but keep it for structure */}
                        <XAxis dataKey="timestamp.seconds" hide={true} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PortfolioSummaryCard;
