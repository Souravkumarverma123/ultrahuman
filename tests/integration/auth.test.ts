import { describe, test, expect } from "vitest";
import request from "supertest";
import app from "../../apps/api/src/server";

describe("Express Server Hardening & Health", () => {
  test("injects correlation ID and security headers into responses", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["x-correlation-id"]).toBeDefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("verifies deep database connectivity inside health endpoint", async () => {
    const res = await request(app).get("/health");
    expect([200, 503]).toContain(res.status);
    expect(res.body.status).toBeDefined();
    expect(res.body.services).toBeDefined();
    expect(res.body.services.database).toBeDefined();
  });

  test("rejects POST requests with non-JSON content types for API endpoints", async () => {
    const res = await request(app)
      .post("/api/any-route")
      .set("content-type", "text/plain")
      .send("plain-text-payload");
    expect(res.status).toBe(415);
    expect(res.body.error).toContain("Content-Type must be application/json");
  });
});
