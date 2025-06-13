// frontend-react/src/components/EarningsChart.tsx

import { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import styles from "./EarningsChart.module.css";

/* ───────── Types ───────── */
interface Earning {
    actual: number;
    estimate: number;
    period: string;
    // ... other properties
}
interface EarningsChartProps {
    data: Earning[];
}

/* ───────── Tooltip ───────── */
const CustomTooltip = ({ active, payload, label }: any) =>
    active && payload?.length ? (
        <div className={styles.customTooltip}>
            <p className={styles.label}>{label}</p>
            <p
                className={styles.intro}
                style={{ color: "var(--color-primary)" }}
            >
                Actual: {payload[0].value.toFixed(2)}
            </p>
            <p
                className={styles.intro}
                style={{ color: "var(--color-accent-secondary)" }}
            >
                Estimate: {payload[1].value.toFixed(2)}
            </p>
        </div>
    ) : null;

/* ───────── Main Component ───────── */
export const EarningsChart = ({ data }: EarningsChartProps) => {
    const [tickColor, setTickColor] = useState("#888"); // Start with a default fallback color

    useEffect(() => {
        // This effect runs once on the client-side after the component mounts
        // and safely gets the real value of the CSS variable.
        const computedColor = getComputedStyle(document.documentElement)
            .getPropertyValue("--color-text-chart")
            .trim();
        if (computedColor) {
            setTickColor(computedColor);
        }
    }, []); // Empty array ensures it runs only once

    if (!data?.length) {
        return (
            <div className={styles.container}>
                <h3 className={styles.title}>Earnings Surprise</h3>
                <p className={styles.noData}>No earnings data available.</p>
            </div>
        );
    }

    const chartData = data
        .slice(0, 4)
        .reverse()
        .map((e) => ({
            name: e.period,
            Actual: e.actual,
            Estimate: e.estimate,
        }));

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>Earnings Surprise (EPS)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                    />

                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: tickColor }} // Apply the computed color here
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: tickColor }} // And here
                    />

                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    />

                    <Legend
                        wrapperStyle={{
                            fontSize: "14px",
                            color: "var(--color-text-secondary)", // This works fine as it styles a normal DIV
                            paddingTop: "20px",
                        }}
                    />

                    <Bar
                        dataKey="Actual"
                        fill="var(--color-primary)"
                        animationDuration={800}
                    />
                    <Bar
                        dataKey="Estimate"
                        fill="var(--color-accent-secondary)"
                        animationDuration={800}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
