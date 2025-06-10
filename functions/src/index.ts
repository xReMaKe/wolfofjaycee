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
        schedule: "0,15,30,45 * * * *",
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
            logger.info(
                `Found ${uniqueSymbols.length} total unique symbols to fetch.`
            );

            // --- PART 2: Fetch quotes from Finnhub ---
            const quotes: { [symbol: string]: FinnhubQuote } = {};
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
                    const symbol = pos.symbol.toUpperCase();
                    const quantity = pos.quantity;
                    const currentPrice = quotes[symbol]?.c || 0;
                    if (userSummaries[pos.userId] !== undefined) {
                        userSummaries[pos.userId] += quantity * currentPrice;
                    }
                }
            });
            logger.info("FINISHED CALCULATION. Final summary values:", {
                userSummaries,
            });

            // --- PART 5 (RE-ARCHITECTED FOR RELIABILITY) ---
            const summaryBatch = db.batch();
            const now = admin.firestore.Timestamp.now();

            for (const userId in userSummaries) {
                try {
                    const summaryRef = db
                        .collection("user_summaries")
                        .doc(userId);
                    const newTotalValue = userSummaries[userId];
                    const docSnap = await summaryRef.get();
                    let existingHistory: HistoryPoint[] = docSnap.exists
                        ? docSnap.data()?.history || []
                        : [];

                    const newHistoryPoint: HistoryPoint = {
                        timestamp: now,
                        value: newTotalValue,
                    };
                    let newHistory = [...existingHistory, newHistoryPoint];

                    if (newHistory.length > 48) {
                        newHistory = newHistory.slice(newHistory.length - 48);
                    }

                    const updatePayload = {
                        totalValue: newTotalValue,
                        lastUpdated: now,
                        history: newHistory,
                    };

                    summaryBatch.set(summaryRef, updatePayload, {
                        merge: true,
                    });
                } catch (userSummaryError) {
                    logger.error(
                        `Failed to process summary for user ${userId}`,
                        { userSummaryError }
                    );
                }
            }

            await summaryBatch.commit();
            logger.info(
                `Successfully batched summary updates for ${
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
// PASTE THIS ENTIRE CORRECTED BLOCK INTO functions/src/index.ts

// --- Additional Imports for Stripe ---
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";

// --- Lazy-Initialized Stripe Client ---
// We declare the variable here, but we will initialize it INSIDE the functions.
let stripe: Stripe;

// Helper function to initialize Stripe only when needed.
const getStripeClient = () => {
    if (!stripe) {
        logger.info("Initializing Stripe client.");
        // The '!' tells TypeScript we are certain this env var will exist at runtime.
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2025-05-28.basil", // The version that worked for you
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
        const stripeClient = getStripeClient(); // Initialize Stripe on first call

        logger.info(`Creating checkout session for user: ${userId}`);

        try {
            const session = await stripeClient.checkout.sessions.create({
                payment_method_types: ["card"],
                mode: "subscription",
                customer_email: userEmail,
                line_items: [
                    {
                        price: "price_1RYNhAJSzAf30F8KYYJ2CMXv", // IMPORTANT: Replace
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
                raw: err.raw, // full API response from Stripe
            });
            throw new HttpsError("internal", "Stripe checkout failed");
        }
        // } catch (error) {
        //     logger.error("Stripe session creation failed:", { error });
        //     throw new HttpsError(
        //         "internal",
        //         "An error occurred with our payment provider."
        //     );
        // }
    }
);

/**
 * Listens for webhook events from Stripe to fulfill purchases.
 */
export const stripeWebhook = onRequest(
    { secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] }, // Declare secrets
    async (request, response) => {
        const stripeClient = getStripeClient(); // Initialize Stripe on first call
        const signature = request.headers["stripe-signature"] as string;
        // The webhook secret is now guaranteed to exist here.
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
