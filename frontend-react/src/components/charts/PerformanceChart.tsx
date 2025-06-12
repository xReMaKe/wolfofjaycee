// frontend-react/src/components/charts/PerformanceChart.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceDot,
    ResponsiveContainer,
} from "recharts";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./PerformanceChart.module.css";

const PerformanceChart: React.FC = () => {
    const { currentUser } = useAuth();
    const [rawHistory, setRawHistory] = useState<any[] | null>(null);

    useEffect(() => {
        if (!currentUser) return;
        const ref = doc(db, "user_summaries", currentUser.uid);
        const unsub = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                setRawHistory(snap.data().history ?? []);
            }
        });
        return () => unsub();
    }, [currentUser]);

    const chartData = useMemo(() => {
        if (!rawHistory || rawHistory.length < 2) return null;
        const sorted = [...rawHistory].sort(
            (a, b) => a.timestamp.seconds - b.timestamp.seconds
        );
        return sorted.map((pt: any, idx: number) => {
            const value: number = pt.value;
            const prev = idx > 0 ? sorted[idx - 1].value : 0;
            return {
                t: pt.timestamp.seconds * 1000,
                value,
                delta: value - prev,
            };
        });
    }, [rawHistory]);

    if (!chartData) return <div className={styles.container}>Loading…</div>;
    if (chartData.length < 2)
        return (
            <div className={styles.container}>
                Awaiting more performance data.
            </div>
        );

    // --- START: NEW REFINEMENTS ---

    // 1. Determine overall trend for dynamic coloring
    const firstValue = chartData[0].value;
    const lastValue = chartData[chartData.length - 1].value;
    const isPositiveTrend = lastValue >= firstValue;

    // 2. Define our elegant color palettes
    const positiveColor = "#38A169"; // A nice, sophisticated green
    const negativeColor = "#E53E3E"; // A clear but not jarring red
    const chartColor = isPositiveTrend ? positiveColor : negativeColor;

    // 3. Find high/low points
    const last24h = chartData.slice(-48);
    const maxPoint = last24h.reduce((max, p) =>
        p.value > max.value ? p : max
    );
    const minPoint = last24h.reduce((min, p) =>
        p.value < min.value ? p : min
    );

    // --- END: NEW REFINEMENTS ---

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
                <defs>
                    <linearGradient
                        id="valueGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        {/* The stopColor is now dynamic */}
                        <stop
                            offset="0%"
                            stopColor={chartColor}
                            stopOpacity={0.4}
                        />
                        <stop
                            offset="90%"
                            stopColor={chartColor}
                            stopOpacity={0}
                        />
                    </linearGradient>
                </defs>

                <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    opacity={0.1}
                />

                <XAxis
                    dataKey="t"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    // The key fix for the crowded axis:
                    interval="preserveStartEnd"
                    tickFormatter={(unix) =>
                        new Date(unix).toLocaleTimeString([], {
                            hour: "numeric",
                            hour12: true,
                        })
                    }
                    tick={{
                        fill: "#A0AEC0",
                        fontSize: 12,
                        fontFamily: "var(--font-primary)",
                    }}
                />

                <YAxis
                    width={70}
                    tickFormatter={(v) =>
                        v.toLocaleString("en-US", {
                            notation: "compact",
                            currency: "USD",
                            style: "currency",
                        })
                    }
                    tick={{
                        fill: "#A0AEC0",
                        fontSize: 12,
                        fontFamily: "var(--font-primary)",
                    }}
                />

                <Tooltip
                    cursor={{
                        stroke: "rgba(255,255,255,0.15)",
                        strokeWidth: 1.5,
                    }}
                    contentStyle={{
                        background: "rgba(20, 22, 36, 0.8)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 12,
                        backdropFilter: "blur(4px)",
                    }}
                    labelFormatter={(unix) =>
                        new Date(unix).toLocaleString([], {
                            weekday: "short",
                            hour: "numeric",
                            minute: "2-digit",
                        })
                    }
                    formatter={(value: number, _name, { payload }) => {
                        const change = payload.delta as number;
                        const changeStyle = {
                            color: change >= 0 ? positiveColor : negativeColor,
                        };
                        return [
                            value.toLocaleString("en-US", {
                                style: "currency",
                                currency: "USD",
                            }),
                            <span style={changeStyle}>
                                Δ {change >= 0 ? "+" : ""}
                                {change.toLocaleString("en-US", {
                                    style: "currency",
                                    currency: "USD",
                                })}
                            </span>,
                        ];
                    }}
                />

                <Area
                    type="monotone"
                    dataKey="value"
                    // The stroke color is now dynamic
                    stroke={chartColor}
                    fill="url(#valueGradient)"
                    strokeWidth={2}
                    dot={false}
                />

                <ReferenceDot
                    x={maxPoint.t}
                    y={maxPoint.value}
                    r={5}
                    fill={positiveColor}
                    stroke="rgba(20,22,36,0.8)"
                    strokeWidth={2}
                />
                <ReferenceDot
                    x={minPoint.t}
                    y={minPoint.value}
                    r={5}
                    fill={negativeColor}
                    stroke="rgba(20,22,36,0.8)"
                    strokeWidth={2}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};

export default PerformanceChart;
