import { expect, test } from "@playwright/test";
import { expectNoCrash } from "./helpers";

test("landing and login render in Hebrew, right-to-left", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expectNoCrash(page);

  await page.goto("/login");
  await expect(page.locator("#identifier")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
});

test("staff pages redirect a signed-out visitor to login", async ({ page }) => {
  await page.goto("/admin/hours");
  await expect(page).toHaveURL(/\/login/);
});

test("unknown page shows the Hebrew 404", async ({ page }) => {
  await page.goto("/no-such-page-e2e");
  await expect(page.getByRole("heading", { name: "הדף שחיפשת לא נמצא" })).toBeVisible();
});

test("legal pages are reachable", async ({ page }) => {
  for (const path of ["/terms", "/privacy", "/accessibility"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
  }
});
