// --- DOM Elements ---
const initialInvestmentEl = document.getElementById("initialInvestment");
const regularContributionEl = document.getElementById("regularContribution");
const contributionFrequencyEl = document.getElementById(
    "contributionFrequency"
);
const interestRateEl = document.getElementById("interestRate");
const compoundingFrequencyEl = document.getElementById("compoundingFrequency");
const yearsEl = document.getElementById("years");

const futureValueEl = document.getElementById("futureValue");
const totalContributionsEl = document.getElementById("totalContributions");
const totalInterestEl = document.getElementById("totalInterest");

const ctx = document.getElementById("growthChart").getContext("2d");

// --- Chart.js Setup ---
let growthChart; // To hold the chart instance

function initializeChart() {
    if (growthChart) {
        growthChart.destroy(); // Destroy previous chart if exists
    }
    growthChart = new Chart(ctx, {
        type: "line", // Will be dynamically updated, starting as line avoids errors
        data: {
            labels: [], // Years
            datasets: [
                {
                    label: "Total Aportado",
                    data: [],
                    borderColor: "rgba(215, 201, 165, 1)",
                    backgroundColor: "rgba(215, 201, 165, 0.4)",
                    fill: true,
                    tension: 0.1, // Smoothes the line
                    pointRadius: 0, // Hide points for area chart look
                    order: 2, // Draw contributions below interest
                },
                {
                    label: "Interés Generado",
                    data: [],
                    borderColor: "rgba(45, 64, 44, 1)", // muted dark green
                    backgroundColor: "rgba(45, 64, 44, 0.3)",
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    order: 1, // Draw interest on top
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    mode: "index",
                    intersect: false,
                    callbacks: {
                        // Custom tooltip to show total value easily
                        footer: function (tooltipItems) {
                            let sum = 0;
                            tooltipItems.forEach(function (tooltipItem) {
                                sum += tooltipItem.parsed.y;
                            });
                            return "Total Value: " + formatCurrency(sum);
                        },
                    },
                },
                legend: {
                    position: "top",
                },
                title: {
                    display: true,
                    text: "Crecimiento en el Tiempo",
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Año",
                    },
                    stacked: false, // Keep X axis standard
                },
                y: {
                    title: {
                        display: true,
                        text: "Valor ($)",
                    },
                    stacked: true, // Stack the datasets on the Y axis
                    ticks: {
                        // Format Y-axis labels as currency
                        callback: function (value, index, values) {
                            return formatCurrency(value);
                        },
                    },
                },
            },
            interaction: {
                // For hover effects
                mode: "index",
                intersect: false,
            },
        },
    });
}

// --- Calculation Logic ---
function calculateCompoundGrowth() {
    const P = parseFloat(initialInvestmentEl.value) || 0;
    const PMT_user = parseFloat(regularContributionEl.value) || 0;
    const contribFreq = parseInt(contributionFrequencyEl.value); // e.g. 12
    const r = (parseFloat(interestRateEl.value) || 0) / 100;
    const n = parseInt(compoundingFrequencyEl.value); // e.g. 1
    const t = parseInt(yearsEl.value) || 0;

    // Setup chart arrays
    const labels = ["Start"];
    const contrib = [P];
    const interest = [0];

    // Precompute per-period values
    const ratePerPeriod = r / n;
    const depositPerPeriod = PMT_user * (contribFreq / n);
    // if n=1 & contribFreq=12, depositPerPeriod = PMT_user * 12

    let balance = P;
    let totalContrib = P;

    // Loop year by year
    for (let year = 1; year <= t; year++) {
        for (let period = 1; period <= n; period++) {
            // 1) Add the proportional deposit for this period
            balance += depositPerPeriod;
            totalContrib += depositPerPeriod;

            // 2) Apply interest
            const interestThis = balance * ratePerPeriod;
            // optionally: const interestThis = Math.round(balance*ratePerPeriod*100)/100;
            balance += interestThis;
        }
        labels.push(`Año ${year}`);
        contrib.push(totalContrib);
        interest.push(balance - totalContrib);
    }

    // === Formula‐based headlines ===
    // FV of principal
    const fvP = P * Math.pow(1 + r / n, n * t);
    // FV of annuity
    const PMTpp = depositPerPeriod;
    let fvA = 0;
    if (r === 0) fvA = PMTpp * n * t;
    else if (PMTpp > 0)
        fvA = PMTpp * ((Math.pow(1 + r / n, n * t) - 1) / (r / n));

    const fvTotal = fvP + fvA;
    const totalCon = P + PMT_user * contribFreq * t;
    const totalInt = fvTotal - totalCon;

    // === Update DOM ===
    futureValueEl.textContent = formatCurrency(fvTotal);
    totalContributionsEl.textContent = formatCurrency(totalCon);
    totalInterestEl.textContent = formatCurrency(totalInt);

    // === Update Chart ===
    if (!growthChart) initializeChart();
    growthChart.data.labels = labels;
    growthChart.data.datasets[0].data = contrib;
    growthChart.data.datasets[1].data = interest;
    growthChart.update();
}

// --- Formatting Helper ---
function formatCurrency(value) {
    return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
    });
}

// --- Event Listeners for Real-Time Updates ---
const inputs = [
    initialInvestmentEl,
    regularContributionEl,
    contributionFrequencyEl,
    interestRateEl,
    compoundingFrequencyEl,
    yearsEl,
];
inputs.forEach((input) => {
    input.addEventListener("input", calculateCompoundGrowth); // Recalculate on any input change
    input.addEventListener("change", calculateCompoundGrowth); // Also catch changes for selects/blur
});

// --- Initial Calculation & Chart Render ---
document.addEventListener("DOMContentLoaded", () => {
    initializeChart(); // Set up the chart structure first
    calculateCompoundGrowth(); // Then run the initial calculation and populate
});
