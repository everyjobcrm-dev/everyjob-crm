# Stack module: Next.js (App Router) + Vercel

## Review points

- Every server action re-verifies role/scope on the server (a `requireRole()`-style guard at the top);
  client context is UX only.
- Zod + react-hook-form with transforms: `useForm<z.input<S>, unknown, z.output<S>>` — the single-generic form
  silently types fields as `unknown`.
- Unique-violation (23505) and other DB errors map to user-facing copy in the product language, through the
  project's one error-mapping module.
- `revalidatePath` / `revalidateTag` after mutations that change what a server component renders.
- No derived aggregates computed in components when a DB view exists.
- RTL products: logical classes only (`ms/me/ps/pe/start/end`), never `ml/mr/pl/pr/left/right`.

## Owner's local test loop (Windows / PowerShell)

```powershell
cd <repo path from lead-profile.md>
git fetch origin
git checkout <branch>
git pull
npm install
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```
After a role change in the DB: log out and log in again (the session caches the role).
`core.autocrlf=true` on Windows produces CRLF working copies; a repo `.gitattributes` with `eol=lf` avoids it.

## Vercel

- Env vars are per environment (Production / Preview / Development). A key that works locally and fails only
  on previews (401 from the backend) usually means a wrong or missing Preview value.
- Server-only secrets (service-role keys) must exist where server routes run, and never be `NEXT_PUBLIC_`.
- Dev-only bypass flags must not be set in Production — check by name each ship.
- Smoke test after deploy: login per role, one read and one write per role, one forbidden action refused.
