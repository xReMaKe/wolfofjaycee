// src/utils/formatting.ts

const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export const formatAsCurrency = (value: number | undefined | null): string => {
    if (typeof value !== "number") {
        return currencyFormatter.format(0); // Return $0.00 for non-numbers
    }
    return currencyFormatter.format(value);
};
