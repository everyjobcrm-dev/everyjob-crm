# Supabase schema helper

This folder contains helper SQL for the `form_101_submissions` table used by `app/employee/101form/page.tsx`.

To apply it in Supabase:
1. Open Supabase Studio.
2. Go to SQL Editor.
3. Paste the contents of `form_101_submissions.sql`.
4. Run the query.

If your `profiles` table uses a different primary key type, update `user_id uuid REFERENCES public.profiles(id)` accordingly.
