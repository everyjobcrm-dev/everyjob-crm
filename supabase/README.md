# Supabase workflow

This folder contains helper SQL used by the app, including the employee form-101 flow and schema adjustments for the Phase 1 database work.

Use the standard CLI workflow for migration changes in this repo:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

For one-off local SQL work in Supabase Studio:
1. Open Supabase Studio.
2. Go to SQL Editor.
3. Paste the relevant `.sql` file from this folder.
4. Run the query.

If your `profiles` table uses a different primary key type, update `user_id uuid REFERENCES public.profiles(id)` accordingly.
