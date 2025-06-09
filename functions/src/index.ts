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

// --- CORRECTED INTERFACES ---
interface FinnhubQuote {
    c?: number; // current price
    d?: number; // change
    dp?: number; // percent change
}
interface Position {
    userId: string;
    symbol: string;
    quantity: number;
}
interface HistoryPoint {
    timestamp: admin.firestore.Timestamp;
    value: number;
}

export const refreshData = onSchedule(
    {
        schedule: "every 30 minutes",
        timeoutSeconds: 300,
        memory: "512MiB",
        region: "us-central1",
    },
    async (context) => {
        logger.info("--- Scheduled data refresh started ---");
        const finnhubKey = finnhubApiKeyParam.value();
        if (!finnhubKey) {
            logger.error("FINNHUB_API_KEY not found. Exiting.");
            return;
        }

        try {
            // --- PART 1: Fetch all unique symbols ---
            const positionsSnapshot = await db.collection("positions").get();
            const positionSymbols = positionsSnapshot.docs
                .map((doc) => doc.data().symbol?.toUpperCase())
                .filter(Boolean);
            const watchlistsSnapshot = await db.collection("watchlists").get();
            const watchlistSymbols = watchlistsSnapshot.docs
                .flatMap((doc) => doc.data().symbols || [])
                .map((s: string) => s.toUpperCase());
            const uniqueSymbols = [
                ...new Set([...positionSymbols, ...watchlistSymbols]),
            ];

            if (uniqueSymbols.length === 0) {
                logger.info("No symbols to process. Job complete.");
                return;
            }
            logger.info(`Found ${uniqueSymbols.length} total unique symbols.`);

            // --- PART 2: Fetch quotes from Finnhub ---
            const quotes: { [symbol: string]: FinnhubQuote } = {}; // Use the correct type
            for (const symbol of uniqueSymbols) {
                try {
                    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`;
                    const response = await axios.get<FinnhubQuote>(url);
                    if (response.data) {
                        quotes[symbol] = response.data;
                    }
                } catch (error) {
                    logger.error(`Failed to fetch quote for ${symbol}`, {
                        error,
                    });
                }
            }
            logger.info(
                `${Object.keys(quotes).length} quotes successfully fetched.`
            );

            // --- PART 3: Write price data to Firestore ---
            const priceBatch = db.batch();
            for (const symbol in quotes) {
                const quote = quotes[symbol];
                const priceRef = db.collection("latest_prices").doc(symbol);
                priceBatch.set(
                    priceRef,
                    {
                        price: quote.c || 0,
                        change: quote.d || 0,
                        percent_change: quote.dp || 0,
                        lastUpdated: new Date(),
                    },
                    { merge: true }
                );
            }
            await priceBatch.commit();
            logger.info("Updated 'latest_prices' collection.");

            // --- PART 4: Calculate user summaries ---
            const allPositions: Position[] = positionsSnapshot.docs.map(
                (doc) => doc.data() as Position
            );
            const userSummaries: { [userId: string]: number } = {};
            const userIds = [
                ...new Set(allPositions.map((p) => p.userId).filter(Boolean)),
            ];
            userIds.forEach((userId) => {
                userSummaries[userId] = 0;
            });

            allPositions.forEach((pos) => {
                if (
                    pos &&
                    pos.userId &&
                    pos.symbol &&
                    typeof pos.quantity === "number"
                ) {
                    // CORRECTED: Get the price 'c' from the quote object
                    const currentPrice =
                        quotes[pos.symbol.toUpperCase()]?.c || 0;
                    if (userSummaries[pos.userId] !== undefined) {
                        userSummaries[pos.userId] +=
                            pos.quantity * currentPrice;
                    }
                }
            });

            // --- PART 5: Write summaries and history to Firestore ---
            const summaryBatch = db.batch();
            const now = admin.firestore.Timestamp.now();

            for (const userId in userSummaries) {
                const summaryRef = db.collection("user_summaries").doc(userId);
                const newTotalValue = userSummaries[userId];
                const newHistoryPoint: HistoryPoint = {
                    timestamp: now,
                    value: newTotalValue,
                };
                const updatePayload = {
                    totalValue: newTotalValue,
                    lastUpdated: now,
                    history:
                        admin.firestore.FieldValue.arrayUnion(newHistoryPoint),
                };
                summaryBatch.set(summaryRef, updatePayload, { merge: true });
            }
            await summaryBatch.commit();
            logger.info(
                `Updated summaries for ${
                    Object.keys(userSummaries).length
                } users.`
            );

            logger.info(
                "--- Scheduled data refresh completed successfully. ---"
            );
            return;
        } catch (error) {
            logger.error("!!! CRITICAL ERROR in refreshData function:", {
                error,
            });
            return;
        }
    }
);
