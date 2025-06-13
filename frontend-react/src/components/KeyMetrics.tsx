// frontend-react/src/components/KeyMetrics.tsx

import styles from "./KeyMetrics.module.css";

// Define the shape of the props we expect
interface KeyMetricsProps {
    profile: {
        name?: string;
        ticker?: string;
        logo?: string;
        finnhubIndustry?: string;
    };
    metrics: {
        marketCapitalization?: number;
        peNormalizedAnnual?: number;
        epsNormalizedAnnual?: number;
        dividendYieldIndicatedAnnual?: number;
        "52WeekHigh"?: number;
        "52WeekLow"?: number;
    };
}

// A helper function to format large numbers into billions/millions
const formatMarketCap = (num: number) => {
    if (num >= 1_000_000_000_000) {
        return (num / 1_000_000_000_000).toFixed(2) + "T";
    }
    if (num >= 1_000_000_000) {
        return (num / 1_000_000_000).toFixed(2) + "B";
    }
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(2) + "M";
    }
    return num?.toString() ?? "N/A";
};

const MetricItem = ({
    label,
    value,
}: {
    label: string;
    value: string | number | undefined | null;
}) => {
    const displayValue =
        value === null || value === undefined || value === 0 ? "N/A" : value;
    return (
        <div className={styles.metricItem}>
            <span className={styles.label}>{label}</span>
            <span className={styles.value}>{displayValue}</span>
        </div>
    );
};

export const KeyMetrics = ({ profile, metrics }: KeyMetricsProps) => {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.identity}>
                    {profile.logo && (
                        <img
                            src={profile.logo}
                            alt={`${profile.name} logo`}
                            className={styles.logo}
                        />
                    )}
                    <div className={styles.nameContainer}>
                        <h1 className={styles.name}>
                            {profile.name || "Company"}
                        </h1>
                        <span className={styles.ticker}>
                            {profile.ticker || "SYMBOL"}
                        </span>
                    </div>
                </div>
                <div className={styles.industry}>
                    {profile.finnhubIndustry || "N/A"}
                </div>
            </div>

            <div className={styles.metricsGrid}>
                <MetricItem
                    label="Market Cap"
                    value={
                        metrics.marketCapitalization
                            ? formatMarketCap(
                                  metrics.marketCapitalization * 1_000_000
                              )
                            : "N/A"
                    }
                />
                <MetricItem
                    label="P/E Ratio"
                    value={metrics.peNormalizedAnnual?.toFixed(2)}
                />
                <MetricItem
                    label="EPS"
                    value={metrics.epsNormalizedAnnual?.toFixed(2)}
                />
                <MetricItem
                    label="Dividend Yield"
                    value={
                        metrics.dividendYieldIndicatedAnnual
                            ? `${metrics.dividendYieldIndicatedAnnual.toFixed(
                                  2
                              )}%`
                            : "N/A"
                    }
                />
                <MetricItem
                    label="52-Week High"
                    value={metrics["52WeekHigh"]?.toFixed(2)}
                />
                <MetricItem
                    label="52-Week Low"
                    value={metrics["52WeekLow"]?.toFixed(2)}
                />
            </div>
        </div>
    );
};
