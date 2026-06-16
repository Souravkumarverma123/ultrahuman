import { describe, test, expect } from "vitest";
import request from "supertest";
import app from "../../apps/api/src/server";

describe("Critical User Journey E2E Simulator", () => {
  test("simulates guest landing page, OpenAPI metadata fetch, and unique tracing ID generation", async () => {
    // 1. Visit root API URL
    const rootRes = await request(app).get("/");
    expect(rootRes.status).toBe(200);
    expect(rootRes.body.message).toBe("Ultrahuman is up and running...");

    // 2. Fetch Scalar OpenAPI document JSON structure
    const openapiRes = await request(app).get("/openapi.json");
    expect(openapiRes.status).toBe(200);
    expect(openapiRes.body.openapi).toBeDefined();
    expect(openapiRes.body.info.title).toBe("Ultrahuman OpenAPI");

    // 3. Assert correlation tracking assigns unique IDs to consecutive request cycles
    const res1 = await request(app).get("/");
    const id1 = res1.headers["x-correlation-id"];
    expect(id1).toBeDefined();

    const res2 = await request(app).get("/");
    const id2 = res2.headers["x-correlation-id"];
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });
});
