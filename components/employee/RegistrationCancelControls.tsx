"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestCancellation, type RegistrationStatus } from "@/app/employee/events/actions";
import {
  cancellationRequestSchema,
  type CancellationRequestFormInput,
  type CancellationRequestFormOutput,
} from "@/lib/validations/registration";

// Worker-side cancel controls shared by "המשמרות שלי" and the employee event card (M8v2, AGENTS.md 6):
//  - pending / waitlisted (not yet approved): "ביטול הרשמה" - one-step confirm, withdrawn immediately;
//  - approved: "בקש ביטול" - a request with an optional reason that staff approve or dismiss.
// Both call the same server action / RPC; the returned status picks the toast ('cancelled' = withdrawn).

export const WITHDRAWN_TOAST = "ההרשמה בוטלה";
export const REQUESTED_TOAST = "בקשת הביטול נשלחה לצוות";

export function cancelToastFor(status: RegistrationStatus): string {
  return status === "cancelled" ? WITHDRAWN_TOAST : REQUESTED_TOAST;
}

export function canSelfWithdraw(status: string | null): boolean {
  return status === "pending" || status === "waitlisted";
}

type DoneHandler = (status: RegistrationStatus) => void;

export function WithdrawConfirm({
  registrationId,
  onClose,
  onDone,
}: {
  registrationId: string;
  onClose: () => void;
  onDone: DoneHandler;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const confirm = () => {
    setServerError(null);
    startTransition(async () => {
      const res = await requestCancellation(registrationId);
      if (!res.success) {
        setServerError(res.error);
        return;
      }
      onDone(res.status);
    });
  };

  return (
    <div className="mt-3 space-y-2 border-t border-brass/10 pt-3">
      <p className="text-xs text-cream/70">לבטל את ההרשמה? אפשר להירשם שוב בכל עת</p>
      {serverError && <p className="text-xs text-rose-400">{serverError}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={confirm}
          className="rounded-md bg-rose-500/25 px-3 py-1.5 text-xs font-semibold text-rose-100 disabled:opacity-50"
        >
          {isPending ? "מבטל..." : "כן, לבטל"}
        </button>
        <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-xs text-cream/60">
          חזרה
        </button>
      </div>
    </div>
  );
}

export function CancellationRequestForm({
  registrationId,
  onClose,
  onDone,
}: {
  registrationId: string;
  onClose: () => void;
  onDone: DoneHandler;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CancellationRequestFormInput, unknown, CancellationRequestFormOutput>({
    resolver: zodResolver(cancellationRequestSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = (values: CancellationRequestFormOutput) => {
    setServerError(null);
    startTransition(async () => {
      const res = await requestCancellation(registrationId, values.reason);
      if (!res.success) {
        setServerError(res.error);
        return;
      }
      onDone(res.status);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-2 border-t border-brass/10 pt-3" noValidate>
      <p className="text-xs text-cream/70">
        הבקשה תישלח לצוות לאישור. עד שהבקשה תאושר את/ה עדיין רשום/ה למשמרת. לאחר אישור ניתן יהיה להירשם שוב אם יש מקום.
      </p>
      <label htmlFor={`cancel-reason-${registrationId}`} className="block text-xs text-cream/60">
        סיבה (לא חובה)
      </label>
      <textarea
        id={`cancel-reason-${registrationId}`}
        rows={2}
        {...register("reason")}
        className="w-full rounded-md border border-brass/20 bg-surface2 p-2 text-sm text-cream"
      />
      {(errors.reason?.message || serverError) && (
        <p className="text-xs text-rose-400">{errors.reason?.message ?? serverError}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-rose-500/25 px-3 py-1.5 text-xs font-semibold text-rose-100 disabled:opacity-50"
        >
          {isPending ? "שולח..." : "אישור ושליחת בקשת ביטול"}
        </button>
        <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-xs text-cream/60">
          חזרה
        </button>
      </div>
    </form>
  );
}
