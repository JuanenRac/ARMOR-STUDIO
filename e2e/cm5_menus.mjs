import { chromium } from "playwright";
const out = process.argv[2];
const base = "http://192.168.0.180:18081";
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
page.on("pageerror", e => console.log("PAGEERR", e.message));
await page.goto(base + "/");
await page.getByLabel("Usuario").fill("admin");
await page.getByLabel("Contraseña").fill(process.env.PW);
await page.getByRole("button", { name: "Entrar a Studio" }).click();
await page.locator(".sidebar").waitFor({ timeout: 20000 });
const buttons = page.locator(".sidebar nav button");
const names = (await buttons.allInnerTexts()).map(n => n.replace(/\s+/g, " ").trim());
console.log(names.join(" | "));
for (const [word, file] of [["Network", "net"], ["Radar", "radar"], ["Cameras", "cams"], ["Electrical", "elec"]]) {
  const idx = names.findIndex(n => n.endsWith(word) && !n.includes("Designer"));
  if (idx < 0) { console.log("no menu", file); continue; }
  await buttons.nth(idx).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/cm5_${file}.png` });
  console.log(file, "link cards:", await page.locator(".designer-link").count(), "overflowX:", await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
}
await browser.close();
