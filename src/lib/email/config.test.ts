import { describe, expect, test } from "bun:test"

import { getEmailConfig } from "./config"

describe("getEmailConfig", () => {
	test("returns default values when no env vars are set", () => {
		const config = getEmailConfig()

		expect(config.host).toBe("mailpit")
		expect(config.port).toBe(1025)
		expect(config.secure).toBe(false)
		expect(config.user).toBe("")
		expect(config.pass).toBe("")
		expect(config.from).toBe("noreply@video-editor.local")
	})
})
