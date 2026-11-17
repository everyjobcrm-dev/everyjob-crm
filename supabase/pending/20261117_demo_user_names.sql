-- APPLIED 2026-11-17 by Claude via Supabase MCP (owner-approved). Demo data, NOT a migration.
-- Previous values (for undo), email -> first_name / last_name / gender:
--   +mgr מנהל/שטח/male · +rec1 מגייס/א/female · +rec2 מגייס/ב/male · +emp1 עובד/א/male · +emp2 עובד/ב/male
--   +minor עובד/לא חוקי/male
-- Gives the demo sign-in users realistic Hebrew names for the sales meeting (roadmap Stage 1).
-- Owner runs it in the SQL Editor. Matches users by email (docs/handoff.md §2). The Admin (the owner) is unchanged.
-- Passwords are NOT set here: set them in Supabase Dashboard -> Authentication -> Users and keep them in a password
-- manager, never in the repo.
-- Undo: the previous names are printed by STEP 1; run an UPDATE with them.

-- STEP 1 (read-only): current names, keep this output for undo.
SELECT email, first_name, last_name, gender, role FROM public.profiles
 WHERE email LIKE 'samohayosef+%@gmail.com' ORDER BY role, email;

-- STEP 2
UPDATE public.profiles p SET first_name = v.fn, last_name = v.ln, gender = v.gd
  FROM (VALUES
    ('samohayosef+mgr@gmail.com',   'רונית', 'אלמוג',  'female'),  -- manager (field manager in the demo)
    ('samohayosef+rec1@gmail.com',  'אבי',   'שושן',   'male'),    -- recruiter, owns the demo events
    ('samohayosef+rec2@gmail.com',  'גלית',  'ברזילי', 'female'),  -- recruiter without create permission
    ('samohayosef+emp1@gmail.com',  'שחר',   'עמר',    'male'),    -- employee, באר שבע / דרום
    ('samohayosef+emp2@gmail.com',  'ליאור', 'קדוש',   'female'),  -- employee, תל אביב / מרכז
    ('samohayosef+minor@gmail.com', 'נוי',   'טל',     'female')   -- employee under 18 (min_age demo)
  ) AS v(email, fn, ln, gd)
 WHERE p.email = v.email;

-- Keep the auth metadata in step, so nothing that reads it shows the old name.
UPDATE auth.users u SET raw_user_meta_data = u.raw_user_meta_data
       || jsonb_build_object('first_name', p.first_name, 'last_name', p.last_name, 'gender', p.gender)
  FROM public.profiles p
 WHERE p.id = u.id AND p.email IN ('samohayosef+mgr@gmail.com','samohayosef+rec1@gmail.com','samohayosef+rec2@gmail.com',
                                   'samohayosef+emp1@gmail.com','samohayosef+emp2@gmail.com','samohayosef+minor@gmail.com');

-- Verify (read-only): STEP 1 again; expect the six new names.
