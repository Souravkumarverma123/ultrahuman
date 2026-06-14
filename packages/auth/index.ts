import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@repo/database";

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
      const fs = require("fs");
      const path = require("path");
      const logPath = path.join(__dirname, "debug.log");
      
      const log = (msg: string) => {
        console.log(msg);
        try {
          fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);
        } catch (e) {}
      };

      log(`[Better Auth Debug] sendVerificationEmail triggered for ${user.email}`);
      log(`[Better Auth Debug] RESEND_API_KEY loaded: ${resendApiKey ? `Yes (length: ${resendApiKey.length}, prefix: ${resendApiKey.substring(0, 5)}...)` : 'No'}`);
      
      if (resendApiKey) {
        try {
          log(`[Better Auth Debug] Sending API request to Resend...`);
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
            log(`[Better Auth Debug] Resend API error status: ${res.status}`);
            log(`[Better Auth Debug] Resend API response: ${resData}`);
          } else {
            log(`[Better Auth Debug] Verification email successfully sent to ${user.email} via Resend. Response: ${resData}`);
          }
          return;
        } catch (error: any) {
          log(`[Better Auth Debug] Exception occurred sending via Resend: ${error.message || error}`);
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
