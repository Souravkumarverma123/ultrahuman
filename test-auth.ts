import "dotenv/config";
import { auth } from "@repo/auth";

async function testSocialSignIn() {
  try {
    console.log("Testing social sign-in...");
    console.log("BETTER_AUTH_URL:", process.env.BETTER_AUTH_URL);
    console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "SET" : "NOT SET");
    console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "SET" : "NOT SET");
    
    const response = await auth.api.signInSocial({
      body: {
        provider: "google",
        callbackURL: "/inbox",
      },
      headers: new Headers({
        "origin": "http://localhost:3000",
      }),
    });
    
    console.log("Response status:", response.status);
    console.log("Response URL:", response.url);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));
    const text = await response.text();
    console.log("Response body:", text);
  } catch (error: any) {
    console.error("ERROR:", error);
    console.error("Stack:", error.stack);
  }
}

testSocialSignIn();
