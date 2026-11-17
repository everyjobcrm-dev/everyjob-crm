import { expect, test } from "@playwright/test";
import { credentials, expectNoCrash, signIn } from "./helpers";

test.describe("employee", () => {
  test.skip(!credentials("employee"), "E2E_EMPLOYEE_EMAIL / E2E_PASSWORD not set");

  test("home, open shifts and my shifts load on a phone", async ({ page }) => {
    await signIn(page, "employee");
    await expect(page).toHaveURL(/\/employee\/dashboard/);
    for (const path of ["/employee/events", "/employee/shifts", "/employee/notifications"]) {
      await page.goto(path);
      await expectNoCrash(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow, `${path} scrolls sideways`).toBe(false);
    }
  });

  test("cannot open staff screens", async ({ page }) => {
    await signIn(page, "employee");
    await page.goto("/manager/events");
    await expect(page).toHaveURL(/\/employee\/dashboard/);
  });
});
