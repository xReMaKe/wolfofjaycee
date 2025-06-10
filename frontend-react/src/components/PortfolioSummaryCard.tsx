// src/components/PortfolioSummaryCard.tsx

import React from "react";
import styles from "./PortfolioSummaryCard.module.css";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";

interface FirestoreTimestamp {
    seconds: number;
    nanoseconds: number;
}
interface HistoryPoint {
    timestamp: FirestoreTimestamp;
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
    // --- STEP 1: LOG THE RAW INCOMING DATA ---
    console.log("RAW HISTORY PROPS:", history);
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(value);

    // --- FIX 1: Process the history data before using it ---
    const chartData = history.map((point) => ({
        // Convert the complex timestamp object to a simple number (milliseconds)
        time: point.timestamp.seconds * 1000,
        value: point.value,
    }));

    // --- FIX 2: Update the change calculation to use the new `chartData` ---
    // --- FIX 2 (UPGRADED): A more robust change calculation ---
    let changeValue = 0;
    let changePercentage = 0;

    // We only try to calculate change if there's more than one data point
    if (chartData.length > 1) {
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

        // Try to find a point from ~24 hours ago
        let previousPoint = chartData
            .slice()
            .reverse()
            .find((p) => p.time < twentyFourHoursAgo);

        // If no point from 24h ago is found, just use the very first point in history
        if (!previousPoint) {
            previousPoint = chartData[0];
        }

        // Now, calculate the change based on whichever point we found
        if (previousPoint.value > 0) {
            changeValue = totalValue - previousPoint.value;
            changePercentage = (changeValue / previousPoint.value) * 100;
        }
    }

    const changeClass =
        changeValue >= 0 ? styles.changePositive : styles.changeNegative;

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;

            // --- NEW LOGIC: Calculate gain % relative to the start ---
            const startingValue = chartData[0]?.value;
            let gainPercent = 0;
            if (startingValue && startingValue > 0) {
                gainPercent =
                    ((dataPoint.value - startingValue) / startingValue) * 100;
            }
            const gainClass =
                gainPercent >= 0
                    ? styles.changePositive
                    : styles.changeNegative;
            // --- END OF NEW LOGIC ---

            return (
                <div className={styles.tooltip}>
                    {/* The main value for the hovered point */}
                    <p className={styles.tooltipValue}>
                        {formatCurrency(dataPoint.value)}
                    </p>

                    {/* --- THIS IS THE MISSING PIECE --- */}
                    {/* It only renders if we have a valid starting point to compare against */}
                    {startingValue && (
                        <p
                            className={gainClass}
                            style={{
                                fontSize: "0.9rem",
                                margin: "4px 0 8px 0",
                            }}
                        >
                            {gainPercent >= 0 ? "+" : ""}
                            {gainPercent.toFixed(2)}% total
                        </p>
                    )}
                    {/* --- END OF MISSING PIECE --- */}

                    {/* The date/time label for the hovered point */}
                    <p className={styles.tooltipLabel}>
                        {new Date(dataPoint.time).toLocaleDateString("es-ES", {
                            month: "short",
                            day: "numeric",
                        })}
                        ,{" "}
                        {new Date(dataPoint.time).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </p>
                </div>
            );
        }
        return null;
    };

    // The isLoading state can be simplified since the return is the same structure
    if (isLoading && chartData.length === 0) {
        return (
            <div className={styles.card}>
                <div className={`${styles.totalValue} ${styles.loading}`}>
                    $ --.--
                </div>
                <div className={styles.label}>Valor Total del Portafolio</div>
            </div>
        );
    }

    return (
        <div className={styles.card}>
            <div className={styles.mainStats}>
                <div className={styles.totalValue}>
                    {formatCurrency(totalValue)}
                </div>
                <div className={styles.label}>Valor Total del Portafolio</div>
            </div>

            <div className={`${styles.changeContainer} ${changeClass}`}>
                {changeValue >= 0 ? "+" : ""}
                {formatCurrency(changeValue)} ({changePercentage.toFixed(2)}%)
                Hoy
            </div>

            <div className={styles.chartContainer}>
                {/* Ensure chart only tries to render if there's data to draw */}
                {chartData.length > 1 && (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={chartData}
                            margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
                        >
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
                                            changeValue >= 0
                                                ? "#4ade80"
                                                : "#f87171"
                                        }
                                        stopOpacity={0.4}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={
                                            changeValue >= 0
                                                ? "#4ade80"
                                                : "#f87171"
                                        }
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>

                            {/* FIX 1: Explicitly define the domain for the Y-axis */}
                            {/* This tells the chart to autoscale from slightly below the min value to slightly above the max */}
                            <YAxis
                                domain={["dataMin - 100", "dataMax + 100"]}
                                hide={true}
                            />

                            <XAxis
                                dataKey="time"
                                type="number"
                                domain={["dataMin", "dataMax"]}
                                hide={true}
                            />

                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={
                                    changeValue >= 0 ? "#4ade80" : "#f87171"
                                }
                                strokeWidth={2}
                                fill="url(#sparklineColor)"
                                isAnimationActive={false} // Turn off animation for smoother loading
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{
                                    stroke: "var(--text-secondary)",
                                    strokeWidth: 1,
                                    strokeDasharray: "3 3",
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default PortfolioSummaryCard;
