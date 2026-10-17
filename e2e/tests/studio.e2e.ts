import { expect, test, type Page } from "@playwright/test";

const user = process.env.ARMOR_STUDIO_USER ?? "";
const password = process.env.ARMOR_STUDIO_PASSWORD ?? "";

async function signIn(page: Page): Promise<void> {
  await page.goto("/");
  // The sign-in screen speaks the language of the browser, so the fields are found by their test ids and not by their words.
  await page.getByTestId("login-user").fill(user);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await expect(page.locator(".sidebar")).toBeVisible();
}

test("the login screen shows and refuses a wrong password", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "A.R.M.O.R. Studio" })).toBeVisible();
  await page.getByTestId("login-user").fill("nobody");
  await page.getByTestId("login-password").fill("not-the-password");
  await page.getByTestId("login-submit").click();
  await expect(page.getByRole("alert")).toBeVisible();
});

test.describe("signed in", () => {
  test.skip(!user || !password, "set ARMOR_STUDIO_USER and ARMOR_STUDIO_PASSWORD");

  test("every menu opens without a script error", async ({ page }) => {
    const problems: string[] = [];
    page.on("pageerror", error => problems.push(`pageerror: ${error.message}`));
    page.on("console", message => { if (message.type() === "error") problems.push(`console: ${message.text()}`); });
    await signIn(page);
    const buttons = page.locator(".sidebar nav button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(8);
    for (let index = 0; index < count; index += 1) {
      const button = buttons.nth(index);
      const label = (await button.innerText()).trim();
      await button.click();
      await expect(button, `menu "${label}" is the active one`).toHaveClass(/active/);
      await expect(page.locator(".topbar h1"), `menu "${label}" has a title`).not.toHaveText("");
      await page.waitForTimeout(400);
    }
    // The browser reports a failed request (an offline camera, for one) as a console error: only script errors fail the test.
    expect(problems.filter(item => item.startsWith("pageerror")), problems.join("\n")).toEqual([]);
  });

  test("the configuration menu offers the node firmware and the notifications", async ({ page }) => {
    await signIn(page);
    await page.locator(".sidebar nav button", { hasText: /configuraci|configuration/i }).first().click();
    const tabs = page.locator(".config-tabs");
    await expect(tabs.getByText(/firmware/i).first()).toBeVisible();
    await expect(tabs.getByText(/notificaci|notifications/i).first()).toBeVisible();
    for (const tab of await tabs.locator("button").all()) { await tab.click(); await page.waitForTimeout(300); await expect(page.locator(".config-tabs")).toBeVisible(); }
  });
});

for (const [width, height] of [[1366, 768], [1093, 614]] as const) {
  test(`every menu fits a ${width}x${height} screen without sideways scrolling`, async ({ page }) => {
    test.skip(!user || !password, "set ARMOR_STUDIO_USER and ARMOR_STUDIO_PASSWORD");
    await page.setViewportSize({ width, height });
    await signIn(page);
    const buttons = page.locator(".sidebar nav button");
    const count = await buttons.count();
    for (let index = 0; index < count; index += 1) {
      const button = buttons.nth(index);
      const label = (await button.innerText()).trim();
      await button.click();
      await page.waitForTimeout(300);
      const wider = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(wider, `menu "${label}" at ${width}x${height}`).toBeLessThanOrEqual(1);
    }
  });
}
