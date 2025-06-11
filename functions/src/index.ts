// functions/src/index.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { defineString } from "firebase-functions/params";
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

const finnhubApiKeyParam = defineString("FINNHUB_API_KEY");

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
    },
    async (context) => {
        logger.info("--- (FINAL v5 - Subscription Aware) Refresh Started ---");
        const finnhubKey = finnhubApiKeyParam.value();
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
// PASTE THIS ENTIRE FUNCTION INTO functions/src/index.ts

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
