import { Router } from "express";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

router.get("/", (_request, response) => {
  const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY?.trim();

  if (
    !clerkPublishableKey ||
    !/^pk_(test|live)_[A-Za-z0-9]+\$?$/.test(clerkPublishableKey)
  ) {
    throw new HttpError(503, "Clerk is not configured");
  }

  response.setHeader("Cache-Control", "public, max-age=300");
  response.json({ clerkPublishableKey });
});

export default router;
