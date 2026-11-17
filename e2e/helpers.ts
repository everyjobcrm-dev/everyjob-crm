import { expect, type Page } from "@playwright/test";

export type Role = "admin" | "manager" | "recruiter" | "employee";

// Credentials come only from the environment, never from the repo.
export function credentials(role: Role): { email: string; password: string } | null {
  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`];
  const password = process.env.E2E_PASSWORD;
  return email && password ? { email, password } : null;
}

export async function signIn(page: Page, role: Role) {
  const creds = credentials(role);
  if (!creds) throw new Error(`missing E2E_${role.toUpperCase()}_EMAIL or E2E_PASSWORD`);
  await page.goto("/login");
  await page.locator("#identifier").fill(creds.email);
  await page.locator("#password").fill(creds.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

// No English error text or stack trace may reach the screen.
export async function expectNoCrash(page: Page) {
  await expect(page.locator("body")).not.toContainText(/Application error|Unhandled Runtime Error|TypeError/);
}
