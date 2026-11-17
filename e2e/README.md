# Smoke tests (Playwright)

```bash
npx playwright install chromium     # once
npm run test:e2e                    # starts next dev on :3100
E2E_BASE_URL=https://<domain> npm run test:e2e
```

Signed-in tests run only when these are set (in the shell or `.env.local`, never committed):

| Variable | Example |
|---|---|
| `E2E_PASSWORD` | the shared demo password |
| `E2E_ADMIN_EMAIL`, `E2E_MANAGER_EMAIL`, `E2E_RECRUITER_EMAIL`, `E2E_EMPLOYEE_EMAIL` | demo sign-in accounts |

The tests are read-only (open screens, download exports, check role boundaries), so they are safe on the demo
database. Write paths (register, approve, submit and approve hours) are covered by `supabase/tests/*.sql`.
