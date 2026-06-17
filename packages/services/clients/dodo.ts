import DodoPayments from "dodopayments";
import crypto from "node:crypto";
import { env } from "../env";

export const dodo = env.DODO_PAYMENTS_API_KEY
  ? new DodoPayments({
      bearerToken: env.DODO_PAYMENTS_API_KEY,
      environment: env.DODO_PAYMENTS_API_KEY.startsWith("dp_test_") ? "test_mode" : "live_mode",
    })
  : null;

export function getDodoClient() {
  if (!dodo) {
    throw new Error(
      "Dodo Payments is not configured. Please set DODO_PAYMENTS_API_KEY in your environment variables.",
    );
  }
  return dodo;
}

/**
 * Verifies the signature of a webhook payload from Dodo Payments.
 * Dodo Payments webhooks comply with the Standard Webhooks specification.
 */
export function verifyDodoWebhookSignature(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
  webhookKey: string
): boolean {
  const webhookId = headers["webhook-id"];
  const webhookTimestamp = headers["webhook-timestamp"];
  const webhookSignature = headers["webhook-signature"];

  if (
    typeof webhookId !== "string" ||
    typeof webhookTimestamp !== "string" ||
    typeof webhookSignature !== "string" ||
    !webhookKey
  ) {
    return false;
  }

  // 1. Prepare secret key (strip whsec_ prefix if present and decode base64)
  let secretKey = webhookKey;
  if (secretKey.startsWith("whsec_")) {
    secretKey = secretKey.substring(6);
  }
  
  let secretBuffer: Buffer;
  try {
    secretBuffer = Buffer.from(secretKey, "base64");
  } catch (err) {
    return false;
  }

  // 2. Payload is construct as: webhookId + "." + webhookTimestamp + "." + rawBody
  const payload = `${webhookId}.${webhookTimestamp}.${rawBody}`;

  // 3. Compute HMAC-SHA256 signature
  const hmac = crypto.createHmac("sha256", secretBuffer);
  hmac.update(payload);
  const calculatedSignature = hmac.digest("base64");

  // 4. Compare with provided signatures (could be multiple, space-separated, with v1, prefix)
  const passedSignatures = webhookSignature.split(" ");
  for (const sig of passedSignatures) {
    const parts = sig.split(",");
    if (parts.length === 2 && parts[0] === "v1") {
      const signatureToVerify = parts[1];
      if (!signatureToVerify) {
        continue;
      }
      try {
        const buf1 = Buffer.from(signatureToVerify, "base64");
        const buf2 = Buffer.from(calculatedSignature, "base64");
        if (buf1.length === buf2.length && crypto.timingSafeEqual(buf1, buf2)) {
          return true;
        }
      } catch (err) {
        // continue
      }
    }
  }

  return false;
}
