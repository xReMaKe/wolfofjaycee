// functions/src/index.ts
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

logger.info("Function file loaded. refreshPrices defined.", {
    structuredData: true,
});

export const helloWorld = functions.https.onRequest((request, response) => {
    // ... (helloWorld function remains the same)
    logger.info("helloWorld function invoked!", { structuredData: true });
    response.send("Hello from Firebase Functions!");
});

export const refreshPrices = functions.https.onRequest(
    async (request, response) => {
        logger.info("refreshPrices function invoked!", {
            structuredData: true,
        });

        const finnhubKey = process.env.FINNHUB_API_KEY;
        if (!finnhubKey) {
            logger.error("FINNHUB_API_KEY not found in environment.");
            response
                .status(500)
                .send({
                    error: "Server configuration error: Finnhub API key missing.",
                });
            return;
        }
        logger.info(
            "Finnhub API Key successfully loaded (first few chars): " +
                finnhubKey.substring(0, 5) +
                "..."
        );

        try {
            logger.info("Attempting to fetch positions from Firestore...");
            const positionsSnapshot = await db.collection("positions").get();

            if (positionsSnapshot.empty) {
                logger.info("No positions found in Firestore.");
                response
                    .status(200)
                    .send({
                        message: "No positions found to update prices for.",
                    });
                return;
            }

            const symbols = new Set<string>(); // Use a Set to store unique symbols
            positionsSnapshot.forEach((doc) => {
                const positionData = doc.data();
                if (
                    positionData.symbol &&
                    typeof positionData.symbol === "string"
                ) {
                    symbols.add(positionData.symbol);
                }
            });

            const uniqueSymbols = Array.from(symbols);
            logger.info(
                `Found ${uniqueSymbols.length} unique symbols in positions:`,
                uniqueSymbols
            );

            // Placeholder for next steps (fetching from Finnhub and saving)
            // For now, just return the symbols found.

            response.status(200).send({
                message: "refreshPrices function processed positions.",
                finnhubKeyLoaded: true,
                uniqueSymbolsFound: uniqueSymbols,
            });
        } catch (error) {
            logger.error("Error in refreshPrices function:", error);
            response
                .status(500)
                .send({
                    error: "Failed to execute refreshPrices",
                    details: (error as Error).message,
                });
        }
    }
);
