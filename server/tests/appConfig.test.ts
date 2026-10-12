import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import appConfigRouter from "../src/routes/appConfig";
import { errorHandler } from "../src/middleware/errorHandler";

const originalPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
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
  if (originalPublishableKey === undefined) {
    delete process.env.CLERK_PUBLISHABLE_KEY;
  } else {
    process.env.CLERK_PUBLISHABLE_KEY = originalPublishableKey;
  }
});

test("returns only the valid Clerk publishable key", async () => {
  process.env.CLERK_PUBLISHABLE_KEY = "pk_test_example123$";

  const response = await fetch(`${origin}/api/app-config`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    clerkPublishableKey: "pk_test_example123$",
  });
});

test("rejects missing Clerk configuration", async () => {
  delete process.env.CLERK_PUBLISHABLE_KEY;

  const response = await fetch(`${origin}/api/app-config`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Clerk is not configured",
  });
});

test("rejects invalid Clerk publishable keys", async () => {
  process.env.CLERK_PUBLISHABLE_KEY = "sk_test_not_publishable";

  const response = await fetch(`${origin}/api/app-config`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Clerk is not configured",
  });
});
