-- ROLLBACK ARTIFACT R0: verbatim live definition captured 2026-10-12 from project yjgqunrboxihxtgkxibw (md5-verified against pg_get_*def). Rolls back p1_m0.
-- Apply ONLY to roll back the corresponding p1_* migration.
CREATE OR REPLACE FUNCTION public.guard_profile_protected_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  -- service role and direct DB sessions have no auth.uid(): allowed
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not public.is_current_user_admin() then
      new.role := 'employee';
      new.can_create_events := false;
    end if;
    return new;
  end if;

  if (new.role is distinct from old.role
      or new.can_create_events is distinct from old.can_create_events)
     and not public.is_current_user_admin() then
    raise exception 'protected profile fields can only be changed by an admin'
      using errcode = '42501';
  end if;

  return new;
end;
$function$
;
