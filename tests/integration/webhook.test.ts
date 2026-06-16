import { describe, test, expect } from "vitest";
import request from "supertest";
import app from "../../apps/api/src/server";

describe("Webhook Routing & Hardening", () => {
  test("allows content types other than application/json for webhook endpoint", async () => {
    const res = await request(app)
      .post("/webhooks/corsair")
      .set("content-type", "application/octet-stream")
      .send("raw-payload-here");
    
    // Bypasses the 415 JSON constraint, though fails with 500 due to invalid webhook signatures
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Webhook processing failed");
  });

  test("rejects webhook payloads exceeding 2mb body size limit", async () => {
    const hugePayload = "X".repeat(2.5 * 1024 * 1024); // 2.5 MB
    const res = await request(app)
      .post("/webhooks/corsair")
      .set("content-type", "application/json")
      .send(hugePayload);
    
    expect(res.status).toBe(413); // Payload Too Large
  });
});
