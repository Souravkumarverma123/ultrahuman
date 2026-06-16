import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@repo/database";
import { logger } from "@repo/logger";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }: { user: { email: string; name: string }; url: string }) => {
      const resendApiKey = process.env.RESEND_API_KEY;

      logger.info(`[Better Auth] sendVerificationEmail triggered for ${user.email}`);
      logger.info(`[Better Auth] RESEND_API_KEY loaded: ${resendApiKey ? `Yes (length: ${resendApiKey.length}, prefix: ${resendApiKey.substring(0, 5)}...)` : 'No'}`);
      
      if (resendApiKey) {
        try {
          logger.info(`[Better Auth] Sending API request to Resend...`);
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "onboarding@resend.dev",
              to: [user.email],
              subject: "Verify your email address",
              html: `<p>Hello ${user.name},</p><p>Please verify your email address by clicking <a href="${url}">here</a>.</p>`,
            }),
          });
          const resData = await res.text();
          if (!res.ok) {
            logger.error(`[Better Auth] Resend API error status: ${res.status}`);
            logger.error(`[Better Auth] Resend API response: ${resData}`);
          } else {
            logger.info(`[Better Auth] Verification email successfully sent to ${user.email} via Resend. Response: ${resData}`);
          }
          return;
        } catch (error: any) {
          logger.error(`[Better Auth] Exception occurred sending via Resend: ${error.message || error}`);
        }
      }

      // Fallback/Development mode console logging
      console.log("\n============================================================");
      console.log("📨 Better Auth - Email Verification Required");
      console.log(`To: ${user.email}`);
      console.log(`Name: ${user.name}`);
      console.log(`Verification URL: ${url}`);
      console.log("============================================================\n");
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  trustedOrigins: [process.env.WEB_URL || "http://localhost:3000"],
});

export type Auth = typeof auth;
