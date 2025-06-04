// functions/src/index.ts
import { onRequest } from "firebase-functions/v2/https"; // V2 import for HTTP functions
import { logger } from "firebase-functions/v2"; // V2 import for logger
import * as admin from "firebase-admin"; // Firebase Admin SDK
import { Timestamp, QueryDocumentSnapshot } from "firebase-admin/firestore"; // Firestore specific types

// Initialize Firebase Admin SDK a SINGLE time globally
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore(); // Firestore instance via Admin SDK

logger.info("Function file loaded (V2). refreshPrices defined.", {
    structuredData: true,
});

// --- Your helloWorld function (V2 signature) ---
export const helloWorld = onRequest((request, response) => {
    // request is an Express-like Request, response is Express-like Response
    logger.info("helloWorld function invoked! (V2)", { structuredData: true });
    response.send("Hello from Firebase Functions V2!");
});

// --- Interface for the expected Finnhub quote data ---
interface FinnhubQuote {
    c: number; // Current price
    d: number | null;
    dp: number | null;
    h: number;
    l: number;
    o: number;
    pc: number;
    t: number;
}

// --- Your refreshPrices function (V2 signature) ---
export const refreshPrices = onRequest(
    {
        timeoutSeconds: 30, // Optional: set a timeout for the function
        memory: "256MiB", // Optional: allocate memory
        // Add other options like region if needed, e.g., region: 'us-central1'
    },
    async (request, response) => {
        // request and response are Express-like
        logger.info("refreshPrices function invoked! (V2)", {
            structuredData: true,
        });

        const finnhubKey = process.env.FINNHUB_API_KEY;
        if (!finnhubKey) {
            logger.error("FINNHUB_API_KEY not found in environment.");
            response.status(500).send({
                error: "Server configuration error: Finnhub API key missing.",
            });
            return;
        }
        logger.info("Finnhub API Key successfully loaded.");

        try {
            logger.info("Attempting to fetch positions from Firestore...");
            const positionsSnapshot = await db.collection("positions").get();
            logger.info(
                `Positions snapshot fetched. Size: ${positionsSnapshot.size}`
            );

            if (positionsSnapshot.empty) {
                logger.info("No positions found in Firestore.");
                response.status(200).send({
                    message: "No positions found to update prices for.",
                });
                return;
            }

            const symbols = new Set<string>();
            positionsSnapshot.forEach((doc: QueryDocumentSnapshot) => {
                const positionData = doc.data();
                if (positionData && typeof positionData.symbol === "string") {
                    symbols.add(positionData.symbol);
                }
            });
            const uniqueSymbols = Array.from(symbols);
            logger.info(
                `Found ${uniqueSymbols.length} unique symbols in positions:`,
                { uniqueSymbols }
            ); // Pass object for structured logging

            const fetchedPrices: Array<{
                symbol: string;
                price: number;
                lastUpdatedAt: Timestamp;
            }> = [];
            const failedSymbolsToFetch: string[] = [];

            for (const symbol of uniqueSymbols) {
                logger.info(`Fetching price for ${symbol} from Finnhub...`);
                try {
                    const finnhubResponse = await fetch(
                        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`
                    );
                    if (!finnhubResponse.ok) {
                        logger.error(
                            `Finnhub API error for ${symbol}: ${finnhubResponse.status} ${finnhubResponse.statusText}`,
                            {
                                symbol,
                                status: finnhubResponse.status,
                                statusText: finnhubResponse.statusText,
                            }
                        );
                        failedSymbolsToFetch.push(symbol);
                        continue;
                    }
                    const quoteData =
                        (await finnhubResponse.json()) as FinnhubQuote;
                    if (
                        quoteData &&
                        typeof quoteData.c === "number" &&
                        quoteData.c > 0
                    ) {
                        logger.info(`✓ ${symbol}: $${quoteData.c}`, {
                            symbol,
                            price: quoteData.c,
                        });
                        fetchedPrices.push({
                            symbol: symbol,
                            price: quoteData.c,
                            lastUpdatedAt: Timestamp.now(),
                        });
                    } else {
                        logger.warn(
                            `No valid current price (c) data for ${symbol} from Finnhub.`,
                            { symbol, quoteData }
                        );
                        failedSymbolsToFetch.push(symbol);
                    }
                } catch (fetchError) {
                    logger.error(`Failed to fetch price for ${symbol}:`, {
                        symbol,
                        error: fetchError,
                    });
                    failedSymbolsToFetch.push(symbol);
                }
            }
            logger.info("Prices fetched from Finnhub:", { fetchedPrices });

            if (fetchedPrices.length > 0) {
                logger.info(
                    `Attempting to save ${fetchedPrices.length} prices to 'latest_prices' collection...`
                );
                const batch = db.batch();
                fetchedPrices.forEach((priceData) => {
                    const docRef = db
                        .collection("latest_prices")
                        .doc(priceData.symbol);
                    batch.set(
                        docRef,
                        {
                            price: priceData.price,
                            lastUpdatedAt: priceData.lastUpdatedAt,
                        },
                        { merge: true }
                    );
                });
                await batch.commit();
                logger.info(
                    `${fetchedPrices.length} prices successfully saved/updated in 'latest_prices'.`
                );
            }

            response.status(200).send({
                message:
                    "refreshPrices function processed symbols and updated/saved prices.",
                finnhubKeyLoaded: true,
                symbolsProcessed: uniqueSymbols.length,
                pricesSuccessfullyRetrievedAndSaved: fetchedPrices.length,
                symbolsFailedToFetch: failedSymbolsToFetch,
                retrievedPriceDetails: fetchedPrices,
            });
        } catch (error) {
            logger.error("Error in refreshPrices function:", { error }); // Log error object for more detail
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            response.status(500).send({
                error: "Failed to execute refreshPrices",
                details: errorMessage,
            });
        }
    }
);
