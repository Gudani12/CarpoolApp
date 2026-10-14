import { Router } from "express";
import { HttpError } from "../middleware/errorHandler";
import { getSupabaseServerClient } from "../services/supabase";

const router = Router();

router.post("/", async (request, response) => {
  const clerkId = response.locals.authUserId as string;
  const body = request.body as Record<string, unknown> | undefined;
  const name = body?.name;
  const email = body?.email;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !/^\S+@\S+\.\S+$/.test(email.trim())
  ) {
    throw new HttpError(400, "A valid name and email are required");
  }

  const supabase = getSupabaseServerClient();
  const { data: existingUser, error: existingError } = await supabase
    .from("users")
    .select("id, name, email, clerk_id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingUser) {
    response.json({ data: existingUser });
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      clerk_id: clerkId,
    })
    .select("id, name, email, clerk_id")
    .single();

  if (error) throw error;
  response.status(201).json({ data });
});

export default router;
