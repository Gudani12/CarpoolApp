import { getSupabaseServerClient } from "@/lib/supabase-server";

type Action = "set_status" | "archive" | "restore" | "delete" | "force_reverify";

interface ActionPayload {
    passengerId: number;
    action: Action;
    status?: "active" | "suspended";
    reason?: string;
    decidedBy?: string;
}

export async function POST(request: Request) {
    try {
        const body: ActionPayload = await request.json();
        const { passengerId, action, status, reason, decidedBy } = body;

        if (!passengerId || !action) {
            return Response.json(
                {
                    error: "missing_fields",
                    message: "passengerId and action are required.",
                },
                { status: 400 },
            );
        }

        const supabase = await getSupabaseServerClient();

        // Fetch the passenger so we know its current state
        const { data: passenger, error: lookupError } = await supabase
            .from("users")
            .select("id, clerk_id, profile_data")
            .eq("id", passengerId)
            .maybeSingle();

        if (lookupError || !passenger) {
            console.error("admin-passenger-action: passenger not found", lookupError);
            return Response.json(
                { error: "passenger_not_found", message: "Passenger not found." },
                { status: 404 },
            );
        }

        const profileData =
            passenger.profile_data && typeof passenger.profile_data === "object"
                ? (passenger.profile_data as Record<string, any>)
                : {};

        const now = new Date().toISOString();
        const auditLine = `[${now}] ${action} by ${decidedBy ?? "admin"}${reason ? ` — ${reason}` : ""}`;
        const existingNotes = Array.isArray(profileData.admin_notes)
            ? profileData.admin_notes
            : [];

        switch (action) {
            case "set_status": {
                if (status !== "active" && status !== "suspended") {
                    return Response.json(
                        { error: "invalid_status", message: "status must be active or suspended." },
                        { status: 400 },
                    );
                }

                const { error } = await supabase
                    .from("users")
                    .update({
                        profile_data: {
                            ...profileData,
                            suspended: status === "suspended",
                            archived: false,
                            admin_notes: [auditLine, ...existingNotes].slice(0, 100),
                        },
                        updated_at: now,
                    })
                    .eq("id", passengerId);

                if (error) {
                    console.error("admin-passenger-action: set_status failed", error);
                    return Response.json(
                        { error: "update_failed", message: error.message },
                        { status: 500 },
                    );
                }
                return Response.json({ success: true, status });
            }

            case "archive": {
                const { error } = await supabase
                    .from("users")
                    .update({
                        profile_data: {
                            ...profileData,
                            archived: true,
                            archived_at: now,
                            archived_reason: reason ?? null,
                            admin_notes: [auditLine, ...existingNotes].slice(0, 100),
                        },
                        updated_at: now,
                    })
                    .eq("id", passengerId);

                if (error) {
                    console.error("admin-passenger-action: archive failed", error);
                    return Response.json(
                        { error: "update_failed", message: error.message },
                        { status: 500 },
                    );
                }
                return Response.json({ success: true });
            }

            case "restore": {
                const { error } = await supabase
                    .from("users")
                    .update({
                        profile_data: {
                            ...profileData,
                            archived: false,
                            suspended: false,
                            archived_at: null,
                            archived_reason: null,
                            admin_notes: [auditLine, ...existingNotes].slice(0, 100),
                        },
                        updated_at: now,
                    })
                    .eq("id", passengerId);

                if (error) {
                    console.error("admin-passenger-action: restore failed", error);
                    return Response.json(
                        { error: "update_failed", message: error.message },
                        { status: 500 },
                    );
                }
                return Response.json({ success: true });
            }

            case "delete": {
                const { error } = await supabase
                    .from("users")
                    .delete()
                    .eq("id", passengerId);

                if (error) {
                    console.error("admin-passenger-action: delete failed", error);
                    return Response.json(
                        { error: "delete_failed", message: error.message },
                        { status: 500 },
                    );
                }
                return Response.json({ success: true });
            }

            case "force_reverify": {
                const { error } = await supabase
                    .from("users")
                    .update({
                        id_verified: false,
                        passport_verified: false,
                        id_number: null,
                        passport_number: null,
                        date_of_birth: null,
                        id_citizenship: null,
                        rejection_reason: null,
                        didit_session_id: null,
                        didit_decision: null,
                        didit_verified_at: null,
                        profile_data: {
                            ...profileData,
                            admin_notes: [auditLine, ...existingNotes].slice(0, 100),
                        },
                        updated_at: now,
                    })
                    .eq("id", passengerId);

                if (error) {
                    console.error("admin-passenger-action: force_reverify failed", error);
                    return Response.json(
                        { error: "update_failed", message: error.message },
                        { status: 500 },
                    );
                }
                return Response.json({ success: true });
            }

            default:
                return Response.json(
                    { error: "invalid_action", message: `Unknown action: ${action}` },
                    { status: 400 },
                );
        }
    } catch (err: any) {
        console.error("admin-passenger-action: server error", err);
        return Response.json(
            {
                error: "internal_error",
                message: err?.message ?? "Unexpected error.",
            },
            { status: 500 },
        );
    }
}