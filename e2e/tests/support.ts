import { expect, type Page } from "@playwright/test";

const user = process.env.ARMOR_STUDIO_USER ?? "";
const password = process.env.ARMOR_STUDIO_PASSWORD ?? "";

/** A browser that has never seen Studio is offered the welcome tour, which covers the page: the tests start as a person who has already seen it. */
export async function quiet(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try { window.localStorage.setItem("armor-studio-prefs-v1", JSON.stringify({ tutorial: false, tourAutoStart: false })); } catch { /* storage blocked: the tour may appear */ }
  });
}

/** Opens Studio and signs in with the user of the environment; the sign-in screen speaks the language of the browser, so its fields are found by their test ids. */
export async function signIn(page: Page): Promise<void> {
  await quiet(page);
  await page.goto("/");
  await page.getByTestId("login-user").fill(user);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await expect(page.locator(".sidebar")).toBeVisible();
}

/** The entries of the menu (the titles of its groups, which fold them, are not entries). */
export const menuEntries = (page: Page) => page.locator(".sidebar nav button:not(.nav-group-title)");
