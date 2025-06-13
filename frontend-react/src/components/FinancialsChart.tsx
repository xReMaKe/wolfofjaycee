// frontend-react/src/components/FinancialsChart.tsx

import { useState, useMemo, useEffect } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import styles from "./FinancialsChart.module.css";

// --- Helper Functions and Types ---
const formatLargeNumber = (num: number): string => {
    if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(2) + "T";
    if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toString();
};

const Custom3DBar = (props: any) => {
    const { x, y, width, height, fill } = props;
    const topHeight = 6;
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

const FinancialsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className={styles.customTooltip}>
                <p className={styles.label}>{label}</p>
                <p className={styles.intro}>
                    Value: {formatLargeNumber(payload[0].value)}
                </p>
            </div>
        );
    }
    return null;
};

const FINANCIAL_METRICS = [
    {
        value: "revenue",
        label: "Total Revenue",
        concept: "Revenues",
        statement: "ic",
    },
    {
        value: "grossProfit",
        label: "Gross Profit",
        concept: "GrossProfit",
        statement: "ic",
    },
    {
        value: "operatingIncome",
        label: "Operating Income",
        concept: "OperatingIncomeLoss",
        statement: "ic",
    },
    {
        value: "netIncome",
        label: "Net Income",
        concept: "NetIncomeLoss",
        statement: "ic",
    },
    {
        value: "totalAssets",
        label: "Total Assets",
        concept: "Assets",
        statement: "bs",
    },
    {
        value: "totalLiabilities",
        label: "Total Liabilities",
        concept: "Liabilities",
        statement: "bs",
    },
    {
        value: "operatingCashFlow",
        label: "Operating Cash Flow",
        concept: "NetCashProvidedByUsedInOperatingActivities",
        statement: "cf",
    },
];

interface FinnhubFinancialReport {
    period: string;
    year: number;
    fiscalYear: number;
    report: { bs?: any[]; ic?: any[]; cf?: any[] };
}
interface FinancialsChartProps {
    data: FinnhubFinancialReport[];
}
type ViewMode = "annual" | "quarterly";

// --- Main Component ---
export const FinancialsChart = ({ data }: FinancialsChartProps) => {
    const [viewMode, setViewMode] = useState<ViewMode>("annual");
    const [selectedMetric, setSelectedMetric] = useState(
        FINANCIAL_METRICS[0].value
    );
    const [tickColor, setTickColor] = useState("#888");

    useEffect(() => {
        const computedColor = getComputedStyle(document.documentElement)
            .getPropertyValue("--color-text-chart")
            .trim();
        if (computedColor) setTickColor(computedColor);
    }, []);

    // --- THIS IS THE CORRECTED DATA PROCESSING LOGIC ---
    // In frontend-react/src/components/FinancialsChart.tsx

    // --- REPLACE YOUR CURRENT useMemo WITH THIS DEBUGGING VERSION ---
    const processedData = useMemo(() => {
        console.log("--- Starting FinancialsChart Data Processing ---");
        console.log(
            "[0] Current ViewMode:",
            viewMode,
            "|| Selected Metric:",
            selectedMetric
        );

        if (!data || !Array.isArray(data) || data.length === 0) {
            console.log("[!] Exiting: Raw data prop is empty or invalid.");
            return [];
        }
        console.log("[1] Raw data prop received:", data);

        const metricInfo = FINANCIAL_METRICS.find(
            (m) => m.value === selectedMetric
        );
        if (!metricInfo) {
            console.log(
                "[!] Exiting: Could not find metric info for",
                selectedMetric
            );
            return [];
        }

        const { concept, statement } = metricInfo;
        console.log(
            `[i] Processing for concept: "${concept}" in statement: "${statement}"`
        );

        const step1_filteredByView = data.filter((report) =>
            viewMode === "annual"
                ? report.fiscalYear !== 0
                : report.fiscalYear === 0
        );
        console.log("[2] After filtering by view mode:", step1_filteredByView);

        const step2_mappedToValues = step1_filteredByView.map((report) => {
            const financialStatement =
                report.report[statement as keyof typeof report.report];
            if (!financialStatement) return null;
            const metricData = financialStatement.find(
                (item: any) => item.concept === concept
            );
            return {
                name:
                    viewMode === "annual"
                        ? report.year.toString()
                        : report.period,
                value: metricData?.value ?? 0,
            };
        });
        console.log(
            "[3] After mapping to name/value pairs:",
            step2_mappedToValues
        );

        const step3_finalFilter = step2_mappedToValues.filter(
            (item) => item !== null && item.value !== 0
        );
        console.log(
            "[4] After filtering out nulls and zero values:",
            step3_finalFilter
        );

        const finalData = step3_finalFilter.slice(0, 8).reverse();
        console.log("[5] Final data being sent to chart:", finalData);
        console.log("--- End of FinancialsChart Data Processing ---");

        return finalData as { name: string; value: number }[];
    }, [data, viewMode, selectedMetric]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Financials</h3>
                <div className={styles.controls}>
                    <div className={styles.toggleGroup}>
                        <button
                            className={`${styles.toggleButton} ${
                                viewMode === "annual" ? styles.active : ""
                            }`}
                            onClick={() => setViewMode("annual")}
                        >
                            Annual
                        </button>
                        <button
                            className={`${styles.toggleButton} ${
                                viewMode === "quarterly" ? styles.active : ""
                            }`}
                            onClick={() => setViewMode("quarterly")}
                        >
                            Quarterly
                        </button>
                    </div>
                    <select
                        className={styles.select}
                        value={selectedMetric}
                        onChange={(e) => setSelectedMetric(e.target.value)}
                    >
                        {FINANCIAL_METRICS.map((metric) => (
                            <option key={metric.value} value={metric.value}>
                                {metric.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className={styles.chartContainer}>
                {processedData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={processedData}
                            margin={{ top: 15, right: 30, left: 20, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient
                                    id="bar-main-gradient"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor="#4382f7"
                                        stopOpacity={0.9}
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor="#2c5ae9"
                                        stopOpacity={1}
                                    />
                                </linearGradient>
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
                                tickFormatter={formatLargeNumber}
                                tick={{ fontSize: 12, fill: tickColor }}
                            />
                            <Tooltip
                                content={<FinancialsTooltip />}
                                cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                            />
                            <Bar
                                dataKey="value"
                                fill="url(#bar-main-gradient)"
                                shape={<Custom3DBar />}
                                animationDuration={1200}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p>No data available for this view.</p>
                )}
            </div>
        </div>
    );
};
