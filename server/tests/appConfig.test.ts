import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import appConfigRouter from "../src/routes/appConfig";
import { errorHandler } from "../src/middleware/errorHandler";

const configEnvironmentKeys = [
  "CLERK_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
  "EXPO_PUBLIC_DIRECTIONS_API_KEY",
  "EXPO_PUBLIC_GEOAPIFY_API_KEY",
  "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "CLERK_SECRET_KEY",
  "DRIVER_CLERK_SECRET_KEY",
  "GEMINI_API_KEY",
  "CHECK_ID_API_KEY",
  "EXPO_PUBLIC_CHECK_ID_API_KEY",
] as const;
const originalEnvironment = Object.fromEntries(
  configEnvironmentKeys.map((key) => [key, process.env[key]]),
);
const app = express();
app.use("/api/app-config", appConfigRouter);
app.use(errorHandler);

let server: ReturnType<typeof app.listen>;
let origin: string;

before(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  origin = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  for (const key of configEnvironmentKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

function setValidConfiguration() {
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  process.env.CLERK_PUBLISHABLE_KEY = "pk_test_example123$";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example123";
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY =
    "AIza123456789012345678901234567890";
  process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY =
    "AIza123456789012345678901234567890";
  process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY = "0123456789abcdef0123456789abcdef";
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_stripeexample123";
}

test("returns only public app configuration", async () => {
  setValidConfiguration();
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  process.env.STRIPE_SECRET_KEY = "stripe-server-secret";
  process.env.CLERK_SECRET_KEY = "clerk-server-secret";
  process.env.GEMINI_API_KEY = "gemini-server-secret";
  process.env.CHECK_ID_API_KEY = "checkid-server-secret";
  const response = await fetch(`${origin}/api/app-config`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, {
    clerkPublishableKey: "pk_test_example123$",
    supabaseUrl: "https://example.supabase.co",
    supabasePublishableKey: "sb_publishable_example123",
    googleMapsApiKey: "AIza123456789012345678901234567890",
    directionsApiKey: "AIza123456789012345678901234567890",
    geoapifyApiKey: "0123456789abcdef0123456789abcdef",
    stripePublishableKey: "pk_test_stripeexample123",
  });
  const serialized = JSON.stringify(body);
  assert.doesNotMatch(serialized, /service-role-secret|stripe-server-secret/);
  assert.doesNotMatch(serialized, /clerk-server-secret|gemini-server-secret/);
  assert.doesNotMatch(serialized, /checkid-server-secret/);
});

test("rejects missing Clerk configuration", async () => {
  setValidConfiguration();
  delete process.env.CLERK_PUBLISHABLE_KEY;

  const response = await fetch(`${origin}/api/app-config`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Clerk is not configured",
  });
});

test("rejects Supabase keys that are not public", async () => {
  setValidConfiguration();
  process.env.SUPABASE_PUBLISHABLE_KEY = "service-role-secret";

  const response = await fetch(`${origin}/api/app-config`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Supabase is not configured",
  });
});

test("rejects invalid Clerk publishable keys", async () => {
  setValidConfiguration();
  process.env.CLERK_PUBLISHABLE_KEY = "sk_test_not_publishable";

  const response = await fetch(`${origin}/api/app-config`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Clerk is not configured",
  });
});

test("rejects missing Supabase configuration", async () => {
  setValidConfiguration();
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;

  const response = await fetch(`${origin}/api/app-config`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Supabase is not configured",
  });
});

test("does not expose Supabase service-role keys as client configuration", async () => {
  setValidConfiguration();
  process.env.SUPABASE_PUBLISHABLE_KEY = "service-role-secret";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "service-role-secret";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "service-role-secret";
  process.env.SUPABASE_ANON_KEY = "service-role-secret";

  const response = await fetch(`${origin}/api/app-config`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Supabase is not configured",
  });
});
