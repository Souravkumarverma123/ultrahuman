async function main() {
  const email = `testuser_${Date.now()}@example.com`;
  console.log(`Triggering signup API for ${email}...`);
  try {
    const res = await fetch("http://localhost:8000/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "http://localhost:3000",
      },
      body: JSON.stringify({
        email,
        password: "password123",
        name: "Test User",
      }),
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.json());
  } catch (error) {
    console.error("Error calling signup API:", error);
  }
}

main().catch(console.error);
