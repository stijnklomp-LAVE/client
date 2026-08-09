import { test, expect } from "@playwright/test"
import { setupMockFsaa, loginAs } from "../helpers"

const EDITOR_URL = "/en/editor/e2e-test-project"

const getCenterPixel = (page: import("@playwright/test").Page) =>
	page.evaluate(() => {
		const canvas = document.querySelector("canvas")

		if (!canvas) return null

		const ctx = canvas.getContext("2d")

		if (!ctx) return null

		const cx = Math.floor(canvas.width / 2)
		const cy = Math.floor(canvas.height / 2)
		const data = ctx.getImageData(cx, cy, 1, 1).data

		return { a: data[3], b: data[2], g: data[1], r: data[0] }
	})

test.describe("Video playback", () => {
	test.beforeEach(async ({ page }) => {
		const errors: string[] = []
		page.on("console", (msg) => {
			if (msg.type() === "error") errors.push(msg.text())
		})
		page.on("pageerror", (err) => errors.push(err.message))

		await setupMockFsaa(page)
		await loginAs(page)

		// Inject error check into the test context
		;(page as unknown as { errors: string[] }).errors = errors
	})

	test("renders video frames on the canvas when playing", async ({
		page,
	}) => {
		const errors = (page as unknown as { errors: string[] }).errors

		await page.goto(EDITOR_URL, { waitUntil: "networkidle" })
		await expect(page).toHaveURL(/\/editor\//)
		await page.waitForTimeout(2000)

		const canvas = page.locator("canvas")
		const canvasCount = await canvas.count()

		if (canvasCount === 0) {
			const body = await page.evaluate(() => document.body.innerText)
			const allErrors = [
				...errors,
				...(await page.evaluate(() =>
					performance
						.getEntriesByType("resource")
						.filter((e) => e.name.includes("timeline"))
						.map(
							(e) =>
								`${e.name}: ${String((e as unknown as { responseStatus?: number }).responseStatus)}`,
						),
				)),
			]
			throw new Error(
				`No canvas found. Page body text:\n${body.slice(0, 2000)}\n\nErrors: ${allErrors.join("\n")}`,
			)
		}

		await expect(canvas.first()).toBeVisible({ timeout: 15000 })
		await page.waitForTimeout(1500)

		const pixelBefore = await getCenterPixel(page)
		expect(pixelBefore).not.toBeNull()

		const playButton = page
			.getByRole("button", { name: /play|start/i })
			.first()
		await playButton.click()
		await page.waitForTimeout(800)

		const pixelDuring = await getCenterPixel(page)
		expect(pixelDuring).not.toBeNull()
		expect(pixelBefore).not.toEqual(pixelDuring)
	})

	test("pause keeps the current frame visible", async ({ page }) => {
		const errors = (page as unknown as { errors: string[] }).errors

		await page.goto(EDITOR_URL, { waitUntil: "networkidle" })
		await expect(page).toHaveURL(/\/editor\//)
		await page.waitForTimeout(2000)

		if ((await page.locator("canvas").count()) === 0) {
			const body = await page.evaluate(() => document.body.innerText)
			throw new Error(
				`No canvas found. Page body text:\n${body.slice(0, 2000)}\n\nErrors: ${errors.join("\n")}`,
			)
		}

		await expect(page.locator("canvas").first()).toBeVisible({
			timeout: 15000,
		})
		await page.waitForTimeout(1500)

		const playButton = page
			.getByRole("button", { name: /play|start/i })
			.first()
		await playButton.click()
		await page.waitForTimeout(600)

		const pauseButton = page
			.getByRole("button", { name: /pause|stop/i })
			.first()
		await pauseButton.click()
		await page.waitForTimeout(300)

		const pixelPaused1 = await getCenterPixel(page)
		await page.waitForTimeout(500)
		const pixelPaused2 = await getCenterPixel(page)

		expect(pixelPaused1).toEqual(pixelPaused2)
	})

	test("canvas shows non-black pixels after loading", async ({ page }) => {
		const errors = (page as unknown as { errors: string[] }).errors

		await page.goto(EDITOR_URL, { waitUntil: "networkidle" })
		await expect(page).toHaveURL(/\/editor\//)
		await page.waitForTimeout(2000)

		if ((await page.locator("canvas").count()) === 0) {
			const body = await page.evaluate(() => document.body.innerText)
			throw new Error(
				`No canvas found. Page body text:\n${body.slice(0, 2000)}\n\nErrors: ${errors.join("\n")}`,
			)
		}

		await expect(page.locator("canvas").first()).toBeVisible({
			timeout: 15000,
		})
		await page.waitForTimeout(1500)

		const pixel = await getCenterPixel(page)
		expect(pixel).not.toBeNull()
		expect(pixel?.a).toBe(255)
	})
})
