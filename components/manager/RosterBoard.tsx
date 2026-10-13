"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ArrowUpCircle, Check, Clock, Search, Star, UserMinus, UserPlus, X } from "lucide-react";
import {
  approveCancellation,
  approveRegistration,
  promoteWaitlist,
  rejectCancellation,
  rejectRegistration,
  removeScheduledEmployee,
  scheduleEmployee,
  searchEmployeesForEvent,
  setEmployeeRate,
  type EmployeeSearchResult,
} from "@/app/manager/actions";
import {
  BUCKET_LABEL,
  BUCKET_ORDER,
  REGISTRATION_STATUS_LABEL,
  acceptsStaffActions,
  displayName,
  occupiedSlots,
  rosterBucket,
  type RosterBucket,
  type RosterRole,
  type RosterRow,
} from "@/lib/events/roster";
import {
  SCHEDULE_WARNING_LABEL,
  employeeSearchSchema,
  removalSchema,
  wageRateSchema,
  type EmployeeSearchFormInput,
  type EmployeeSearchFormOutput,
  type RemovalFormInput,
  type RemovalFormOutput,
  type WageRateFormInput,
  type WageRateFormOutput,
} from "@/lib/validations/registration";
import { AttendanceModal, type AttendanceTarget } from "@/components/manager/AttendanceModal";

// Staff roster for one event, fed by get_event_roster. Which actions appear is a UX decision only; every action is
// re-checked by the server action (role) and by the SECURITY DEFINER RPC (scope, not-own, capacity, event status).

type Props = {
  eventId: string;
  eventStatus: string;
  viewerId: string;
  canSeeRates: boolean; // admin / manager
  canEnterAttendance: boolean; // manager and above
  roles: RosterRole[];
  rows: RosterRow[];
};

const BUCKET_TONE: Record<RosterBucket, string> = {
  cancellation: "text-rose-400",
  approved: "text-indigo-300",
  pending: "text-cream/80",
  waitlisted: "text-[#D4FF00]",
  inactive: "text-cream/40",
};

const btn =
  "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer";

export function RosterBoard({ eventId, eventStatus, viewerId, canSeeRates, canEnterAttendance, roles, rows }: Props) {
  const [attendance, setAttendance] = useState<AttendanceTarget | null>(null);
  const actionable = acceptsStaffActions(eventStatus);

  // rows whose role was deleted still show, under a catch-all section
  const knownRoleIds = new Set(roles.map((r) => r.id));
  const orphanRows = rows.filter((r) => !r.event_role_id || !knownRoleIds.has(r.event_role_id));

  return (
    <div className="space-y-8">
      {!actionable && (
        <p className="border-s-2 border-[#D4FF00] bg-surface px-4 py-3 text-xs text-cream/70">
          פעולות שיבוץ זמינות רק כשהאירוע פתוח או סגור להרשמה. הרשימה מוצגת לקריאה בלבד.
        </p>
      )}

      {roles.map((role) => {
        const roleRows = rows.filter((r) => r.event_role_id === role.id);
        const occupied = occupiedSlots(rows, role.id);
        return (
          <section key={role.id} className="overflow-hidden rounded-xl border border-brass/15 bg-surface">
            <header className="flex flex-wrap items-end justify-between gap-3 border-b border-brass/10 bg-surface2 px-5 py-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-cream">{role.roleName}</h3>
                <p className="text-xs text-cream/45">
                  {role.startTime?.slice(0, 5)}
                  {role.endTime ? `–${role.endTime.slice(0, 5)}` : ""}
                </p>
              </div>
              <p className={`text-sm font-semibold ${occupied >= role.headcount ? "text-[#D4FF00]" : "text-cream/70"}`}>
                {occupied}/{role.headcount} מקומות תפוסים
              </p>
            </header>

            <div className="space-y-6 p-5">
              {actionable && <SchedulePanel eventId={eventId} role={role} full={occupied >= role.headcount} />}
              <Buckets
                eventId={eventId}
                rows={roleRows}
                roleFull={occupied >= role.headcount}
                {...{ actionable, viewerId, canSeeRates, canEnterAttendance }}
                onAttendance={(row) =>
                  setAttendance({
                    registrationId: row.registration_id,
                    name: displayName(row),
                    roleName: role.roleName,
                    startTime: role.startTime,
                    endTime: role.endTime,
                    reportedHours: row.reported_hours,
                  })
                }
              />
            </div>
          </section>
        );
      })}

      {orphanRows.length > 0 && (
        <section className="rounded-xl border border-brass/10 bg-surface p-5">
          <h3 className="mb-3 font-display text-base text-cream/70">ללא תפקיד</h3>
          <Buckets
            eventId={eventId}
            rows={orphanRows}
            roleFull
            actionable={false}
            viewerId={viewerId}
            canSeeRates={canSeeRates}
            canEnterAttendance={false}
            onAttendance={() => undefined}
          />
        </section>
      )}

      {rows.length === 0 && roles.length === 0 && (
        <p className="text-center text-sm text-cream/40">לאירוע אין תפקידים עדיין.</p>
      )}

      {attendance && <AttendanceModal target={attendance} onClose={() => setAttendance(null)} />}
    </div>
  );
}

function Buckets(props: {
  eventId: string;
  rows: RosterRow[];
  roleFull: boolean;
  actionable: boolean;
  viewerId: string;
  canSeeRates: boolean;
  canEnterAttendance: boolean;
  onAttendance: (row: RosterRow) => void;
}) {
  const grouped = new Map<RosterBucket, RosterRow[]>();
  for (const row of props.rows) {
    const b = rosterBucket(row);
    grouped.set(b, [...(grouped.get(b) ?? []), row]);
  }
  const waitlisted = grouped.get("waitlisted");
  waitlisted?.sort((a, b) => (a.waitlist_position ?? 0) - (b.waitlist_position ?? 0));

  if (props.rows.length === 0) return <p className="text-xs text-cream/40">אין רישומים לתפקיד זה.</p>;

  return (
    <>
      {BUCKET_ORDER.map((bucket) => {
        const list = grouped.get(bucket);
        if (!list?.length) return null;
        const body = (
          <div className="space-y-2">
            {list.map((row) => (
              <RegRow key={row.registration_id} row={row} bucket={bucket} {...props} />
            ))}
          </div>
        );
        if (bucket === "inactive") {
          return (
            <details key={bucket} className="group">
              <summary className={`mb-2 cursor-pointer text-xs font-semibold ${BUCKET_TONE[bucket]}`}>
                {BUCKET_LABEL[bucket]} ({list.length})
              </summary>
              {body}
            </details>
          );
        }
        return (
          <div key={bucket}>
            <h4 className={`mb-2 flex items-center gap-1.5 text-xs font-semibold ${BUCKET_TONE[bucket]}`}>
              {bucket === "cancellation" && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
              {bucket === "waitlisted" && <Clock className="h-3.5 w-3.5" aria-hidden="true" />}
              {BUCKET_LABEL[bucket]} ({list.length})
            </h4>
            {body}
          </div>
        );
      })}
    </>
  );
}

function RegRow({
  eventId,
  row,
  bucket,
  roleFull,
  actionable,
  viewerId,
  canSeeRates,
  canEnterAttendance,
  onAttendance,
}: {
  eventId: string;
  row: RosterRow;
  bucket: RosterBucket;
  roleFull: boolean;
  actionable: boolean;
  viewerId: string;
  canSeeRates: boolean;
  canEnterAttendance: boolean;
  onAttendance: (row: RosterRow) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const isOwn = row.user_id === viewerId;
  const isStaffWorker = row.worker_role != null && row.worker_role !== "employee";
  const canAct = actionable && !isOwn;

  function run(fn: () => Promise<{ success: true } | { success: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  }

  const muted = bucket === "inactive";

  return (
    <div
      className={
        "rounded-lg border p-3.5 transition-colors " +
        (bucket === "cancellation"
          ? "border-rose-500/25 bg-rose-500/5"
          : muted
            ? "border-brass/5 bg-surface2/40 opacity-70"
            : "border-brass/10 bg-surface2 hover:border-brass/25")
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            {bucket === "waitlisted" && row.waitlist_position != null && (
              <span className="rounded-sm bg-[#D4FF00]/15 px-1.5 text-xs font-bold text-[#D4FF00]">
                #{row.waitlist_position}
              </span>
            )}
            <p className="text-sm font-medium text-cream">{displayName(row)}</p>
            {isStaffWorker && (
              <span className="rounded-sm bg-indigo-500/15 px-1.5 py-0.5 text-[11px] text-indigo-300">צוות</span>
            )}
            {isOwn && <span className="rounded-sm bg-cream/10 px-1.5 py-0.5 text-[11px] text-cream/60">את/ה</span>}
            {row.average_rating != null && Number(row.average_rating) > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-brass">
                <Star className="h-3 w-3 fill-brass text-brass" aria-hidden="true" />
                {Number(row.average_rating).toFixed(1)}
              </span>
            )}
          </div>
          <p className="text-xs text-cream/50">
            {row.phone_number || "ללא טלפון"}
            {row.age != null ? ` · גיל ${row.age}` : ""}
            {muted ? ` · ${REGISTRATION_STATUS_LABEL[row.status] ?? row.status}` : ""}
            {bucket === "cancellation" ? ` · ${REGISTRATION_STATUS_LABEL[row.status] ?? row.status}` : ""}
          </p>
          {row.submission_status && (
            <p className="text-xs text-cream/45">
              דוח שעות: {row.submission_status === "approved" ? "אושר" : row.submission_status === "rejected" ? "נדחה" : "הוגש"}
              {row.reported_hours != null ? ` (${row.reported_hours} שעות)` : ""}
            </p>
          )}
        </div>

        {canAct && (
          <div className="flex flex-wrap items-center gap-2">
            {bucket === "cancellation" && (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => approveCancellation(eventId, row.registration_id))}
                  className={`${btn} bg-rose-500/20 text-rose-200 hover:bg-rose-500/30`}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" /> אישור ביטול
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => rejectCancellation(eventId, row.registration_id))}
                  className={`${btn} border border-brass/20 text-cream/70 hover:bg-surface`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" /> דחיית הבקשה
                </button>
              </>
            )}

            {bucket === "pending" && (
              <>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => approveRegistration(eventId, row.registration_id))}
                  className={`${btn} bg-[#4F46E5] text-white hover:bg-indigo-600`}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" /> אישור
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => rejectRegistration(eventId, row.registration_id))}
                  className={`${btn} border border-brass/20 text-cream/70 hover:bg-surface`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" /> דחייה
                </button>
              </>
            )}

            {bucket === "waitlisted" && (
              <>
                <button
                  type="button"
                  disabled={isPending || roleFull}
                  title={roleFull ? "התפקיד מלא" : undefined}
                  onClick={() => run(() => promoteWaitlist(eventId, row.registration_id))}
                  className={`${btn} bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30`}
                >
                  <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden="true" /> שיבוץ מהמתנה
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => rejectRegistration(eventId, row.registration_id))}
                  className={`${btn} border border-brass/20 text-cream/70 hover:bg-surface`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" /> דחייה
                </button>
              </>
            )}

            {bucket === "approved" && canSeeRates && (
              <RateForm eventId={eventId} registrationId={row.registration_id} current={row.wage_rate} />
            )}

            {bucket === "approved" && canEnterAttendance && (
              <button
                type="button"
                onClick={() => onAttendance(row)}
                className={`${btn} bg-[#4F46E5] text-white hover:bg-indigo-600`}
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {row.submission_id ? "עדכון דיווח" : "דיווח שעות"}
              </button>
            )}

            {(bucket === "approved" || bucket === "pending" || bucket === "waitlisted") && !removing && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setRemoving(true)}
                className={`${btn} text-rose-300 hover:bg-rose-500/10`}
              >
                <UserMinus className="h-3.5 w-3.5" aria-hidden="true" /> הסרה
              </button>
            )}
          </div>
        )}

        {!canAct && bucket === "approved" && canSeeRates && row.wage_rate != null && (
          <p className="text-xs text-cream/60">₪{Number(row.wage_rate).toFixed(2)} לשעה</p>
        )}
      </div>

      {removing && (
        <RemoveForm
          eventId={eventId}
          registrationId={row.registration_id}
          name={displayName(row)}
          onDone={() => setRemoving(false)}
        />
      )}
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

function RateForm({ eventId, registrationId, current }: { eventId: string; registrationId: string; current: number | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WageRateFormInput, unknown, WageRateFormOutput>({
    resolver: zodResolver(wageRateSchema),
    defaultValues: { wageRate: current ?? undefined },
  });

  const onSubmit = (values: WageRateFormOutput) => {
    setServerError(null);
    startTransition(async () => {
      const res = await setEmployeeRate(eventId, registrationId, values.wageRate);
      if (!res.success) setServerError(res.error);
      else router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-end gap-1" noValidate>
      <div className="flex items-center gap-1">
        <label className="sr-only" htmlFor={`rate-${registrationId}`}>
          תעריף שעתי
        </label>
        <input
          id={`rate-${registrationId}`}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          placeholder="₪/שעה"
          {...register("wageRate")}
          className="w-24 rounded-md border border-brass/15 bg-surface px-2 py-1.5 text-xs text-cream"
        />
        <button type="submit" disabled={isPending} className={`${btn} bg-brass/15 font-semibold text-brass`}>
          שמירה
        </button>
      </div>
      {(errors.wageRate?.message || serverError) && (
        <span className="text-xs text-rose-400">{errors.wageRate?.message ?? serverError}</span>
      )}
    </form>
  );
}

function RemoveForm({
  eventId,
  registrationId,
  name,
  onDone,
}: {
  eventId: string;
  registrationId: string;
  name: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RemovalFormInput, unknown, RemovalFormOutput>({
    resolver: zodResolver(removalSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = (values: RemovalFormOutput) => {
    setServerError(null);
    startTransition(async () => {
      const res = await removeScheduledEmployee(eventId, registrationId, values.reason);
      if (!res.success) {
        setServerError(res.error);
        return;
      }
      onDone();
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-2 border-s-2 border-rose-500/40 ps-3" noValidate>
      <label htmlFor={`reason-${registrationId}`} className="block text-xs text-cream/70">
        הסרת {name} מהאירוע. לאחר הסרה לא ניתן להירשם מחדש באופן עצמאי. סיבה (חובה):
      </label>
      <textarea
        id={`reason-${registrationId}`}
        rows={2}
        {...register("reason")}
        className="w-full rounded-md border border-brass/20 bg-surface p-2 text-sm text-cream"
      />
      {(errors.reason?.message || serverError) && (
        <p className="text-xs text-rose-400">{errors.reason?.message ?? serverError}</p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className={`${btn} bg-rose-500/25 text-rose-100 hover:bg-rose-500/35`}>
          {isPending ? "מסיר..." : "אישור הסרה"}
        </button>
        <button type="button" onClick={onDone} className={`${btn} text-cream/60 hover:bg-surface`}>
          ביטול
        </button>
      </div>
    </form>
  );
}

function SchedulePanel({ eventId, role, full }: { eventId: string; role: RosterRole; full: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<EmployeeSearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string[] | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeSearchFormInput, unknown, EmployeeSearchFormOutput>({
    resolver: zodResolver(employeeSearchSchema),
    defaultValues: { query: "" },
  });

  const onSearch = (values: EmployeeSearchFormOutput) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await searchEmployeesForEvent(eventId, values.query);
      if (!res.success) {
        setError(res.error);
        setResults(null);
      } else setResults(res.results);
    });
  };

  const onSchedule = (employee: EmployeeSearchResult) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await scheduleEmployee(eventId, role.id, employee.employeeId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setResults(null);
      // warnings never block scheduling; they are shown once as a notice
      setNotice(res.warnings.map((w) => `${employee.name}: ${SCHEDULE_WARNING_LABEL[w] ?? w}`));
      router.refresh();
    });
  };

  if (!open) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={full}
          title={full ? "התפקיד מלא" : undefined}
          className={`${btn} border border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/10`}
        >
          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> שיבוץ עובד/ת לתפקיד
        </button>
        <ScheduleNotice notice={notice} />
      </div>
    );
  }

  return (
    <div className="space-y-3 border-s-2 border-indigo-500/40 ps-3">
      <form onSubmit={handleSubmit(onSearch)} className="flex flex-wrap items-start gap-2" noValidate>
        <div>
          <label htmlFor={`search-${role.id}`} className="sr-only">
            חיפוש עובד/ת לפי שם או טלפון
          </label>
          <input
            id={`search-${role.id}`}
            placeholder="שם או טלפון"
            {...register("query")}
            className="w-56 rounded-md border border-brass/20 bg-surface px-2.5 py-1.5 text-sm text-cream"
          />
          {errors.query?.message && <p className="mt-1 text-xs text-rose-400">{errors.query.message}</p>}
        </div>
        <button type="submit" disabled={isPending} className={`${btn} bg-indigo-500/20 text-indigo-100`}>
          <Search className="h-3.5 w-3.5" aria-hidden="true" /> חיפוש
        </button>
        <button type="button" onClick={() => setOpen(false)} className={`${btn} text-cream/60`}>
          סגירה
        </button>
      </form>

      {results && results.length === 0 && <p className="text-xs text-cream/50">לא נמצאו עובדים.</p>}
      {results && results.length > 0 && (
        <ul className="divide-y divide-brass/10 rounded-md border border-brass/10">
          {results.map((emp) => {
            const blocked = emp.registrationStatus != null && !["cancelled", "removed"].includes(emp.registrationStatus);
            return (
              <li key={emp.employeeId} className="flex items-center justify-between gap-3 px-3 py-2">
                <div>
                  <p className="text-sm text-cream">{emp.name}</p>
                  <p className="text-xs text-cream/45">
                    {emp.phone ?? "ללא טלפון"}
                    {emp.age != null ? ` · גיל ${emp.age}` : ""}
                    {emp.averageRating != null && Number(emp.averageRating) > 0
                      ? ` · דירוג ${Number(emp.averageRating).toFixed(1)}`
                      : ""}
                    {emp.registrationStatus
                      ? ` · ${REGISTRATION_STATUS_LABEL[emp.registrationStatus] ?? emp.registrationStatus} באירוע זה`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending || blocked}
                  onClick={() => onSchedule(emp)}
                  className={`${btn} bg-[#4F46E5] text-white hover:bg-indigo-600`}
                >
                  שיבוץ
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <ScheduleNotice notice={notice} />
    </div>
  );
}

function ScheduleNotice({ notice }: { notice: string[] | null }) {
  if (!notice) return null;
  if (notice.length === 0) return <p className="text-xs text-indigo-300">העובד/ת שובץ/ה בהצלחה.</p>;
  return (
    <div className="border-s-2 border-[#D4FF00] bg-[#D4FF00]/5 px-3 py-2 text-xs text-cream/80" role="status">
      <p className="font-semibold text-[#D4FF00]">השיבוץ בוצע, לתשומת לבך:</p>
      <ul className="mt-1 list-disc ps-4">
        {notice.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}
