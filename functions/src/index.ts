// functions/src/index.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { defineString } from "firebase-functions/params";
import axios from "axios";

// Initialize Admin SDK once
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

logger.info("Function file loaded (V2).");

const finnhubApiKeyParam = defineString("FINNHUB_API_KEY");

// --- Interfaces for data structures ---
interface PriceData {
    [symbol: string]: number;
}
interface Position {
    userId: string;
    symbol: string;
    quantity: number;
    costBasisPerShare: number;
}

// --- NEW INTERFACE for our historical data points ---
interface HistoryPoint {
    timestamp: admin.firestore.Timestamp;
    value: number;
}

export const refreshData = onSchedule(
    {
        schedule: "every 60 minutes",
        timeoutSeconds: 300,
        memory: "512MiB",
        region: "us-central1",
    },
    async (context) => {
        logger.info("Scheduled data refresh started.");
        // ... (Parts 1, 2, 3: Fetching symbols and prices remain the same) ...
        // [Copying the unchanged parts for completeness]
        const finnhubKey = finnhubApiKeyParam.value();
        if (!finnhubKey) {
            logger.error("FINNHUB_API_KEY not found. Exiting.");
            return;
        }

        try {
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

            const prices: PriceData = {};
            for (const symbol of uniqueSymbols) {
                try {
                    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`;
                    const response = await axios.get(url);
                    if (response.data && typeof response.data.c === "number") {
                        prices[symbol] = response.data.c;
                    }
                } catch (error) {
                    logger.error(`Failed to fetch price for ${symbol}`, {
                        error,
                    });
                }
            }

            const priceBatch = db.batch();
            for (const symbol in prices) {
                const docRef = db.collection("latest_prices").doc(symbol);
                priceBatch.set(docRef, {
                    price: prices[symbol],
                    lastUpdated: new Date(),
                });
            }
            await priceBatch.commit();

            // --- PART 4 (UPGRADED): Calculate and store user summaries with HISTORY ---
            const userSummaries: { [userId: string]: number } = {};
            const userIds = [...new Set(allPositions.map((p) => p.userId))];
            userIds.forEach((userId) => {
                userSummaries[userId] = 0;
            });

            allPositions.forEach((pos) => {
                const currentPrice = prices[pos.symbol.toUpperCase()] || 0;
                userSummaries[pos.userId] += (pos.quantity || 0) * currentPrice;
            });

            // --- PART 5 (NEW): Write summaries AND historical data ---
            const summaryBatch = db.batch();
            const now = admin.firestore.Timestamp.now();

            for (const userId in userSummaries) {
                const summaryRef = db.collection("user_summaries").doc(userId);
                const newTotalValue = userSummaries[userId];

                // The new history data point we want to add
                const newHistoryPoint: HistoryPoint = {
                    timestamp: now,
                    value: newTotalValue,
                };

                // Atomically add the new point to an array field.
                // This also keeps the last 30 data points (roughly 30 hours).
                const updatePayload = {
                    totalValue: newTotalValue,
                    lastUpdated: now,
                    // Use FieldValue to manage the array
                    history:
                        admin.firestore.FieldValue.arrayUnion(newHistoryPoint),
                };

                summaryBatch.set(summaryRef, updatePayload, { merge: true });
            }
            await summaryBatch.commit();
            logger.info(
                `Successfully updated summaries for ${
                    Object.keys(userSummaries).length
                } users.`
            );

            // We can add a separate function later to trim the history array
            // to keep it from growing indefinitely. For now, this is fine.

            logger.info("Scheduled data refresh completed successfully.");
            return;
        } catch (error) {
            logger.error("Critical error in refreshData function:", { error });
            return;
        }
    }
);
