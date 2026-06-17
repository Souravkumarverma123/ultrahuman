import { z, zodUndefinedModel } from "../../schema";
import { router, protectedProcedure } from "../../trpc";
import { getDodoClient } from "@repo/services/clients/dodo";
import { db, payments, user, eq } from "@repo/database";
import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";

const TAGS = ["Payment"];

export const paymentRouter = router({
  // 1. Create a Dodo Payments checkout order
  createCheckoutOrder: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/payment/create-order", tags: TAGS } })
    .input(
      z.object({
        billingPeriod: z.enum(["monthly", "annual"]),
      }),
    )
    .output(
      z.object({
        checkoutUrl: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const userEmail = ctx.session.user.email;
      const userName = ctx.session.user.name || "";
      const dodo = getDodoClient();

      const monthlyProductId = process.env.DODO_PAYMENTS_MONTHLY_PRODUCT_ID;
      const annualProductId = process.env.DODO_PAYMENTS_ANNUAL_PRODUCT_ID;

      if (!monthlyProductId || !annualProductId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Dodo Payments product IDs are not configured on the server.",
        });
      }

      const productId = input.billingPeriod === "annual" ? annualProductId : monthlyProductId;
      // Price in Subunits (₹999 => 99900 paise, ₹1,199 => 119900 paise)
      const amount = input.billingPeriod === "annual" ? 119900 : 99900;
      const localPaymentId = `pay_${crypto.randomUUID()}`;
      
      const webUrl = process.env.WEB_URL || "http://localhost:3000";
      const returnUrl = `${webUrl}/settings?payment=success`;

      try {
        const session = await dodo.checkoutSessions.create({
          product_cart: [
            {
              product_id: productId,
              quantity: 1,
            },
          ],
          customer: {
            email: userEmail,
            name: userName,
          },
          return_url: returnUrl,
          metadata: {
            paymentId: localPaymentId,
            userId,
            billingPeriod: input.billingPeriod,
          },
        });

        if (!session.session_id || !session.checkout_url) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to retrieve session identifier or checkout URL from Dodo Payments.",
          });
        }

        // Save transaction to DB
        await db.insert(payments).values({
          id: localPaymentId,
          userId,
          dodoCheckoutSessionId: session.session_id,
          amount,
          status: "pending",
        });

        return {
          checkoutUrl: session.checkout_url,
        };
      } catch (error: any) {
        console.error("Dodo Payments order creation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create payment session with Dodo Payments",
        });
      }
    }),

  // 2. Retrieve user's subscription and payment details
  getUserBillingInfo: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/payment/billing-info", tags: TAGS } })
    .input(zodUndefinedModel)
    .output(
      z.object({
        subscriptionTier: z.string(),
        transactions: z.array(
          z.object({
            id: z.string(),
            dodoCheckoutSessionId: z.string(),
            dodoPaymentId: z.string().nullable(),
            amount: z.number(),
            status: z.string(),
            createdAt: z.date(),
          }),
        ),
      }),
    )
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      // 1. Fetch user subscription state
      const [currentUser] = await db
        .select({ subscriptionTier: user.subscriptionTier })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (!currentUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User account not found",
        });
      }

      // 2. Fetch payment transactions log
      const txs = await db
        .select({
          id: payments.id,
          dodoCheckoutSessionId: payments.dodoCheckoutSessionId,
          dodoPaymentId: payments.dodoPaymentId,
          amount: payments.amount,
          status: payments.status,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .where(eq(payments.userId, userId))
        .orderBy(payments.createdAt);

      return {
        subscriptionTier: currentUser.subscriptionTier,
        transactions: txs.map((tx) => ({
          ...tx,
          createdAt: new Date(tx.createdAt),
        })),
      };
    }),
});
