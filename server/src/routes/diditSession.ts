import { Router } from "express";
import { HttpError } from "../middleware/errorHandler";
import { getSupabaseServerClient } from "../services/supabase";

const router = Router();

const KYC_WORKFLOW_ID = "57368fe7-f4dc-487f-bebe-981305685d81";

router.post("/", async (request, response) => {
    const clerkId = response.locals.authUserId as string;
    const apiKey = process.env.DIDIT_API_KEY;

    if (!apiKey) {
        throw new HttpError(500, "Verification service is not configured");
    }

    const callbackUrl =
        typeof request.body?.callbackUrl === "string"
            ? request.body.callbackUrl
            : undefined;

    const payload: Record<string, unknown> = {
        workflow_id: KYC_WORKFLOW_ID,
        vendor_data: clerkId,
    };
    if (callbackUrl) payload.callback = callbackUrl;

    const res = await fetch("https://verification.didit.me/v3/session/", {
        method: "POST",
        headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const raw = await res.text();

    if (!res.ok) {
        console.error("didit-session: Didit error", res.status, raw);
        throw new HttpError(502, "Could not start identity verification session");
    }

    let session: any;
    try {
        session = JSON.parse(raw);
    } catch {
        throw new HttpError(502, "Verification service returned an invalid response");
    }

    const supabase = getSupabaseServerClient();
    const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", clerkId)
        .maybeSingle();

    if (existing) {
        await supabase
            .from("users")
            .update({ didit_session_id: session.session_id })
            .eq("clerk_id", clerkId);
    } else {
        await supabase.from("users").insert({
            clerk_id: clerkId,
            id_verified: false,
            passport_verified: false,
            didit_session_id: session.session_id,
            profile_data: {},
        });
    }

    response.json({
        data: {
            session_id: session.session_id,
            session_token: session.session_token,
            url: session.url,
        },
    });
});

export default router;