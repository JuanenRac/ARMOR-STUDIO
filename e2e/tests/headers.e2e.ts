import { expect, test, type Page } from "@playwright/test";
import { menuEntries, signIn } from "./support";

const user = process.env.ARMOR_STUDIO_USER ?? "";
const password = process.env.ARMOR_STUDIO_PASSWORD ?? "";

// The two screens Studio is used on, and the languages that write the most: the introduction under the title of every menu and of every tab of the settings must run along the width of
// its card and not be squeezed into a column. `lines` is the height of the text over its line height.
const SCREENS = [{ width: 1920, height: 1080, most: 3 }, { width: 1366, height: 768, most: 4 }];
const LANGUAGES = ["es", "de", "pt"];

type Intro = { text: string; lines: number };

/** The introductions at the top of what is on screen: the paragraphs of some length in the first 330 pixels, at least half as wide as the window (the ones in a side column are not introductions), that are not in a list or a table. */
async function introductions(page: Page): Promise<Intro[]> {
  return page.evaluate(() => {
    const found: { text: string; lines: number }[] = [];
    for (const element of document.querySelectorAll(".main-stage p, .main-stage .muted")) {
      const text = (element.textContent ?? "").trim();
      const box = element.getBoundingClientRect();
      if (text.length < 60 || box.width === 0 || box.top > 330 || box.width < window.innerWidth * 0.5 || element.closest(".nav-card, li, table, .log, pre, .designer-link")) continue;
      found.push({ text: text.slice(0, 70), lines: Math.round(box.height / (parseFloat(getComputedStyle(element).lineHeight) || 20)) });
    }
    return found;
  });
}

test.describe("the introductions of the menus", () => {
  test.skip(!user || !password, "set ARMOR_STUDIO_USER and ARMOR_STUDIO_PASSWORD");

  for (const language of LANGUAGES) for (const screen of SCREENS) {
    test(`${language} at ${screen.width}x${screen.height} take at most ${screen.most} lines`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width: screen.width, height: screen.height });
      await page.addInitScript(tag => { try { window.localStorage.setItem("armor-studio-settings-v1", JSON.stringify({ language: tag })); } catch { /* storage blocked */ } }, language);
      await signIn(page);
      const wrong: string[] = [];
      const buttons = menuEntries(page);
      const count = await buttons.count();
      for (let index = 0; index < count; index += 1) {
        const button = buttons.nth(index);
        const label = (await button.innerText()).trim();
        await button.evaluate(element => (element as HTMLElement).click());
        await page.waitForTimeout(500);
        for (const intro of await introductions(page)) if (intro.lines > screen.most) wrong.push(`${label}: ${intro.lines} lines: ${intro.text}`);
        if (index === count - 1) {
          const tabs = page.locator(".config-tabs [role=tab]");
          for (let tab = 0; tab < await tabs.count(); tab += 1) {
            await tabs.nth(tab).evaluate(element => (element as HTMLElement).click());
            await page.waitForTimeout(400);
            for (const intro of await introductions(page)) if (intro.lines > screen.most) wrong.push(`settings tab ${tab}: ${intro.lines} lines: ${intro.text}`);
          }
        }
      }
      expect(wrong).toEqual([]);
    });
  }
});
