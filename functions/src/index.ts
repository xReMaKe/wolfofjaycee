// functions/src/index.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import axios from "axios";
// --- Additional Imports for Stripe ---
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";
// Initialize Admin SDK once
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

logger.info("Function file loaded (V2).");

// --- CORRECTED INTERFACES ---
interface FinnhubQuote {
    c?: number; // current price
    d?: number; // change
    dp?: number; // percent change
}
interface Position {
    id: string; // Add id for convenience
    userId: string;
    symbol: string;
    quantity: number;
    portfolioId: string; // Add the missing field
    costBasisPerShare: number; // Add the missing field
}

// ADD THIS NEW INTERFACE
interface Transaction {
    id: string; // Add id for convenience
    userId: string;
    symbol: string;
    type: "buy" | "sell";
    quantity: number;
    portfolioId: string; // Add the missing field
    pricePerShare: number; // Add the missing field
}

// FINAL, DEFINITIVE REFRESH DATA FUNCTION

// FINAL, DEFINITIVE REFRESH DATA FUNCTION v2

// ---------------------------------------------------------------------------
//  COMPLETE, PASTE-ABLE refreshData  (FINAL v4)  – no TS errors / NaNs
// ---------------------------------------------------------------------------
// FINAL v5 - PRESERVES SUBSCRIPTION TIER AND IS FULLY CORRECTED

export const refreshData = onSchedule(
    {
        schedule: "0,15,30,45 * * * *",
        timeoutSeconds: 300,
        memory: "512MiB",
        region: "us-central1",
        secrets: ["FINNHUB_API_KEY"],
    },
    async (context) => {
        logger.info("--- (FINAL v5 - Subscription Aware) Refresh Started ---");
        const finnhubKey = process.env.FINNHUB_API_KEY;
        if (!finnhubKey) {
            logger.error("FINNHUB_API_KEY not found. Exiting.");
            return;
        }

        try {
            // --- Fetching logic is unchanged ---
            const positionsSnapshot = await db.collection("positions").get();
            // We only care about transactions that have not been processed yet.
            const transactionsSnapshot = await db
                .collection("transactions")
                .where("processedAt", "==", null)
                .get();
            const watchlistsSnapshot = await db.collection("watchlists").get();

            const positionSymbols = positionsSnapshot.docs
                .map((doc) => doc.data().symbol?.toUpperCase())
                .filter(Boolean);
            const transactionSymbols = transactionsSnapshot.docs
                .map((doc) => doc.data().symbol?.toUpperCase())
                .filter(Boolean);
            const watchlistSymbols = watchlistsSnapshot.docs
                .flatMap((doc) => doc.data().symbols || [])
                .map((s: string) => s.toUpperCase());
            const uniqueSymbols = [
                ...new Set([
                    ...positionSymbols,
                    ...transactionSymbols,
                    ...watchlistSymbols,
                ]),
            ];

            if (uniqueSymbols.length === 0) {
                logger.info("No symbols to process. Job complete.");
                return;
            }

            const quotes: { [symbol: string]: FinnhubQuote } = {};
            await Promise.all(
                uniqueSymbols.map(async (symbol) => {
                    try {
                        const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`;
                        const response = await axios.get<FinnhubQuote>(url);
                        if (response.data && response.data.c !== undefined) {
                            quotes[symbol] = response.data;
                        }
                    } catch (error) {
                        logger.error(`Failed to fetch quote for ${symbol}`, {
                            error,
                        });
                    }
                })
            );

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

            const summariesSnapshot = await db
                .collection("user_summaries")
                .get();
            const allPositions: Position[] = positionsSnapshot.docs.map(
                (doc) => ({ id: doc.id, ...doc.data() } as Position)
            );
            const allTransactions: Transaction[] =
                transactionsSnapshot.docs.map(
                    (doc) => ({ id: doc.id, ...doc.data() } as Transaction)
                );

            const usersToProcess = summariesSnapshot.docs;
            const summaryBatch = db.batch();
            const now = admin.firestore.Timestamp.now();

            for (const userDoc of usersToProcess) {
                const userId = userDoc.id;
                const userData = userDoc.data();
                const userPositions = allPositions.filter(
                    (p) => p.userId === userId
                );
                const userTransactions = allTransactions.filter(
                    (t) => t.userId === userId
                );
                // --- START: FINAL UNIFIED LOGIC ---
                // This logic works for ALL users, regardless of tier or history.

                const holdings: Record<
                    string,
                    {
                        quantity: number;
                        portfolioId?: string;
                        costBasisPerShare?: number;
                    }
                > = {};

                // 1. Seed the holdings from the user's current positions.
                // This includes both stable data and new positions just added by free users.
                userPositions.forEach((p) => {
                    const sym = p.symbol.toUpperCase();
                    holdings[sym] = {
                        quantity: (holdings[sym]?.quantity || 0) + p.quantity,
                        portfolioId: p.portfolioId,
                        costBasisPerShare: p.costBasisPerShare,
                    };
                });

                // 2. Fold in any NEW, unprocessed transactions.
                // This handles upgrades and new premium user activity.
                userTransactions.forEach((tx) => {
                    const sym = tx.symbol.toUpperCase();
                    const isBuy = (tx.type ?? "buy").toLowerCase() !== "sell";
                    const delta = isBuy ? tx.quantity : -tx.quantity;

                    const curQty = holdings[sym]?.quantity || 0;
                    const curCost = holdings[sym]?.costBasisPerShare ?? 0;
                    const newQty = curQty + delta;
                    let newCost = curCost;

                    if (isBuy) {
                        const totalCostBefore = curQty * curCost;
                        const totalCostOfTx = tx.quantity * tx.pricePerShare;
                        if (newQty > 0) {
                            newCost =
                                (totalCostBefore + totalCostOfTx) / newQty;
                        }
                    }

                    holdings[sym] = {
                        quantity: newQty,
                        portfolioId:
                            tx.portfolioId || holdings[sym]?.portfolioId,
                        costBasisPerShare: newCost || 0,
                    };
                });
                // --- END: FINAL UNIFIED LOGIC ---

                // 3️⃣ write authoritative map back + clean up
                const needsSync =
                    userTransactions.length > 0 ||
                    userPositions.some((p) => !p.id.startsWith(userId + "_"));

                if (needsSync) {
                    const b = db.batch();
                    const keep = new Set<string>();

                    Object.entries(holdings).forEach(([sym, h]) => {
                        const docId = `${userId}_${sym}`;
                        if (h.quantity > 0.00001) {
                            keep.add(docId);
                            b.set(
                                db.collection("positions").doc(docId),
                                {
                                    userId,
                                    symbol: sym,
                                    quantity: h.quantity,
                                    portfolioId: h.portfolioId,
                                    costBasisPerShare: h.costBasisPerShare,
                                    createdAt:
                                        admin.firestore.FieldValue.serverTimestamp(),
                                },
                                { merge: true }
                            );
                        } else {
                            b.delete(db.collection("positions").doc(docId));
                        }
                    });

                    // delete only legacy auto-ID docs
                    userPositions.forEach((p) => {
                        if (!p.id.startsWith(userId + "_")) {
                            b.delete(db.collection("positions").doc(p.id));
                        }
                    });

                    // purge the processed transactions
                    // Archive the processed transactions instead of deleting
                    const processedTimestamp =
                        admin.firestore.FieldValue.serverTimestamp();
                    userTransactions.forEach((tx) => {
                        const txRef = db.collection("transactions").doc(tx.id);
                        b.update(txRef, { processedAt: processedTimestamp });
                    });

                    // --- END: NEW PRUNING LOGIC ---

                    await b.commit();
                    logger.info(`✅ holdings consolidated for ${userId}`);

                    await b.commit();
                    logger.info(`✅ holdings consolidated for ${userId}`);
                }

                // PASTE THIS CORRECTED BLOCK IN ITS PLACE
                let totalValue = Object.entries(holdings).reduce(
                    (sum, [sym, data]) => {
                        const price = quotes[sym]?.c ?? 0;
                        return sum + (data.quantity || 0) * price;
                    },
                    0
                ); // <-- The critical `0` initialValue

                totalValue = totalValue < 0 ? 0 : totalValue;

                // *** THE CRITICAL FIX IS HERE ***
                const summaryRef = db.collection("user_summaries").doc(userId);
                const newHistoryPoint = { timestamp: now, value: totalValue };
                const existingHistory = userData.history || [];
                let newHistory = [...existingHistory, newHistoryPoint];
                if (newHistory.length > 48) {
                    newHistory = newHistory.slice(newHistory.length - 48);
                }

                // We use `.set` with `{ merge: true }` to update only the fields we specify,
                // leaving `subscriptionTier` and other fields untouched.
                summaryBatch.set(
                    summaryRef,
                    {
                        totalValue,
                        lastUpdated: now,
                        history: newHistory,
                    },
                    { merge: true }
                );
            }

            await summaryBatch.commit();
            logger.info(`--- (FINAL v5) User summaries updated successfully.`);
        } catch (error) {
            logger.error("!!! CRITICAL ERROR in refreshData function:", {
                error,
            });
            return;
        }
    }
);

// PASTE THIS ENTIRE NEW FUNCTION INTO functions/src/index.ts

// PASTE THIS CORRECTED VERSION OVER YOUR EXISTING SKELETON

export const calculatePerformanceHistory = onSchedule(
    {
        schedule: "0 20 * * *", // Runs every day at 8:00 PM (20:00)
        timeZone: "America/New_York",
        timeoutSeconds: 540,
        memory: "1GiB",
        region: "us-central1",
        secrets: ["FINNHUB_API_KEY"],
    },
    async (context) => {
        // The `context` parameter is correct
        logger.info("--- Starting Nightly Performance History Calculation ---");
        const finnhubKey = process.env.FINNHUB_API_KEY;
        if (!finnhubKey) {
            logger.error(
                "FINNHUB_API_KEY not found in calculatePerformanceHistory. Exiting."
            );
            return; // <-- This is a valid void return
        }

        // REPLACE THE "// CORE LOGIC" COMMENT WITH THIS BLOCK

        try {
            // 1. Get all premium users
            const premiumUsersSnapshot = await db
                .collection("user_summaries")
                .where("subscriptionTier", "==", "premium")
                .get();

            if (premiumUsersSnapshot.empty) {
                logger.info("No premium users to process. Exiting.");
                return;
            }

            // 2. Get the benchmark data for S&P 500 (SPY) once
            const benchmarkPrices = await getHistoricalPrices(
                "SPY",
                finnhubKey
            );

            // 3. Process each premium user
            for (const userDoc of premiumUsersSnapshot.docs) {
                const userId = userDoc.id;
                logger.info(
                    `Processing performance history for user: ${userId}`
                );

                const transactionsSnapshot = await db
                    .collection("transactions")
                    .where("userId", "==", userId)
                    .orderBy("transactionDate")
                    .get();

                if (transactionsSnapshot.empty) {
                    logger.warn(
                        `User ${userId} is premium but has no transactions. Skipping.`
                    );
                    continue;
                }

                const transactions = transactionsSnapshot.docs.map((doc) =>
                    doc.data()
                );
                const uniqueSymbols = [
                    ...new Set(transactions.map((t) => t.symbol)),
                ];

                // 4. Fetch all necessary price histories for the user's symbols
                const priceDataCache: {
                    [symbol: string]: Map<string, number>;
                } = {};
                for (const symbol of uniqueSymbols) {
                    priceDataCache[symbol] = await getHistoricalPrices(
                        symbol,
                        finnhubKey
                    );
                }

                // 5. The Big Calculation Loop
                const portfolioHistory: { date: string; value: number }[] = [];
                let currentHoldings = new Map<string, number>();
                let transactionIndex = 0;
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 365); // Go back 365 days

                for (
                    let d = startDate;
                    d <= new Date();
                    d.setDate(d.getDate() + 1)
                ) {
                    const currentDateStr = d.toISOString().split("T")[0];

                    // Update holdings based on transactions up to the current day
                    while (
                        transactionIndex < transactions.length &&
                        transactions[
                            transactionIndex
                        ].transactionDate.toDate() <= d
                    ) {
                        const tx = transactions[transactionIndex];
                        const currentQty = currentHoldings.get(tx.symbol) || 0;
                        const newQty =
                            tx.type === "buy"
                                ? currentQty + tx.quantity
                                : currentQty - tx.quantity;
                        currentHoldings.set(tx.symbol, newQty);
                        transactionIndex++;
                    }

                    // Calculate the total value for the current day
                    let dailyTotalValue = 0;
                    for (const [
                        symbol,
                        quantity,
                    ] of currentHoldings.entries()) {
                        const priceMap = priceDataCache[symbol];
                        const price = priceMap?.get(currentDateStr);
                        if (price && quantity > 0) {
                            dailyTotalValue += quantity * price;
                        }
                    }
                    portfolioHistory.push({
                        date: currentDateStr,
                        value: dailyTotalValue,
                    });
                }

                // 6. Save the calculated history to a subcollection for the user
                const historyRef = db.doc(
                    `user_summaries/${userId}/performance_history/daily_summary`
                );
                await historyRef.set({
                    portfolio: portfolioHistory,
                    benchmark: Array.from(benchmarkPrices, ([date, value]) => ({
                        date,
                        value,
                    })),
                    lastCalculated:
                        admin.firestore.FieldValue.serverTimestamp(),
                });

                logger.info(
                    `✅ Successfully calculated and saved history for ${userId}.`
                );
            }
        } catch (error) {
            logger.error("!!! CRITICAL ERROR in calculatePerformanceHistory:", {
                error,
            });
            return;
        }

        logger.info("--- Nightly Performance Calculation Complete ---");

        // The fix is here: An async function that ends without a return value
        // implicitly returns a Promise<void>, which is what Firebase wants.
        return;
    }
);
// PASTE THIS ENTIRE FUNCTION INTO functions/src/index.ts
// ==================================================================
//  PASTE THE NEW FUNCTION HERE
// ==================================================================
export const getStockFundamentals = onCall(
    {
        region: "us-central1", // Good practice to specify region
        secrets: ["FINNHUB_API_KEY"],
        cors: [/localhost:\d+$/, "https://financeproject-72a60.web.app"], // Allow calls from your app
    },
    async (request) => {
        // 1. Authentication and Input Validation
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "The function must be called while authenticated."
            );
        }

        const symbol = request.data.symbol;
        if (!symbol || typeof symbol !== "string") {
            throw new HttpsError(
                "invalid-argument",
                "The function must be called with a 'symbol' argument."
            );
        }

        const finnhubApiKey = process.env.FINNHUB_API_KEY;

        const finnhubApi = axios.create({
            baseURL: "https://finnhub.io/api/v1",
            params: {
                token: finnhubApiKey,
            },
        });

        logger.info(`Fetching fundamentals for ${symbol.toUpperCase()}...`);

        try {
            // 2. Make API calls in parallel for efficiency
            const [
                profileResponse,
                metricResponse,
                financialsResponse,
                earningsResponse,
            ] = await Promise.all([
                // NOTE: We get 'quote' data from refreshData, but we'll use 'profile2' here
                // to get company name, logo, industry etc. which is more useful for this page.
                finnhubApi.get("/stock/profile2", { params: { symbol } }),
                finnhubApi.get("/stock/metric", {
                    params: { symbol, metric: "all" },
                }),
                finnhubApi.get("/stock/financials-as-reported", {
                    params: { symbol },
                }),
                finnhubApi.get("/stock/earnings", { params: { symbol } }),
            ]);

            // 3. Aggregate the data into a single, clean object
            const fundamentals = {
                symbol: symbol.toUpperCase(),
                profile: profileResponse.data, // Contains name, logo, industry etc.
                metrics: metricResponse.data.metric,
                financials: financialsResponse.data.data,
                earnings: earningsResponse.data,
            };

            return fundamentals;
        } catch (error) {
            logger.error(`Error fetching fundamentals for ${symbol}:`, error);
            throw new HttpsError(
                "internal",
                `Failed to fetch fundamental data for ${symbol}.`
            );
        }
    }
);
// ==================================================================
//  END OF NEW FUNCTION
// ==================================================================
/**
 * A callable function that migrates a user's legacy `positions`
 * into the `transactions` collection. This is a critical one-time step
 * performed just before a user upgrades to premium.
 */
export const migratePositionsToTransactions = onCall(
    {
        // This function doesn't need any special secrets, but it does
        // need the user to be authenticated.
        cors: [/localhost:\d+$/, "https://financeproject-72a60.web.app"],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "You must be logged in to migrate your data."
            );
        }

        const userId = request.auth.uid;
        logger.info(`Starting position migration for user: ${userId}`);

        try {
            const positionsSnapshot = await db
                .collection("positions")
                .where("userId", "==", userId)
                .get();

            if (positionsSnapshot.empty) {
                logger.info(
                    `User ${userId} has no positions to migrate. Exiting successfully.`
                );
                return { success: true, message: "No positions to migrate." };
            }

            const batch = db.batch();
            const migrationTimestamp =
                admin.firestore.FieldValue.serverTimestamp();

            positionsSnapshot.docs.forEach((positionDoc) => {
                const positionData = positionDoc.data();

                // Create a new transaction document from the position data
                const newTransactionData = {
                    userId: userId,
                    portfolioId: positionData.portfolioId,
                    symbol: positionData.symbol,
                    quantity: positionData.quantity,
                    pricePerShare: positionData.costBasisPerShare || 0,
                    type: "buy", // Assume all legacy positions are 'buy' events
                    transactionDate: positionData.createdAt || new Date(), // Use original creation date if available
                    processedAt: migrationTimestamp, // Mark as processed immediately
                    notes: "Migrated from legacy positions collection.",
                };

                const newTxRef = db.collection("transactions").doc(); // Create a new doc with a unique ID
                batch.set(newTxRef, newTransactionData);
            });

            // Commit all the changes at once. This is atomic.
            await batch.commit();

            logger.info(
                `✅ Successfully migrated ${positionsSnapshot.size} positions to transactions for user ${userId}.`
            );
            return { success: true, message: "Migration successful." };
        } catch (error) {
            logger.error(`Migration failed for user ${userId}`, { error });
            throw new HttpsError(
                "internal",
                "An error occurred during data migration. Please try again."
            );
        }
    }
);

// --- Lazy-Initialized Stripe Client ---
let stripe: Stripe;

const getStripeClient = () => {
    if (!stripe) {
        logger.info("Initializing Stripe client.");
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2025-05-28.basil", // Make sure this is up-to-date with your Stripe API version
        });
    }
    return stripe;
};

/**
 * Creates a Stripe Checkout session for a user to upgrade to premium.
 */
export const createCheckoutSession = onCall(
    {
        secrets: ["STRIPE_SECRET_KEY"], // Declare that this function needs the secret
        cors: [/localhost:\d+$/, "https://financeproject-72a60.web.app"],
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "You must be logged in to upgrade."
            );
        }
        const userId = request.auth.uid;
        const userEmail = request.auth.token.email;
        const stripeClient = getStripeClient();

        logger.info(`Creating checkout session for user: ${userId}`);

        try {
            const session = await stripeClient.checkout.sessions.create({
                payment_method_types: ["card"],
                mode: "subscription",
                customer_email: userEmail,
                line_items: [
                    {
                        price: "price_1RYNhAJSzAf30F8KYYJ2CMXv", // IMPORTANT: Replace with your actual Stripe Price ID
                        quantity: 1,
                    },
                ],
                client_reference_id: userId,
                success_url:
                    "https://financeproject-72a60.web.app/dashboard?upgraded=true", // Example domain
                cancel_url:
                    "https://financeproject-72a60.web.app/dashboard?cancelled=true", // Example domain
            });

            if (!session.url) {
                throw new HttpsError(
                    "internal",
                    "Could not create a checkout session."
                );
            }
            return { url: session.url };
        } catch (err: any) {
            logger.error("Stripe error", {
                type: err.type,
                code: err.code,
                message: err.message,
                raw: err.raw,
            });
            throw new HttpsError("internal", "Stripe checkout failed");
        }
    }
);

/**
 * Listens for webhook events from Stripe to fulfill purchases.
 */
export const stripeWebhook = onRequest(
    { secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] },
    async (request, response) => {
        const stripeClient = getStripeClient();
        const signature = request.headers["stripe-signature"] as string;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

        let event: Stripe.Event;

        try {
            event = stripeClient.webhooks.constructEvent(
                request.rawBody,
                signature,
                webhookSecret
            );
        } catch (err: any) {
            logger.error("⚠️ Webhook signature verification failed.", {
                error: err.message,
            });
            response.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.client_reference_id;

            if (!userId) {
                logger.error(
                    "Webhook received with no client_reference_id (userId).",
                    { session }
                );
                response.status(400).send("Error: Missing user ID.");
                return;
            }

            logger.info(
                `✅ Payment successful for user: ${userId}. Upgrading to premium.`
            );
            try {
                const userSummaryRef = db
                    .collection("user_summaries")
                    .doc(userId);
                await userSummaryRef.set(
                    {
                        subscriptionTier: "premium",
                        stripeCustomerId: session.customer,
                    },
                    { merge: true }
                );
                logger.info(
                    `User ${userId} successfully upgraded in Firestore.`
                );
            } catch (dbError) {
                logger.error("Firestore update failed after payment.", {
                    userId,
                    dbError,
                });
            }
        }

        response.status(200).send({ received: true });
    }
);

// PASTE THIS HELPER FUNCTION AT THE END OF index.ts

/**
 * Fetches daily historical price data for a stock symbol for the past year.
 * It aggressively caches the data in the `historical_prices` Firestore collection
 * to minimize API calls to Finnhub.
 * @param {string} symbol The stock symbol to fetch.
 * @param {string} finnhubKey The Finnhub API key.
 * @returns {Promise<Map<string, number>>} A map of date strings (YYYY-MM-DD) to closing prices.
 */
async function getHistoricalPrices(
    symbol: string,
    finnhubKey: string | undefined // Allow it to be undefined
): Promise<Map<string, number>> {
    // --- ADD THIS LOGGING BLOCK ---
    if (!finnhubKey) {
        logger.error(
            `getHistoricalPrices called for ${symbol} but finnhubKey is MISSING.`
        );
        // Return an empty map to prevent a crash
        return new Map();
    }
    // --- END LOGGING BLOCK ---

    const docRef = db.collection("historical_prices").doc(symbol);
    // ... rest of the function remains the same
    const cachedDoc = await docRef.get();

    // Check if we have a recent cache (less than 23 hours old)
    if (cachedDoc.exists) {
        const data = cachedDoc.data();
        if (data && data.lastRefreshed) {
            const lastRefreshed = data.lastRefreshed.toDate();
            const hoursSinceRefresh =
                (new Date().getTime() - lastRefreshed.getTime()) / 36e5;
            if (hoursSinceRefresh < 23) {
                logger.info(`Using cached prices for ${symbol}.`);
                // Reconstruct the Map from the stored object
                return new Map(Object.entries(data.prices || {}));
            }
        }
    }

    logger.info(`Fetching fresh prices for ${symbol} from Finnhub.`);

    const to = Math.floor(Date.now() / 1000);
    const from = to - 31536000; // 365 days in seconds

    try {
        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${finnhubKey}`;
        const { data } = await axios.get(url);

        /* ── UNIVERSAL GUARD ───────────── */
        if (
            data.s !== "ok" ||
            !Array.isArray(data.t) ||
            !Array.isArray(data.c)
        ) {
            logger.warn(`Finnhub reply for ${symbol}:`, {
                status: data.s,
                hint: "non-fatal – skipping this symbol",
            });
            return new Map(); // keep the scheduler job alive
        }
        /* ──────────────────────────────── */

        /* normal path */
        const pricesMap = new Map<string, number>();
        for (let i = 0; i < data.t.length; i++) {
            const date = new Date(data.t[i] * 1000).toISOString().slice(0, 10);
            pricesMap.set(date, data.c[i]);
        }
        /* …cache & return as before… */
        // …save to Firestore cache and return pricesMap …
        // Save the fresh data to the cache as a plain object
        await docRef.set({
            prices: Object.fromEntries(pricesMap),
            lastRefreshed: admin.firestore.FieldValue.serverTimestamp(),
        });

        return pricesMap;
    } catch (error) {
        logger.error(`Failed to fetch historical prices for ${symbol}`, {
            error,
        });
        return new Map();
    }
}
