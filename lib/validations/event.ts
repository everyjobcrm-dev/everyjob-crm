import { z } from "zod";

// Accepts "" (from a plain <input type="number">), null (from a
// Controller-driven field like base_rate), or a real number, and
// normalizes blanks to null.
function nullableNumber(schema: z.ZodNumber) {
  return z
    .union([z.literal(""), z.null(), schema])
    .transform((v) => (v === "" ? null : v))
    .optional();
}

export const eventRoleSchema = z.object({
  role_name: z.string().min(1, "יש להזין שם תפקיד"),
  headcount: z.coerce.number().int().min(1, "כמות חייבת להיות לפחות 1"),
  start_time: z.string().min(1, "יש להזין שעת התחלה"),
  end_time: z.string().min(1, "יש להזין שעת סיום"),
  base_rate: nullableNumber(z.coerce.number().positive("תעריף לא תקין")),
});

export const createEventSchema = z.object({
  client_id: z.string().uuid("יש לבחור לקוח"),
  event_date: z.string().min(1, "יש להזין תאריך"),
  start_time: z.string().min(1, "יש להזין שעת התחלה"),
  // Not collected on creation — set later at closeEvent(), once the shift
  // has actually happened. Left fully optional here on purpose.
  end_time: z.string().optional(),
  location: z.string().min(1, "יש להזין מיקום"),
  notes: z.string().optional(),
  dress_code: z.string().optional(),
  min_age: nullableNumber(z.coerce.number().int().positive("גיל לא תקין")),
  min_rating: nullableNumber(z.coerce.number().min(0, "מינימום 0").max(5, "מקסימום 5")),
  travel_budget_per_worker: nullableNumber(z.coerce.number().nonnegative("תקציב לא תקין")),
  roles: z.array(eventRoleSchema).min(1, "יש להוסיף לפחות תפקיד אחד"),
});

// ── two shapes, one schema ──────────────────────────────────────────────
// Because the schema coerces/transforms (numbers from "", "" from empty
// number inputs, base_rate normalized to null), the shape react-hook-form
// works with while the user is typing (raw, pre-validation — "" is a
// legal in-progress value) is NOT the same shape createEvent() receives
// after a successful submit (parsed, numbers-only). Trying to force both
// onto a single generic is exactly what produced the "two different types
// with this name" / Control<> mismatch errors — RHF has a 3-generic
// pattern for precisely this split (see CreateEventForm's useForm call):
//
//   useForm<CreateEventFormValues, any, CreateEventInput>({
//     resolver: zodResolver(createEventSchema),
//   })
//
// register()/control()/errors work against CreateEventFormValues (input);
// handleSubmit's onValid callback receives CreateEventInput (output).
export type CreateEventFormValues = z.input<typeof createEventSchema>;
export type CreateEventInput = z.output<typeof createEventSchema>;

export type EventRoleFormValues = z.input<typeof eventRoleSchema>;
export type EventRoleInput = z.output<typeof eventRoleSchema>;

export const emptyRole: EventRoleFormValues = {
  role_name: "",
  headcount: 1,
  start_time: "18:00",
  end_time: "23:00",
  base_rate: null,
};