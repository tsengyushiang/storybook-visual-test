import { test, expect } from "@playwright/test";
import stories from "../storybook-static/index.json" with { type: "json" };

const BASE_URL = "http://localhost:6006"

const storyEntries = Object.values(stories.entries).filter(
  ({ type }) => type === "story"
);

for (const { id, title, name } of storyEntries) {
  test(`Story: ${title} / ${name}`, async ({ page }) => {
    await page.goto(`${BASE_URL}/iframe.html?id=${id}&viewMode=story`);

    // Wait until Storybook has finished rendering the story
    await page.locator("#storybook-root, #root").first().waitFor({ state: "attached" });
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot({
      animations: "disabled",
      fullPage: true,
    });
  });
}