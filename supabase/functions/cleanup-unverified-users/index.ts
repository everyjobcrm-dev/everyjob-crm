import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TTL_HOURS = 24;
const DEPENDENCY_CHECKS = [
  { table: "event_registrations", columns: ["user_id", "recruiter_id"] },
  { table: "employee_documents", columns: ["employee_id", "verified_by"] },
  { table: "employee_ratings", columns: ["employee_id", "rater_id"] },
  { table: "employee_role_skills", columns: ["employee_id", "approved_by"] },
  { table: "shift_hour_submissions", columns: ["employee_id", "submitted_by", "reviewed_by"] },
  { table: "form_101_submissions", columns: ["user_id", "updated_by"] },
  { table: "clients", columns: ["created_by"] },
  { table: "recruiter_bonuses", columns: ["recruiter_id"] },
] as const;

type CleanupMode = "dry-run" | "delete";

type Candidate = {
  id: string;
  email: string | null;
  created_at: string;
  email_confirmed_at: string | null;
};

type Dependency = {
  table: string;
  column: string;
  error?: string;
};

function maskTz(tz: string | null | undefined): string | null {
  if (!tz) return null;
  return `${"*".repeat(Math.max(0, tz.length - 2))}${tz.slice(-2)}`;
}

function getAge(createdAt: string, now: Date) {
  const ageSeconds = Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 1000));
  return {
    age_seconds: ageSeconds,
    age_minutes: Math.floor(ageSeconds / 60),
  };
}

async function findDependencies(admin: ReturnType<typeof createClient>, userId: string): Promise<Dependency[]> {
  const dependencies: Dependency[] = [];

  for (const check of DEPENDENCY_CHECKS) {
    for (const column of check.columns) {
      const { data, error } = await admin
        .from(check.table)
        .select("id")
        .eq(column, userId)
        .limit(1);

      if (error) {
        // A missing table/column is reported and blocks deletion. It is safer to
        // require an operator to review the live schema than to guess.
        dependencies.push({ table: check.table, column, error: error.message });
        continue;
      }

      if (data && data.length > 0) {
        dependencies.push({ table: check.table, column });
      }
    }
  }

  return dependencies;
}

async function listCandidates(admin: ReturnType<typeof createClient>, cutoff: Date): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  const pageSize = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: pageSize });
    if (error) throw new Error(`Unable to list Auth users: ${error.message}`);

    const pageCandidates = (data.users as Candidate[]).filter((user) =>
      user.email_confirmed_at === null &&
      new Date(user.created_at).getTime() < cutoff.getTime(),
    );
    candidates.push(...pageCandidates);

    if (data.users.length < pageSize) break;
  }

  return candidates;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "POST required" }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Missing Supabase service-role configuration" }, { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${serviceRoleKey}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const requestedMode = body?.mode === "delete" ? "delete" : "dry-run" as CleanupMode;
  const mode: CleanupMode = requestedMode;
  const deletionConfirmation = body?.confirm === "DELETE_UNVERIFIED_USERS";
  const now = new Date();
  const cutoff = new Date(now.getTime() - TTL_HOURS * 60 * 60 * 1000);
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const candidates = await listCandidates(admin, cutoff);
    const results = [];

    for (const user of candidates) {
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("id, tz")
        .eq("id", user.id)
        .maybeSingle();

      const age = getAge(user.created_at, now);
      const base = {
        id: user.id,
        tz_masked: maskTz(profile?.tz),
        created_at: user.created_at,
        deletion_checked_at: now.toISOString(),
        ...age,
        email_confirmed_at: user.email_confirmed_at,
      };

      if (profileError) {
        results.push({ ...base, action: "blocked", reason: "profile_lookup_failed", error: profileError.message });
        continue;
      }

      if (!profile) {
        results.push({ ...base, action: "blocked", reason: "profile_missing" });
        continue;
      }

      const dependencies = await findDependencies(admin, user.id);
      if (dependencies.length > 0) {
        results.push({ ...base, action: "blocked", reason: "dependent_rows_found", dependencies });
        continue;
      }

      if (mode === "dry-run") {
        results.push({ ...base, action: "would_delete" });
        continue;
      }

      if (!deletionConfirmation) {
        results.push({ ...base, action: "blocked", reason: "missing_delete_confirmation" });
        continue;
      }

      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteError) {
        results.push({ ...base, action: "delete_failed", error: deleteError.message });
        continue;
      }

      // The profiles.id foreign key is ON DELETE CASCADE in the live schema.
      // Keep this log as the deletion audit record; tz is intentionally masked.
      console.log("unverified_user_deleted", {
        id: user.id,
        tz_masked: maskTz(profile.tz),
        created_at: user.created_at,
        deletion_timestamp: now.toISOString(),
        age_seconds: age.age_seconds,
        age_minutes: age.age_minutes,
      });
      results.push({ ...base, action: "deleted" });
    }

    return Response.json({
      mode,
      ttl_hours: TTL_HOURS,
      cutoff: cutoff.toISOString(),
      executed_at: now.toISOString(),
      candidate_count: candidates.length,
      results,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Cleanup failed" },
      { status: 500 },
    );
  }
});
