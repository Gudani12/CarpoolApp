import { Router } from "express";
import crypto from "node:crypto";
import { getSupabaseServerClient } from "../services/supabase";

const router = Router();

const KYC_WORKFLOW_ID = "57368fe7-f4dc-487f-bebe-981305685d81";

function shortenFloats(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(shortenFloats);
    if (v && typeof v === "object") {
        return Object.fromEntries(
            Object.entries(v as Record<string, unknown>).map(([k, x]) => [
                k,
                shortenFloats(x),
            ]),
        );
    }
    if (typeof v === "number" && !Number.isInteger(v) && v % 1 === 0)
        return Math.trunc(v);
    return v;
}

function sortKeys(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === "object") {
        return Object.keys(v as object)
            .sort()
            .reduce<Record<string, unknown>>((acc, k) => {
                acc[k] = sortKeys((v as Record<string, unknown>)[k]);
                return acc;
            }, {});
    }
    return v;
}

router.post("/", async (request, response) => {
    const rawBody =
        typeof request.body === "string" ? request.body : JSON.stringify(request.body);

    const secret = process.env.DIDIT_WEBHOOK_SECRET;
    if (!secret) {
        console.error("didit-webhook: DIDIT_WEBHOOK_SECRET not set");
        response.status(500).send("server not configured");
        return;
    }

    const signature = request.header("x-signature-v2") ?? "";

    let parsed: any;
    try {
        parsed = JSON.parse(rawBody);
    } catch {
        response.status(400).send("invalid json");
        return;
    }

    const canonical = JSON.stringify(sortKeys(shortenFloats(parsed)));
    const expected = crypto
        .createHmac("sha256", secret)
        .update(canonical, "utf8")
        .digest("hex");

    if (
        signature.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    ) {
        console.error("didit-webhook: bad signature");
        response.status(401).send("bad sig");
        return;
    }

    const ts = Number(parsed.timestamp);
    if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) {
        response.status(401).send("stale");
        return;
    }

    const clerkId: string | undefined = parsed.vendor_data;
    const status: string | undefined = parsed.status;
    const decision = parsed.decision ?? {};
    const workflowId: string | undefined = parsed.workflow_id;

    console.log(
        `didit-webhook: session=${parsed.session_id} status=${status} workflow=${workflowId} vendor=${clerkId}`,
    );

    if (!clerkId) {
        response.status(200).send("ok");
        return;
    }

    if (workflowId !== KYC_WORKFLOW_ID) {
        console.log(`didit-webhook: ignoring non-KYC workflow ${workflowId}`);
        response.status(200).send("ok");
        return;
    }

    const supabase = getSupabaseServerClient();
    const idVerifications = Array.isArray(decision.id_verifications)
        ? decision.id_verifications
        : [];
    const idApproved = idVerifications.some((v: any) => v?.status === "Approved");

    const update: Record<string, unknown> = {
        didit_decision: decision,
        didit_verified_at: new Date().toISOString(),
    };

    switch (status) {
        case "Approved": {
            if (idApproved) update.id_verified = true;
            const firstId = idVerifications[0];
            if (firstId) {
                if (firstId.document_number) update.id_number = firstId.document_number;
                if (firstId.first_name) update.first_name = firstId.first_name;
                if (firstId.last_name) update.last_name = firstId.last_name;
                if (firstId.date_of_birth) update.date_of_birth = firstId.date_of_birth;
            }
            break;
        }
        case "Declined": {
            update.id_verified = false;
            update.rejection_reason =
                decision?.reviews?.[0]?.comment ??
                "Identity verification was declined.";
            break;
        }
        case "Kyc Expired": {
            update.id_verified = false;
            break;
        }
        default:
            break;
    }

    const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", clerkId)
        .maybeSingle();

    if (existing) {
        const { error } = await supabase
            .from("users")
            .update(update)
            .eq("clerk_id", clerkId);
        if (error) console.error("didit-webhook: DB update failed", error);
    } else {
        const { error } = await supabase.from("users").insert({
            clerk_id: clerkId,
            id_verified: false,
            passport_verified: false,
            profile_data: {},
            ...update,
        });
        if (error) console.error("didit-webhook: DB insert failed", error);
    }

    response.status(200).send("ok");
});

export default router;