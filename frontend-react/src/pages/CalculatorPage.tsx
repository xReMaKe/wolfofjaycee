// src/pages/CalculatorPage.tsx
import React, { useState, useEffect } from "react";
import styles from "./CalculatorPage.module.css";
import {
    ResponsiveContainer,
    AreaChart,
    XAxis,
    YAxis,
    Tooltip,
    Area,
    CartesianGrid,
} from "recharts";

interface ChartDataPoint {
    year: number;
    interest: number;
    totalContributions: number;
}

const CalculatorPage: React.FC = () => {
    // Component state and logic remains the same...
    const [initialInvestment, setInitialInvestment] = useState<number>(25000);
    const [regularContribution, setRegularContribution] = useState<number>(100);
    const [contributionFrequency, setContributionFrequency] =
        useState<number>(12);
    const [interestRate, setInterestRate] = useState<number>(15.1);
    const [compoundingFrequency, setCompoundingFrequency] =
        useState<number>(12);
    const [years, setYears] = useState<number>(20);

    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [finalValue, setFinalValue] = useState<number>(0);
    const [totalContributions, setTotalContributions] = useState<number>(0);
    const [totalInterest, setTotalInterest] = useState<number>(0);

    useEffect(() => {
        const data: ChartDataPoint[] = [];
        let balance = initialInvestment;
        let totalContributed = initialInvestment;

        data.push({ year: 0, totalContributions: balance, interest: 0 });

        for (let year = 1; year <= years; year++) {
            let yearlyInterest = 0;
            for (let i = 0; i < compoundingFrequency; i++) {
                balance +=
                    (regularContribution * contributionFrequency) /
                    compoundingFrequency;
                const interestThisPeriod =
                    balance * (interestRate / 100 / compoundingFrequency);
                balance += interestThisPeriod;
                yearlyInterest += interestThisPeriod;
            }
            totalContributed += regularContribution * contributionFrequency;
            const totalInterestSoFar = balance - totalContributed;
            data.push({
                year: year,
                totalContributions: totalContributed,
                interest: totalInterestSoFar > 0 ? totalInterestSoFar : 0,
            });
        }

        setChartData(data);
        setFinalValue(balance);
        setTotalContributions(totalContributed);
        setTotalInterest(balance - totalContributed);
    }, [
        initialInvestment,
        regularContribution,
        contributionFrequency,
        interestRate,
        compoundingFrequency,
        years,
    ]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const contributions =
                payload.find((p: any) => p.dataKey === "totalContributions")
                    ?.value || 0;
            const interest =
                payload.find((p: any) => p.dataKey === "interest")?.value || 0;
            const totalValue = contributions + interest;

            return (
                <div className={styles.tooltip}>
                    <p className={styles.tooltipLabel}>{`Año ${label}`}</p>
                    <p
                        className={styles.tooltipValue}
                        style={{ color: "#00aaff" }}
                    >{`Aportado: ${formatCurrency(contributions)}`}</p>
                    <p
                        className={styles.tooltipValue}
                        style={{ color: "#a371f7" }}
                    >{`Interés: ${formatCurrency(interest)}`}</p>
                    <hr className={styles.tooltipSeparator} />
                    <p
                        className={styles.tooltipTotal}
                    >{`Valor Total: ${formatCurrency(totalValue)}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={styles.pageContainer}>
            <h1 className={styles.title}>Calculadora de Interés Compuesto</h1>
            <div className={styles.inputPanel}>
                <h2 className={styles.panelTitle}>Parámetros</h2>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label
                            htmlFor="initialInvestment"
                            className={styles.label}
                        >
                            Inversión Inicial ($)
                        </label>
                        <input
                            type="number"
                            id="initialInvestment"
                            value={initialInvestment}
                            onChange={(e) =>
                                setInitialInvestment(
                                    parseFloat(e.target.value) || 0
                                )
                            }
                            className={styles.input}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label
                            htmlFor="regularContribution"
                            className={styles.label}
                        >
                            Aporte Regular ($)
                        </label>
                        <input
                            type="number"
                            id="regularContribution"
                            value={regularContribution}
                            onChange={(e) =>
                                setRegularContribution(
                                    parseFloat(e.target.value) || 0
                                )
                            }
                            className={styles.input}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label
                            htmlFor="contributionFrequency"
                            className={styles.label}
                        >
                            Frecuencia de Aportes
                        </label>
                        <select
                            id="contributionFrequency"
                            value={contributionFrequency}
                            onChange={(e) =>
                                setContributionFrequency(
                                    parseInt(e.target.value)
                                )
                            }
                            className={styles.select}
                        >
                            <option value="12">Mensual</option>
                            <option value="4">Trimestral</option>
                            <option value="1">Anual</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="interestRate" className={styles.label}>
                            Tasa de Interés Anual (%)
                        </label>
                        <input
                            type="number"
                            id="interestRate"
                            value={interestRate}
                            onChange={(e) =>
                                setInterestRate(parseFloat(e.target.value) || 0)
                            }
                            className={styles.input}
                            step="0.1"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label
                            htmlFor="compoundingFrequency"
                            className={styles.label}
                        >
                            Frecuencia de Capitalización
                        </label>
                        <select
                            id="compoundingFrequency"
                            value={compoundingFrequency}
                            onChange={(e) =>
                                setCompoundingFrequency(
                                    parseInt(e.target.value)
                                )
                            }
                            className={styles.select}
                        >
                            <option value="12">Mensual</option>
                            <option value="4">Trimestral</option>
                            <option value="2">Semestral</option>
                            <option value="1">Anual</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="years" className={styles.label}>
                            Horizonte de Inversión (Años)
                        </label>
                        <input
                            type="number"
                            id="years"
                            value={years}
                            onChange={(e) =>
                                setYears(parseInt(e.target.value) || 1)
                            }
                            className={styles.input}
                        />
                    </div>
                </div>
            </div>
            <div className={styles.outputPanel}>
                <h2 className={styles.panelTitle}>Proyecciones</h2>
                <div className={styles.resultsGrid}>
                    <div className={styles.statCard}>
                        <div
                            className={`${styles.statValue} ${styles.contributions}`}
                        >
                            {formatCurrency(totalContributions)}
                        </div>
                        <div className={styles.statLabel}>Total Aportado</div>
                    </div>
                    <div className={styles.statCard}>
                        <div
                            className={`${styles.statValue} ${styles.interest}`}
                        >
                            {formatCurrency(totalInterest)}
                        </div>
                        <div className={styles.statLabel}>Interés Generado</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statValue} ${styles.total}`}>
                            {formatCurrency(finalValue)}
                        </div>
                        <div className={styles.statLabel}>Valor Proyectado</div>
                    </div>
                </div>
                <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={chartData}
                            margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
                        >
                            <defs>
                                {/* THE FIX: Hardcoding the hex values for reliability */}
                                <linearGradient
                                    id="colorContributions"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor="#00aaff"
                                        stopOpacity={0.4}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="#00aaff"
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                                <linearGradient
                                    id="colorInterest"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor="#a371f7"
                                        stopOpacity={0.4}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="#a371f7"
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255, 255, 255, 0.1)"
                            />
                            <XAxis
                                dataKey="year"
                                stroke="#8b949e"
                                tickFormatter={(tick) => `Año ${tick}`}
                            />
                            <YAxis
                                stroke="#8b949e"
                                tickFormatter={(tick) => formatCurrency(tick)}
                                width={90}
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{
                                    stroke: "#00e5a0",
                                    strokeWidth: 1,
                                    strokeDasharray: "3 3",
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="totalContributions"
                                stackId="1"
                                stroke="#00aaff"
                                fill="url(#colorContributions)"
                                name="Total Aportado"
                            />
                            <Area
                                type="monotone"
                                dataKey="interest"
                                stackId="1"
                                stroke="#a371f7"
                                fill="url(#colorInterest)"
                                name="Interés Generado"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default CalculatorPage;
