import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

export function configureSupabaseClient(url: string, publishableKey: string) {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Render returned an invalid Supabase URL");
  }
  if (
    parsedUrl.protocol !== "https:" ||
    !publishableKey.trim() ||
    publishableKey.startsWith("sb_secret_")
  ) {
    throw new Error("Render returned invalid Supabase client configuration");
  }

  supabaseClient = createSupabaseClient(parsedUrl.origin, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function getSupabaseClient() {
  if (!supabaseClient) {
    throw new Error("Supabase client has not been configured from the API.");
  }

  return supabaseClient;
}
