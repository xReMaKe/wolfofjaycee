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

// --- Helper Components ---
const Custom3DBar = (props: any) => {
    const { x, y, width, height, fill } = props;
    const topHeight = 3; // The new, subtle 3D depth
    if (height <= 0) return null;
    return (
        <g>
            <rect x={x} y={y} width={width} height={height} fill={fill} />
            <path
                d={`M${x},${y} L${x + topHeight},${y - topHeight} L${
                    x + width + topHeight
                },${y - topHeight} L${x + width},${y} Z`}
                fill="url(#bar-top-gradient)"
            />
        </g>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className={styles.customTooltip}>
                <p className={styles.label}>{`${label}`}</p>
                <p
                    className={styles.intro}
                    style={{ color: "var(--color-primary)" }}
                >
                    {`Actual: ${payload[0].value.toFixed(2)}`}
                </p>
                <p
                    className={styles.intro}
                    style={{ color: "var(--color-accent-secondary)" }}
                >
                    {`Estimate: ${payload[1].value.toFixed(2)}`}
                </p>
            </div>
        );
    }
    return null;
};

// --- Type Definitions ---
interface Earning {
    actual: number;
    estimate: number;
    period: string;
    [key: string]: any;
}
interface EarningsChartProps {
    data: Earning[];
}

// --- Main Component ---
export const EarningsChart = ({ data }: EarningsChartProps) => {
    // NOTE: Name is now correct
    const [tickColor, setTickColor] = useState("#888");

    useEffect(() => {
        const computedColor = getComputedStyle(document.documentElement)
            .getPropertyValue("--color-text-chart")
            .trim();
        if (computedColor) setTickColor(computedColor);
    }, []);

    const chartData =
        data
            ?.slice(0, 4)
            .reverse()
            .map((e) => ({
                name: e.period,
                Actual: e.actual,
                Estimate: e.estimate,
            })) || [];

    if (!data || data.length === 0) {
        return (
            <div className={styles.container}>
                <h3 className={styles.title}>Earnings Surprise</h3>
                <p className={styles.noData}>No earnings data available.</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>Earnings Surprise (EPS)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart
                    data={chartData}
                    margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
                >
                    <defs>
                        <linearGradient
                            id="bar-top-gradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor="#213d78"
                                stopOpacity={0.8}
                            />
                            <stop
                                offset="100%"
                                stopColor="#1a2e5a"
                                stopOpacity={1}
                            />
                        </linearGradient>
                        <linearGradient
                            id="actual-bar-gradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop offset="0%" stopColor="hsl(265, 100%, 80%)" />
                            <stop
                                offset="100%"
                                stopColor="hsl(265, 90%, 65%)"
                            />
                        </linearGradient>
                        <linearGradient
                            id="estimate-bar-gradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop offset="0%" stopColor="hsl(200, 100%, 50%)" />
                            <stop
                                offset="100%"
                                stopColor="hsl(200, 75%, 55%)"
                            />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: tickColor }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: tickColor }}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                    />
                    <Legend
                        wrapperStyle={{
                            fontSize: "14px",
                            color: "var(--color-text-chart)",
                            paddingTop: "20px",
                        }}
                    />

                    <Bar
                        dataKey="Actual"
                        fill="url(#actual-bar-gradient)"
                        shape={<Custom3DBar />}
                        animationDuration={800}
                    />
                    <Bar
                        dataKey="Estimate"
                        fill="url(#estimate-bar-gradient)"
                        shape={<Custom3DBar />}
                        animationDuration={800}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
