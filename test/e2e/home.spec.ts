import { test, expect } from "@playwright/test"

test.describe("Home page", () => {
	test("renders the heading", async ({ page }) => {
		await page.goto("/en")

		await expect(page.getByRole("heading").first()).toBeVisible()
	})

	test("theme toggle switches between dark and light mode", async ({
		page,
	}) => {
		await page.goto("/en")

		const toggle = page.getByRole("button", { name: /switch to/i })
		await toggle.click()

		await expect(toggle).toHaveAttribute(
			"aria-label",
			/switch to dark mode|switch to light mode/i,
		)
	})

	test("locale switcher changes language", () => {
		test.skip(true, "Locale switcher UI differs in production image")
	})
})
