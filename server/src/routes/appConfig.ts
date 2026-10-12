import { Router } from "express";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

function isPublicSupabaseKey(key: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;

  const [header, payload, signature] = key.split(".");
  if (!header || !payload || !signature) return false;

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { role?: unknown };
    return claims.role === "anon";
  } catch {
    return false;
  }
}

router.get("/", (_request, response) => {
  const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY?.trim();
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL
  )?.trim();
  const supabasePublishableKey = [
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
  ]
    .map((key) => key?.trim())
    .find((key): key is string => Boolean(key && isPublicSupabaseKey(key)));
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const directionsApiKey =
    process.env.EXPO_PUBLIC_DIRECTIONS_API_KEY?.trim() || googleMapsApiKey;
  const geoapifyApiKey = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY?.trim();
  const stripePublishableKey = (
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY
  )?.trim();

  if (
    !clerkPublishableKey ||
    !/^pk_(test|live)_[A-Za-z0-9]+\$?$/.test(clerkPublishableKey)
  ) {
    throw new HttpError(503, "Clerk is not configured");
  }

  let parsedSupabaseUrl: URL;
  try {
    parsedSupabaseUrl = new URL(supabaseUrl ?? "");
  } catch {
    throw new HttpError(503, "Supabase is not configured");
  }

  if (
    parsedSupabaseUrl.protocol !== "https:" ||
    !supabasePublishableKey
  ) {
    throw new HttpError(503, "Supabase is not configured");
  }

  if (
    !googleMapsApiKey ||
    !/^AIza[A-Za-z0-9_-]{20,}$/.test(googleMapsApiKey) ||
    !directionsApiKey ||
    !/^AIza[A-Za-z0-9_-]{20,}$/.test(directionsApiKey)
  ) {
    throw new HttpError(503, "Google Maps is not configured");
  }

  if (!geoapifyApiKey || !/^[A-Za-z0-9_-]{16,}$/.test(geoapifyApiKey)) {
    throw new HttpError(503, "Geoapify is not configured");
  }

  if (
    !stripePublishableKey ||
    !/^pk_(test|live)_[A-Za-z0-9]+$/.test(stripePublishableKey)
  ) {
    throw new HttpError(503, "Stripe is not configured");
  }

  response.setHeader("Cache-Control", "public, max-age=300");
  response.json({
    clerkPublishableKey,
    supabaseUrl: parsedSupabaseUrl.origin,
    supabasePublishableKey,
    googleMapsApiKey,
    directionsApiKey,
    geoapifyApiKey,
    stripePublishableKey,
  });
});

export default router;
