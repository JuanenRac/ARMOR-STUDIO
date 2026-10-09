import { expect, test, type Page } from "@playwright/test";

const user = process.env.ARMOR_STUDIO_USER ?? "";
const password = process.env.ARMOR_STUDIO_PASSWORD ?? "";

async function signIn(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Usuario").fill(user);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar a Studio" }).click();
  await expect(page.locator(".sidebar")).toBeVisible();
}

test("the login screen shows and refuses a wrong password", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "A.R.M.O.R. Studio" })).toBeVisible();
  await page.getByLabel("Usuario").fill("nobody");
  await page.getByLabel("Contraseña").fill("not-the-password");
  await page.getByRole("button", { name: "Entrar a Studio" }).click();
  await expect(page.getByRole("alert")).toContainText("No se pudo iniciar sesión");
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
    await expect(page.getByRole("button", { name: /firmware/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /notificaci|notifications/i }).first()).toBeVisible();
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
