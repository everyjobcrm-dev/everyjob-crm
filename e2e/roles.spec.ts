import { expect, test } from "@playwright/test";
import { credentials, expectNoCrash, signIn } from "./helpers";

// Read-only by design: these run against a shared database (demo data), so they open screens and download
// exports but never approve, register or edit. Write-path coverage lives in the SQL behaviour tests
// (supabase/tests/) until a separate test database exists (roadmap Stage 5).

test.describe("admin", () => {
  test.skip(!credentials("admin"), "E2E_ADMIN_EMAIL / E2E_PASSWORD not set");

  test("hour approval board and payroll export", async ({ page }) => {
    await signIn(page, "admin");
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.goto("/admin/hours");
    await expect(page.getByRole("heading", { name: "אישור שעות" })).toBeVisible();
    await expectNoCrash(page);

    const month = new Date().toISOString().slice(0, 7);
    const res = await page.request.get(`/admin/payroll/export?month=${month}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("spreadsheetml");
  });
});

test.describe("manager", () => {
  test.skip(!credentials("manager"), "E2E_MANAGER_EMAIL / E2E_PASSWORD not set");

  test("events list and an event roster", async ({ page }) => {
    await signIn(page, "manager");
    await expect(page).toHaveURL(/\/manager\/events/);
    const first = page.locator('a[href^="/manager/events/"]').first();
    await first.click();
    await expect(page).toHaveURL(/\/manager\/events\/[0-9a-f-]{36}/);
    await expectNoCrash(page);
  });

  test("cannot open the Admin area", async ({ page }) => {
    await signIn(page, "manager");
    await page.goto("/admin/payroll");
    await expect(page).not.toHaveURL(/\/admin\/payroll/);
  });
});

test.describe("recruiter", () => {
  test.skip(!credentials("recruiter"), "E2E_RECRUITER_EMAIL / E2E_PASSWORD not set");

  test("sees own events, payroll export is refused", async ({ page }) => {
    await signIn(page, "recruiter");
    await expect(page).toHaveURL(/\/manager\/events/);
    const res = await page.request.get(`/admin/payroll/export?month=${new Date().toISOString().slice(0, 7)}`);
    expect(res.headers()["content-type"] ?? "").not.toContain("spreadsheetml");
  });
});
