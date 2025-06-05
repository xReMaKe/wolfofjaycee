// functions/src/index.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2"; // V2 import for logger
import * as admin from "firebase-admin"; // Firebase Admin SDK
// Firestore specific types
import { Timestamp, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { defineString } from "firebase-functions/params";

// Initialize Firebase Admin SDK a SINGLE time globally
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore(); // Firestore instance via Admin SDK

logger.info("Function file loaded (V2). refreshPrices defined.", {
  structuredData: true,
});

// NEW: Define the Finnhub API Key as a string parameter
// This tells Firebase that this function expects a
// FINNHUB_API_KEY environment variable.
const finnhubApiKeyParam = defineString("FINNHUB_API_KEY");

// --- Your helloWorld function (V2 signature) ---


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

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// REPLACE YOUR ENTIRE EXISTING refreshPrices FUNCTION WITH THIS BLOCK
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
export const refreshPrices = onSchedule( // CHANGED from onRequest
  {
    schedule: "every 60 minutes", // Defines the schedule
    timeoutSeconds: 30,
    memory: "256MiB",
    region: "us-central1", // Explicitly set region for clarity
  },
  async (event) => { // CHANGED from (request, response) to (event)
    logger.info("refreshPrices function invoked! (V2)", {
      structuredData: true,
    });

    const finnhubKey = finnhubApiKeyParam.value();
    if (!finnhubKey) {
logger.error("FINNHUB_API_KEY not found as a configured parameter. Exiting.");
      return; // Exit early on error, no response.send() for scheduled functions
    }
    logger.info("Finnhub API Key successfully loaded from parameter.");

    // Debugging logs (keep these for now, remove later once confident)
    logger.info(`Firestore connected to Project ID: 
        ${admin.app().options.projectId}`,
      { projectId: admin.app().options.projectId });
    logger.info("Firestore connected to Database Name: (default)",
      { databaseName: "(default)" });

    try {
      logger.info("Attempting to fetch positions from Firestore...");

      const positionsSnapshot = await db.collection("positions").get();
      logger.info(
        `Positions snapshot fetched. Size: ${positionsSnapshot.size}`,
      );

      if (positionsSnapshot.empty) {
        logger.info("No positions found in Firestore. Nothing to update.");
        return; // Exit early if no positions, no response.send()
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
        { uniqueSymbols },
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
          // Fixed multi-line string concatenation (using +)
          const finnhubResponse = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}` +
                            `&token=${finnhubKey}`,
          );
          if (!finnhubResponse.ok) {
            logger.error(
              `Finnhub API error for ${symbol}: ` +
                                `${finnhubResponse.status} ` +
                                `${finnhubResponse.statusText}`,
              {
                symbol,
                status: finnhubResponse.status,
                statusText: finnhubResponse.statusText,
              },
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
              "No valid current price (c) data for " +
                                `${symbol} from Finnhub.`,
              { symbol, quoteData },
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
          `Attempting to save ${fetchedPrices.length} ` +
                        "prices to 'latest_prices' collection...",
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
            { merge: true },
          );
        });
        await batch.commit();
        logger.info(
          `${fetchedPrices.length} ` +
                        "prices successfully saved/updated in 'latest_prices'.",
        );
      }

      logger.info(
        "refreshPrices function processed symbols and updated/saved prices.",
        {
          finnhubKeyLoaded: true,
          symbolsProcessed: uniqueSymbols.length,
          pricesSuccessfullyRetrievedAndSaved: fetchedPrices.length,
          symbolsFailedToFetch: failedSymbolsToFetch,
        },
      );
      return; // Indicate successful completion
    } catch (error) {
      logger.error("Error in refreshPrices function:", { error });
      // No response.send() here, just log the error
      return; // Indicate function failure
    }
  },
);
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// END OF ENTIRE refreshPrices FUNCTION BLOCK TO REPLACE
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
