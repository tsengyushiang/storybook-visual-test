import { test, expect } from "@playwright/test";
import { loadStories } from "./stories-setup";

loadStories().forEach(([title, visitPage]) => {
  test(title, async ({page})=>{
    await visitPage({page});
    await expect(page).toHaveScreenshot({
      animations: "disabled",
      fullPage: true,
    });
  });
});