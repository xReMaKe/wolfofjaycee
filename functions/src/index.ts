// functions/src/index.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { defineString } from "firebase-functions/params";
import axios from "axios"; // Using axios for simpler API calls

// Initialize Admin SDK once
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

logger.info("Function file loaded (V2).");

// Define Finnhub API Key parameter (your existing setup is perfect)
const finnhubApiKeyParam = defineString("FINNHUB_API_KEY");

// --- Interfaces for data structures ---
interface FinnhubQuote {
    c: number;
}
interface PriceData {
    [symbol: string]: number;
}
interface Position {
    userId: string;
    symbol: string;
    quantity: number;
}

export const refreshData = onSchedule(
    {
        schedule: "every 60 minutes",
        timeoutSeconds: 300, // Increased timeout for more work
        memory: "512MiB", // Increased memory
        region: "us-central1",
    },
    async (event) => {
        logger.info("Scheduled data refresh started.");

        const finnhubKey = finnhubApiKeyParam.value();
        if (!finnhubKey) {
            logger.error("FINNHUB_API_KEY not found. Exiting.");
            return;
        }

        try {
            // --- PART 1: Fetch all unique symbols from all positions ---
            const positionsSnapshot = await db.collection("positions").get();
            if (positionsSnapshot.empty) {
                logger.info("No positions found. Exiting.");
                return;
            }

            const allPositions: Position[] = positionsSnapshot.docs.map(
                (doc) => doc.data() as Position
            );
            const uniqueSymbols = [
                ...new Set(allPositions.map((p) => p.symbol.toUpperCase())),
            ];
            logger.info(`Found ${uniqueSymbols.length} unique symbols.`);

            // --- PART 2: Fetch latest prices from Finnhub ---
            const prices: PriceData = {};
            for (const symbol of uniqueSymbols) {
                try {
                    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`;
                    const response = await axios.get<FinnhubQuote>(url);
                    if (response.data && typeof response.data.c === "number") {
                        prices[symbol] = response.data.c;
                    }
                } catch (error) {
                    logger.error(`Failed to fetch price for ${symbol}`, {
                        error,
                    });
                }
            }
            logger.info(
                `${Object.keys(prices).length} prices successfully fetched.`
            );

            // --- PART 3: Write latest prices to Firestore ---
            const priceBatch = db.batch();
            for (const symbol in prices) {
                const docRef = db.collection("latest_prices").doc(symbol);
                priceBatch.set(docRef, {
                    price: prices[symbol],
                    lastUpdated: new Date(),
                });
            }
            await priceBatch.commit();
            logger.info("Successfully updated 'latest_prices' collection.");

            // --- PART 4 (NEW): Calculate and store user summaries ---
            const userSummaries: { [userId: string]: { totalValue: number } } =
                {};

            // Get all unique user IDs from the positions
            const userIds = [...new Set(allPositions.map((p) => p.userId))];

            // Initialize all relevant users with a total value of 0
            userIds.forEach((userId) => {
                userSummaries[userId] = { totalValue: 0 };
            });

            // Calculate total value for each user
            allPositions.forEach((pos) => {
                const userId = pos.userId;
                const symbol = pos.symbol.toUpperCase();
                const quantity = pos.quantity || 0;
                const currentPrice = prices[symbol] || 0; // Use fetched price, default to 0

                if (userId && userSummaries[userId]) {
                    userSummaries[userId].totalValue += quantity * currentPrice;
                }
            });

            // --- PART 5 (NEW): Write summaries to Firestore ---
            const summaryBatch = db.batch();
            for (const userId in userSummaries) {
                const summaryRef = db.collection("user_summaries").doc(userId);
                summaryBatch.set(
                    summaryRef,
                    {
                        totalValue: userSummaries[userId].totalValue,
                        lastUpdated: new Date(),
                    },
                    { merge: true }
                ); // Use merge to not overwrite other fields
            }
            await summaryBatch.commit();
            logger.info(
                `Successfully updated summaries for ${
                    Object.keys(userSummaries).length
                } users.`
            );

            logger.info("Scheduled data refresh completed successfully.");
            return;
        } catch (error) {
            logger.error("Critical error in refreshData function:", { error });
            return;
        }
    }
);
